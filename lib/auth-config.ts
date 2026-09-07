export function accountsConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.GGC_ACCOUNT_PROVIDER === 'clerk-neon' &&
    Boolean(
      env.CLERK_SECRET_KEY?.trim() &&
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
      env.DATABASE_URL?.trim(),
    )
  );
}

// An empty or misspelled provider must never turn a deployment into a demo.
// The optional visual demo is restricted to an explicitly opted-in local dev server.
export function localDemoEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.NODE_ENV === 'development' &&
    !env.VERCEL &&
    env.GGC_DEMO_MODE === 'true' &&
    !env.GGC_ACCOUNT_PROVIDER
  );
}

export function protectedApi(path: string, method: string) {
  return (
    (path === '/api' || path.startsWith('/api/')) &&
    !(path.replace(/\/$/, '') === '/api/account' && method === 'GET')
  );
}

export function protectedPage(path: string) {
  if (path === '/api' || path.startsWith('/api/')) return false;
  // Only authentication pages and actual static assets are public. New app
  // pages are protected automatically, including direct URLs and RSC requests.
  return (
    !['/sign-in', '/sign-up'].some(
      (route) => path === route || path.startsWith(`${route}/`),
    ) &&
    ![
      '/manifest.webmanifest',
      '/favicon.ico',
      '/favicon.svg',
      '/robots.txt',
      '/sitemap.xml',
    ].includes(path) &&
    !path.startsWith('/icons/') &&
    !path.startsWith('/_next/')
  );
}
