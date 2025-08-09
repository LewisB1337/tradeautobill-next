import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
      return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
    }

    const supabase = createRouteHandlerClient({ cookies });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }

    // ✅ Logged in, go to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err: any) {
    console.error('Auth callback fatal:', err);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
