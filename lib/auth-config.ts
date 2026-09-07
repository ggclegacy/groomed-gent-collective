export function accountsConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.GGC_ACCOUNT_PROVIDER === 'clerk-neon' &&
    Boolean(
      env.CLERK_SECRET_KEY &&
      env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      env.DATABASE_URL,
    )
  );
}
export function protectedPage(path: string) {
  return [
    '/',
    '/membership',
    '/onboarding',
    '/my-cassius',
    '/member-session',
    '/account',
    '/voyage',
    '/members/studio',
    '/auth/continue',
  ].some(
    (route) =>
      path === route || (route !== '/' && path.startsWith(`${route}/`)),
  );
}
