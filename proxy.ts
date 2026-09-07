import { clerkMiddleware } from '@clerk/nextjs/server';
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server';
import {
  accountsConfigured,
  localDemoEnabled,
  protectedPage,
  protectedApi,
} from './lib/auth-config';

const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
const clerk = clerkMiddleware(async (auth, request) => {
  if (protectedApi(request.nextUrl.pathname, request.method)) {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json(
        { error: 'Sign in to continue.' },
        {
          status: 401,
          headers: privateHeaders,
        },
      );
  } else if (protectedPage(request.nextUrl.pathname)) {
    await auth.protect({
      unauthenticatedUrl: new URL('/sign-in', request.url).toString(),
    });
  }
  return NextResponse.next({ headers: privateHeaders });
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (accountsConfigured()) return clerk(request, event);
  if (localDemoEnabled()) return NextResponse.next();
  if (protectedApi(request.nextUrl.pathname, request.method))
    return NextResponse.json(
      {
        error: 'Secure account services are unavailable.',
        code: 'account_configuration_required',
      },
      {
        status: 503,
        headers: privateHeaders,
      },
    );
  if (protectedPage(request.nextUrl.pathname))
    return NextResponse.redirect(new URL('/sign-in', request.url), {
      headers: privateHeaders,
    });
  return NextResponse.next({ headers: privateHeaders });
}

// Evaluate every application URL, including catch-all routes with extensions.
// Only Next's static files and image optimizer bypass the server gate.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image).*)',
    '/(api|trpc)(.*)',
    '/__clerk/:path*',
  ],
};
