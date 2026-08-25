import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/constants';

/**
 * Gate the admin surface.
 *
 * This only checks that a session cookie is *present* — Edge middleware cannot
 * use node:crypto, so the signature is verified server-side in requireSession().
 * Middleware handles the redirect for a pleasant logged-out experience; the API
 * routes and pages do the actual security check.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (hasCookie) {
    // Someone already signed in has no reason to see the login form again.
    if (pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/admin/login') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/admin/')) {
    return NextResponse.json({ error: 'Your session has expired. Please sign in again.' }, { status: 401 });
  }

  const loginUrl = new URL('/admin/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    // The login and logout endpoints must stay reachable without a session.
    '/api/admin/((?!login|logout).*)',
  ],
};
