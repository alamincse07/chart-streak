import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Paths that must always be reachable, even for a user who hasn't
// completed their profile yet (otherwise they could never complete it,
// or would be locked out of signing in/out at all).
const ALWAYS_ALLOWED_PREFIXES = ['/complete-profile', '/api/auth', '/api/profile'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (ALWAYS_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Not signed in at all — let the page-level `getServerSession` redirects
  // handle sending them to sign-in; middleware only handles the
  // profile-completion gate here.
  if (!token) {
    return NextResponse.next();
  }

  if (!token.phone) {
    const url = req.nextUrl.clone();
    url.pathname = '/complete-profile';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/sheets/:path*',
    '/admin/:path*',
    '/api/sheets/:path*',
    '/api/admin/:path*',
  ],
};
