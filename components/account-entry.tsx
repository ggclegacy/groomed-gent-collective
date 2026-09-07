import Link from 'next/link';
import { ClerkProvider, SignIn, SignUp } from '@clerk/nextjs';
export function AccountEntry({ signup = false }: { signup?: boolean }) {
  const configured =
    process.env.GGC_ACCOUNT_PROVIDER === 'clerk-neon' &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    process.env.CLERK_SECRET_KEY;
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
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            appearance={{
              variables: {
                colorPrimary: '#c8a65c',
                colorBackground: '#0b1512',
                colorForeground: '#eee9df',
                colorMutedForeground: '#b6beb7',
                colorInput: '#090f0d',
                colorInputForeground: '#eee9df',
                borderRadius: '14px',
              },
            }}
          >
            {signup ? (
              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                forceRedirectUrl="/onboarding"
              />
            ) : (
              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
                forceRedirectUrl="/onboarding"
              />
            )}
          </ClerkProvider>
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
