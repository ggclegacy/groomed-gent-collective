import Link from 'next/link';
import { ClerkProvider, SignIn } from '@clerk/nextjs';
export default function Page() {
  if (
    process.env.GGC_ACCOUNT_PROVIDER !== 'clerk-neon' ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return (
      <main className="member-page">
        <h1>Member sign-in is being connected.</h1>
        <p>
          Your private account becomes available once member services are
          configured.
        </p>
        <Link href="/membership">Return to membership</Link>
      </main>
    );
  return (
    <main className="member-page">
      <span className="eyebrow gold">PRIVATE ACCESS</span>
      <h1>Welcome to the Collective.</h1>
      <p>Sign in, then redeem your invitation to activate membership.</p>
      <ClerkProvider
        appearance={{
          variables: {
            colorPrimary: '#bfaa70',
            colorBackground: '#102319',
          },
        }}
      >
        <SignIn routing="path" path="/sign-in" forceRedirectUrl="/membership" />
      </ClerkProvider>
    </main>
  );
}
