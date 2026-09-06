import 'server-only';
import { handleAccount } from '@/lib/account-runtime';
import { createVoyageHandler, VoyageError } from '@/lib/voyage/server';
import type { AccountAccess } from '@/lib/account';
import { parseMemory } from '@/lib/gentleman/model';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 40;
export const POST = createVoyageHandler({
  config: () => ({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.CASSIUS_OPENAI_MODEL,
    enabled: process.env.CASSIUS_ENABLED,
  }),
  authorize: async (request) => {
    const read = async (path: string) =>
      handleAccount(
        new Request(new URL(path, request.url), { headers: request.headers }),
      );
    const account = await read('/api/account');
    const state = (await account.json()) as AccountAccess;
    if (!state.configured)
      throw new VoyageError(
        503,
        'Private member services must be connected before AI trip planning.',
      );
    if (!state.signedIn) throw new VoyageError(401, 'Sign in to plan a trip.');
    if (state.member?.status !== 'active')
      throw new VoyageError(403, 'An active membership is required.');
    const response = await read('/api/account/memory');
    if (!response.ok)
      throw new VoyageError(
        response.status,
        'Private trip memory is unavailable.',
      );
    const data = (await response.json()) as {
      revision: number;
      memory: unknown;
    };
    return {
      memberId: state.member.user_id,
      revision: data.revision,
      memory: parseMemory(data.memory),
    };
  },
});
