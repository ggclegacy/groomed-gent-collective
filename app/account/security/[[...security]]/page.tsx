import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';
import { AccountShell } from '@/components/account-settings';
import { LogoutButton } from '@/components/account-session';
import { accountsConfigured } from '@/lib/auth-config';
export const dynamic = 'force-dynamic';
export default function Page() {
  return (
    <AccountShell>
      <div className="account-title">
        <span className="account-eyebrow">YOUR PRIVATE MEMBERSHIP</span>
        <h1>
          Security <em>& Sign-in</em>
        </h1>
        <p>
          Your photo, full name, verified contact methods and trusted devices.
        </p>
        <Link className="account-link" href="/account">
          Back to Account & Settings
        </Link>
      </div>
      {accountsConfigured() ? (
        <>
          <div className="account-security">
            <UserProfile
              routing="path"
              path="/account/security"
              appearance={{
                elements: {
                  rootBox: { width: '100%' },
                  cardBox: { width: '100%', maxWidth: '100%' },
                  profileSection__danger: { display: 'none' },
                },
              }}
            />
          </div>
          <section className="account-panel">
            <h2>Close this session</h2>
            <LogoutButton />
          </section>
        </>
      ) : (
        <p>Secure sign-in services are being connected.</p>
      )}
    </AccountShell>
  );
}
