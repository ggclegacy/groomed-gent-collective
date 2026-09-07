import { AccountSettings, AccountShell } from '@/components/account-settings';
import { accountsConfigured } from '@/lib/auth-config';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Account & Settings | The Collective' };
export default function Page() {
  if (!accountsConfigured())
    return (
      <AccountShell>
        <div className="account-title">
          <span className="account-eyebrow">THE COLLECTIVE</span>
          <h1>
            Account <em>& Settings</em>
          </h1>
        </div>
        <section className="account-panel">
          <h2>Your private membership awaits.</h2>
          <p>
            Secure account services are being connected. Your profile and
            preferences will be available here once sign-in is ready.
          </p>
          <Link className="account-link" href="/sign-in">
            Go to sign in
          </Link>
          <a
            className="account-link"
            href="https://groomedgentco.com/pages/contact"
          >
            Contact the Collective
          </a>
        </section>
      </AccountShell>
    );
  return <AccountSettings />;
}
