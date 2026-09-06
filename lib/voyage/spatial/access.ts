import 'server-only';
import { handleAccount } from '@/lib/account-runtime';
import type { AccountAccess } from '@/lib/account';
import { DiscoveryError } from './discovery';
export async function authorizeDiscovery(request: Request) {
  const response = await handleAccount(
    new Request(new URL('/api/account', request.url), {
      headers: request.headers,
    }),
  );
  if (!response.ok)
    throw new DiscoveryError(503, 'Member services are unavailable.');
  const account = (await response.json()) as AccountAccess;
  if (!account.configured)
    throw new DiscoveryError(
      503,
      'Connect member services for live discovery.',
    );
  if (!account.signedIn)
    throw new DiscoveryError(401, 'Sign in for live discovery.');
  if (account.member?.status !== 'active')
    throw new DiscoveryError(
      403,
      'An active membership is required for live discovery.',
    );
  return account.member.user_id;
}
