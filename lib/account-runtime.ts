import { accountApi } from './account-service.ts';
export async function handleAccount(request: Request) {
  if (process.env.GGC_ACCOUNT_PROVIDER !== 'clerk-neon' || !process.env.DATABASE_URL || !process.env.CLERK_SECRET_KEY || !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return accountApi(request, undefined, {});
  try {
    const { handleVercelAccount } = await import('./account-runtime.vercel.ts');
    return await handleVercelAccount(request);
  } catch {
    return Response.json({ error: 'Private member services are temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
}
