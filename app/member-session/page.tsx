import Link from 'next/link';
import { UserProfile } from '@clerk/nextjs';
import { LogoutButton } from '@/components/account-session';
import { accountsConfigured } from '@/lib/auth-config';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (
    <main className="ci-page">
      <header className="ci-header">
        <Link className="ci-wordmark" href="/">
          GROOMED GENT <span>COLLECTIVE</span>
        </Link>
        <Link href="/my-cassius">My Cassius</Link>
      </header>
      <section className="ci-settings">
        <h1>Your account.</h1>
        {accountsConfigured() ? (
          <>
            <p>
              Manage your email, password, connected accounts and active
              sessions.
            </p>
            <LogoutButton />
            <UserProfile routing="hash" />
          </>
        ) : (
          <p>Account services are being connected.</p>
        )}
      </section>
    </main>
  );
}
