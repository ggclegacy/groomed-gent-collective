import 'server-only';
import { createCreativeHandler } from '@/lib/creative/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 45;
export const POST = createCreativeHandler({
  planOnly: true,
  timeoutMs: 35000,
  config: () => ({
    key: process.env.OPENAI_API_KEY,
    textModel: process.env.CASSIUS_OPENAI_MODEL,
    enabled: process.env.CREATIVE_ENABLED,
    vercel: process.env.VERCEL,
    hourlyImages: process.env.CREATIVE_HOURLY_IMAGES,
  }),
});
