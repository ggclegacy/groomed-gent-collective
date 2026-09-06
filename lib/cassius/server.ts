// Imported only by the server-only route. Dependencies are explicit so tests never need credentials.
import { routeHealthQuestion } from './health.ts';
import { createHash } from 'node:crypto';
import { conversationContext, conversationInstructions, type ConversationTurn } from './conversation.ts';

export interface CassiusConfig { apiKey?: string; model?: string; maxOutputTokens?: string; enabled?: string; vercel?: string }
class CassiusError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const unavailable = 'Cassius is temporarily unavailable. Please try again shortly.';
const busy = 'Cassius has reached its request limit. Please wait a minute and try again.';
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: {
  'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
  ...(status === 429 ? { 'Retry-After': '60' } : {}),
} });

/** Process-local limits: deliberately shared fallback off Vercel; never trust client identity headers. */
export function createLimiter(now: () => number = Date.now) {
  const buckets = new Map<string, { minute: number; hourly: number; minuteAt: number; hourAt: number }>();
  let active = 0;
  let hourAt = now();
  let total = 0;
  return (identity: string) => {
    const time = now();
    if (time - hourAt >= 3600000) { total = 0; hourAt = time; }
    for (const [key, value] of buckets) if (time - value.hourAt >= 3600000) buckets.delete(key);
    const entry = buckets.get(identity) ?? { minute: 0, hourly: 0, minuteAt: time, hourAt: time };
    if (time - entry.minuteAt >= 60000) { entry.minute = 0; entry.minuteAt = time; }
    if (active >= 4 || total >= 500 || entry.minute >= 10 || entry.hourly >= 100 || (!buckets.has(identity) && buckets.size >= 2000))
      throw new CassiusError(429, busy);
    entry.minute++; entry.hourly++; total++; active++;
    buckets.set(identity, entry);
    let released = false;
    return () => { if (!released) { active--; released = true; } };
  };
}

export const sharedCassiusLimiter = createLimiter();

async function readQuestion(request: Request): Promise<{ question: string; history: ConversationTurn[] }> {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site')
    throw new CassiusError(403, 'Start your question from the Collective.');
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
    throw new CassiusError(415, 'Send a JSON question.');
  const reader = request.body?.getReader();
  if (!reader) throw new CassiusError(400, 'Enter a question.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  const timeout = setTimeout(() => { void reader.cancel().catch(() => {}); }, 5000);
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 45000) { await reader.cancel(); throw new CassiusError(413, 'Your question is too large.'); }
      chunks.push(value);
    }
  } finally { clearTimeout(timeout); reader.releaseLock(); }
  let data: unknown;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new CassiusError(400, 'The question could not be read.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).some(key => key !== 'question' && key !== 'history') || !('question' in data) || typeof data.question !== 'string' || !data.question.trim() || data.question.length > 10000)
    throw new CassiusError(400, 'Enter a question of 1–10,000 characters.');
  const history = 'history' in data ? data.history : [];
  if (!Array.isArray(history) || history.length > 12 || history.some(t => !t || typeof t !== 'object' || Array.isArray(t) || Object.keys(t).some(k => k !== 'role' && k !== 'content') || !['user', 'assistant'].includes(t.role) || typeof t.content !== 'string' || !t.content.trim() || t.content.length > 10000) || history.reduce((n, t) => n + t.content.length, 0) > 24000)
    throw new CassiusError(400, 'Conversation history is invalid or too large. Start a new conversation.');
  return { question: data.question.trim(), history };
}


export function createCassiusHandler(options: {
  config: () => CassiusConfig;
  fetcher?: typeof fetch;
  limit?: ReturnType<typeof createLimiter>;
  timeoutMs?: number;
  referenceContext?: (question: string) => Promise<unknown>;
}) {
  const limit = options.limit ?? createLimiter();
  const fetcher = options.fetcher ?? fetch;
  return async (request: Request): Promise<Response> => {
    let release: (() => void) | undefined;
    try {
      if (request.method !== 'POST') return json({ error: 'Use POST to ask Cassius.' }, 405);
      const config = options.config();
      if (config.enabled === 'false' || !config.apiKey?.trim()) throw new CassiusError(503, 'Cassius is not connected yet. Please try again later.');
      const model = config.model?.trim() || 'gpt-4.1-mini';
      const maxTokens = Number(config.maxOutputTokens ?? '1200');
      if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(model) || !Number.isInteger(maxTokens) || maxTokens < 256 || maxTokens > 4096)
        throw new CassiusError(503, unavailable);
      const identity = config.vercel === '1' ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || 'shared' : 'shared';
      release = limit(createHash('sha256').update(identity).digest('hex'));
      const { question, history } = await readQuestion(request);
      const emergency = routeHealthQuestion(question, 'conversation');
      if (emergency?.priority === 'urgent') return json({ text: emergency.answer.text, citations: [], mode: 'evidence-boundary' });
      const context = conversationContext(question, history);
      const additionalContext = options.referenceContext ? await options.referenceContext(question) : undefined;
      const controller = new AbortController();
      const abort = () => controller.abort();
      const timer = setTimeout(abort, options.timeoutMs ?? 25000);
      request.signal.addEventListener('abort', abort, { once: true });
      if (request.signal.aborted) abort();
      let response: Response;
      let payload: unknown;
      try {
        response = await fetcher('https://api.openai.com/v1/responses', {
          method: 'POST', signal: controller.signal, cache: 'no-store',
          headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, instructions: conversationInstructions, input: [...history, { role: 'user', content: JSON.stringify(additionalContext ? { ...context, dashboard: additionalContext } : context) }], max_output_tokens: maxTokens, store: false }),
        });
        if (!response.ok) throw new CassiusError(response.status === 429 ? 429 : 502, response.status === 429 ? busy : unavailable);
        payload = await response.json();
      } catch (error) {
        if (controller.signal.aborted) throw new CassiusError(504, 'Cassius took too long to respond. Please try again.');
        throw error;
      } finally { clearTimeout(timer); request.signal.removeEventListener('abort', abort); }
      if (!payload || typeof payload !== 'object' || !('status' in payload) || payload.status !== 'completed' || !('output' in payload) || !Array.isArray(payload.output))
        throw new CassiusError(502, unavailable);
      const parts: string[] = [];
      for (const item of payload.output) {
        if (item?.type !== 'message' || item.role !== 'assistant' || !Array.isArray(item.content)) continue;
        for (const part of item.content) {
          if (part?.type === 'refusal') throw new CassiusError(422, 'Cassius cannot help with that request. Try a different question or a safer alternative.');
          if (part?.type === 'output_text' && typeof part.text === 'string') parts.push(part.text);
        }
      }
      const text = parts.join('\n').trim();
      if (!text || text.length > 30000) throw new CassiusError(502, unavailable);
      // Show only provenance actually referenced by the response, not every retrieval candidate.
      const citations = (context.knowledge?.passages ?? []).flatMap(p => p.citations).filter(c => text.includes(c.factId));
      return json({ text, citations, mode: 'openai', conversationMode: context.mode, corpusVersion: context.knowledge?.version });
    } catch (error) {
      // Never log prompts, authorization headers, provider response bodies, or raw exceptions.
      return json({ error: error instanceof CassiusError ? error.message : unavailable }, error instanceof CassiusError ? error.status : 503);
    } finally { release?.(); }
  };
}
