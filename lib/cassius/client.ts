import type { ConversationTurn, IntelligenceAnswer, IntegrationResult } from '../collective.ts';

export async function askCassius(question: string, fetcher: typeof fetch = fetch, history: ConversationTurn[] = []): Promise<IntegrationResult<IntelligenceAnswer>> {
  try {
    const response = await fetcher('/api/cassius', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history }), signal: AbortSignal.timeout(35000),
    });
    const raw: unknown = await response.json();
    if (!raw || typeof raw !== 'object') throw new Error('Invalid response');
    const data = raw as Record<string, unknown>;
    if (!response.ok) return { state: 'error', message: typeof data?.error === 'string' ? data.error : 'Cassius is temporarily unavailable. Please try again.' };
    if (typeof data?.text !== 'string' || !data.text.trim() || !Array.isArray(data.citations) || !data.citations.every((c: { title?: unknown; url?: unknown }) => c && typeof c.title === 'string' && typeof c.url === 'string') || !['openai', 'evidence-boundary'].includes(String(data.mode))) throw new Error('Invalid response');
    return { state: 'ready', data: { text: data.text, citations: data.citations }, source: data.mode === 'openai' ? 'OpenAI / Cassius' : 'GGC evidence boundary', updatedAt: new Date().toISOString() };
  } catch {
    return { state: 'error', message: 'Cassius could not respond. Check your connection and try again.' };
  }
}
