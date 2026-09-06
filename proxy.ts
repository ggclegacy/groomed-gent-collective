import { clerkMiddleware } from '@clerk/nextjs/server';
import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server';
const clerk = clerkMiddleware();
export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (
    process.env.GGC_ACCOUNT_PROVIDER === 'clerk-neon' &&
    process.env.CLERK_SECRET_KEY &&
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  )
    return clerk(request, event);
  return NextResponse.next();
}
export const config = {
  matcher: [
    '/api/account/:path*',
    '/api/voyage/:path*',
    '/sign-in/:path*',
    '/member-session',
  ],
};
