import 'server-only';
import { createCassiusHandler, sharedCassiusLimiter } from '@/lib/cassius/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 40;
export const POST = createCassiusHandler({ limit: sharedCassiusLimiter, config: () => ({
  apiKey: process.env.OPENAI_API_KEY,
  model: process.env.CASSIUS_OPENAI_MODEL,
  maxOutputTokens: process.env.CASSIUS_MAX_OUTPUT_TOKENS,
  enabled: process.env.CASSIUS_ENABLED,
  vercel: process.env.VERCEL,
}) });
