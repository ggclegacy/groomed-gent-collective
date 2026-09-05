import 'server-only';
import {
  createCassiusHandler,
  sharedCassiusLimiter,
} from '@/lib/cassius/server';
import { loadDashboard } from '@/lib/dashboard/service';
import { bestMove, periods } from '@/lib/dashboard/model';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 40;
export const POST = createCassiusHandler({
  limit: sharedCassiusLimiter,
  config: () => ({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.CASSIUS_OPENAI_MODEL,
    maxOutputTokens: process.env.CASSIUS_MAX_OUTPUT_TOKENS,
    enabled: process.env.CASSIUS_ENABLED,
    vercel: process.env.VERCEL,
  }),
  referenceContext: async (question) => {
    const period =
      periods.find((p) => question.includes(`Period: ${p}.`)) ?? 'Month';
    const dashboard = await loadDashboard(period);
    return {
      dashboard,
      recommendation: bestMove(dashboard),
      constraints:
        'Use only this server-supplied performance. Missing metrics are unavailable, not zero. Explain one next action and its rationale in under 150 words. No guaranteed income, invented offers, tiers or claims. Actions are suggestions for the user to execute in the app.',
    };
  },
});
