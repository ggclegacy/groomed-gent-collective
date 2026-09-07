import { accountsConfigured } from '@/lib/auth-config';
import Link from 'next/link';
import { SignIn, SignUp } from '@clerk/nextjs';
export function AccountEntry({ signup = false }: { signup?: boolean }) {
  const configured = accountsConfigured();
  return (
    <main className="ci-page">
      <header className="ci-header">
        <Link className="ci-wordmark" href="/">
          GROOMED GENT <span>COLLECTIVE</span>
        </Link>
        <Link href="/onboarding">Meet Cassius</Link>
      </header>
      <section className="ci-auth">
        <span className="ci-eyebrow">YOUR NEXT CHAPTER</span>
        <h1>
          {signup ? 'Welcome to the Collective.' : 'Good to have you back.'}
        </h1>
        <p>
          {signup
            ? 'One account. Your world, connected.'
            : 'Your space is ready when you are.'}
        </p>
        {configured ? (
          <>
            {signup ? (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/auth/continue"
              />
            ) : (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/auth/continue"
              />
            )}
          </>
        ) : (
          <div className="ci-panel">
            <p>
              Account services are being connected. Personal information can be
              saved once secure sign-in is available.
            </p>
            <Link href="/onboarding">Check account access</Link>
          </div>
        )}
        <small>
          You choose what Cassius remembers. Partner membership is managed
          separately.
        </small>
      </section>
    </main>
  );
}
