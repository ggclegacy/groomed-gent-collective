import Link from 'next/link';
import { redirect } from 'next/navigation';
import { handleAccount } from '@/lib/account-runtime';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const response = await handleAccount(
    new Request('https://account.internal/api/account/intelligence'),
  );
  if (response.status === 401) redirect('/sign-in');
  if (!response.ok)
    return (
      <main className="ci-page">
        <section className="ci-auth">
          <h1>Your account needs a moment.</h1>
          <p role="alert">
            We couldn’t open your saved profile. Please try again.
          </p>
          <Link className="ci-primary" href="/auth/continue">
            Try again
          </Link>
          <Link href="/member-session">Account settings</Link>
        </section>
      </main>
    );
  const state = (await response.json()) as { completed: boolean };
  redirect(state.completed ? '/' : '/onboarding');
}
