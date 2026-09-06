import Link from 'next/link';
import { ClerkProvider, UserButton } from '@clerk/nextjs';
export default function Page() {
  if (
    process.env.GGC_ACCOUNT_PROVIDER !== 'clerk-neon' ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    !process.env.CLERK_SECRET_KEY
  )
    return (
      <main className="member-page">
        <Link href="/membership">Return to membership</Link>
      </main>
    );
  return (
    <main className="member-page">
      <h1>Your member session.</h1>
      <p>
        Use your account menu to sign out. Unsaved working memory is cleared
        when you leave the app.
      </p>
      <ClerkProvider afterSignOutUrl="/membership">
        <UserButton />
      </ClerkProvider>
      <Link href="/membership">Return to membership</Link>
    </main>
  );
}
