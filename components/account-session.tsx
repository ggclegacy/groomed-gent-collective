'use client';
import { useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser();
  const identity = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const next = user?.id ?? null;
    if (identity.current !== undefined && identity.current !== next)
      window.location.replace(next ? '/auth/continue' : '/sign-in');
    identity.current = next;
  }, [isLoaded, user?.id]);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  return (
    <div key={isLoaded ? (user?.id ?? 'signed-out') : 'loading'}>
      {children}
    </div>
  );
}
export function LogoutButton() {
  const { signOut } = useClerk();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  return (
    <>
      <button
        className="ci-secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await signOut({ redirectUrl: '/sign-in' });
          } catch {
            setError(
              'Could not sign out. Check your connection and try again.',
            );
            setBusy(false);
          }
        }}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
