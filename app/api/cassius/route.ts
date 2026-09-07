import 'server-only';
import { handleAccount } from '@/lib/account-runtime';
import { personalContext, type Intelligence } from '@/lib/intelligence/model';
import { createCassiusHandler, sharedCassiusLimiter } from '@/lib/cassius/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 40;
export const POST = createCassiusHandler({ memberContext: async (request) => {
  // Resolve identity through the same verified account adapter; never accept client-provided memories.
  const response = await handleAccount(new Request(new URL('/api/account/intelligence', request.url), {headers:request.headers}));
  if (response.status===401 || response.status===503 && process.env.GGC_ACCOUNT_PROVIDER!=='clerk-neon') return undefined;
  if (!response.ok) throw new Error('Private context unavailable.');
  return personalContext(await response.json() as Intelligence);
}, limit: sharedCassiusLimiter, config: () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.CASSIUS_OPENAI_MODEL,
  maxOutputTokens: process.env.CASSIUS_MAX_OUTPUT_TOKENS,
  enabled: process.env.CASSIUS_ENABLED,
  vercel: process.env.VERCEL,
}) });
