'use client';
import { useClerk, useUser } from '@clerk/nextjs';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { protectedPage } from '@/lib/auth-config';
import { UserRound } from 'lucide-react';
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const { isLoaded, user } = useUser();
  const path = usePathname();
  const privatePage = protectedPage(path);
  const identity = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    const next = user?.id ?? null;
    if (
      (privatePage && !next) ||
      (identity.current !== undefined && identity.current !== next)
    )
      window.location.replace(next ? '/auth/continue' : '/sign-in');
    identity.current = next;
  }, [isLoaded, user?.id, privatePage]);
  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, []);
  useEffect(() => {
    if (!isLoaded || !user?.id) {
      delete document.documentElement.dataset.accountMotion;
      return;
    }
    let current = true;
    const apply = (settings: { reducedMotion?: boolean }) => {
      if (current)
        document.documentElement.dataset.accountMotion = settings.reducedMotion
          ? 'reduce'
          : 'system';
      if (current) window.dispatchEvent(new Event('ggc-account-motion'));
    };
    void fetch('/api/account/settings', { cache: 'no-store' })
      .then(async (r) => {
        if (r.ok)
          apply(
            ((await r.json()) as { settings: { reducedMotion: boolean } })
              .settings,
          );
      })
      .catch(() => {});
    const changed = (event: Event) => apply((event as CustomEvent).detail);
    window.addEventListener('ggc:settings', changed);
    return () => {
      current = false;
      delete document.documentElement.dataset.accountMotion;
      window.removeEventListener('ggc:settings', changed);
    };
  }, [isLoaded, user?.id]);
  if (privatePage && (!isLoaded || !user))
    return (
      <main className="ci-page">
        <output>Opening your secure session…</output>
      </main>
    );
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
        {busy ? 'Signing out…' : 'Log out'}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}

export function AccountShortcut() {
  const path = usePathname();
  const [voyage, setVoyage] = useState(false);
  useEffect(() => {
    const sync = () => setVoyage(window.location.hash === '#voyage');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  if (
    (path === '/' && !voyage) ||
    path.startsWith('/account') ||
    path.startsWith('/sign-')
  )
    return null;
  return (
    <Link className="account-shortcut" href="/account">
      <UserRound size={18} /> Account
    </Link>
  );
}
