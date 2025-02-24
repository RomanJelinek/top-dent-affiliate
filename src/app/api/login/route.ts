// app/api/login/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    const validEmail = 'info@top-dent.cz';
    const validPassword = 'topdent08';

    if (email === validEmail && password === validPassword) {
      const response = NextResponse.json({ success: true });

      response.cookies.set('auth', 'authenticated', {
        httpOnly: true,
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, 
      });
      return response;
    } else {
      return NextResponse.json(
        { success: false, error: 'Neplatné přihlašovací údaje' },
        { status: 401 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Chybný požadavek' },
      { status: 400 }
    );
  }
}
