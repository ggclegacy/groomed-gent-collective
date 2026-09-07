import { clerkMiddleware } from '@clerk/nextjs/server';
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server';
import { accountsConfigured, protectedPage } from './lib/auth-config';
const clerk = clerkMiddleware(async (auth, request) => {
  if (protectedPage(request.nextUrl.pathname))
    await auth.protect({
      unauthenticatedUrl: new URL('/sign-in', request.url).toString(),
    });
  const response = NextResponse.next();
  if (
    protectedPage(request.nextUrl.pathname) ||
    request.nextUrl.pathname.startsWith('/api/account')
  )
    response.headers.set('Cache-Control', 'private, no-store');
  return response;
});
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (accountsConfigured()) return clerk(request, event);
  if (
    process.env.GGC_ACCOUNT_PROVIDER === 'clerk-neon' &&
    protectedPage(request.nextUrl.pathname)
  )
    return NextResponse.redirect(new URL('/sign-in', request.url));
  return NextResponse.next();
}
// ClerkProvider wraps all pages: the SDK must receive middleware context on
// public pages as well as protected pages. Static assets remain cacheable.
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
