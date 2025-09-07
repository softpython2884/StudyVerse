import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

const protectedPaths = ['/dashboard'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));

  if (isProtected) {
    const session = await getSession();
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
