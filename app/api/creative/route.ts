import 'server-only';
import { createCreativeHandler, products } from '@/lib/creative/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
export function GET() {
  return Response.json(
    {
      products,
      connected:
        !!process.env.OPENAI_API_KEY &&
        process.env.CREATIVE_ENABLED !== 'false',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
export const POST = createCreativeHandler({
  config: () => ({
    key: process.env.OPENAI_API_KEY,
    model: process.env.CREATIVE_IMAGE_MODEL,
    textModel: process.env.CASSIUS_OPENAI_MODEL,
    enabled: process.env.CREATIVE_ENABLED,
    vercel: process.env.VERCEL,
    hourlyImages: process.env.CREATIVE_HOURLY_IMAGES,
  }),
});
