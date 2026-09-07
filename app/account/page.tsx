import { AccountSettings } from '@/components/account-settings';
import { accountsConfigured } from '@/lib/auth-config';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account & Settings | The Collective' };
export default async function Page() {
  if (!accountsConfigured()) redirect('/sign-in');
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');
  return <AccountSettings />;
}
