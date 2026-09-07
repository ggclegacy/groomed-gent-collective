import Collective from '@/components/collective';
import { redirect } from 'next/navigation';
import { accountsConfigured, localDemoEnabled } from '@/lib/auth-config';
import { handleAccount } from '@/lib/account-runtime';
export const dynamic = 'force-dynamic';
export default async function Home() {
  if (!localDemoEnabled()) {
    if (!accountsConfigured()) redirect('/sign-in');
    // Verify and persist the profile before rendering the workspace, even on
    // direct entry that never visited the sign-in callback.
    const response = await handleAccount(
      new Request('https://account.internal/api/account'),
    );
    if (!response.ok) redirect('/auth/continue');
    const account = await response.json();
    if (
      !account ||
      typeof account !== 'object' ||
      !('signedIn' in account) ||
      account.signedIn !== true
    )
      redirect('/sign-in');
  }
  return <Collective />;
}
