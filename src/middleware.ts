// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Povolíme přístup ke stránce s přihlášením
  if (request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Získání cookie "auth"
  const authCookie = request.cookies.get('auth')?.value;
  if (authCookie !== 'authenticated') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
