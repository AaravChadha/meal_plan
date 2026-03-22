import { NextRequest, NextResponse } from 'next/server';

// Must match SESSION_COOKIE in src/lib/auth.ts — keep in sync
const SESSION_COOKIE = 'nt_session';

const PUBLIC_PATHS = ['/login', '/register'];
const PUBLIC_API_PATHS = ['/api/auth/login', '/api/auth/register'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public pages and auth API routes
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check for session cookie — full validation happens inside each API route
  const session = request.cookies.get(SESSION_COOKIE);
  if (!session) {
    // For API routes, return 401 instead of redirecting
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
