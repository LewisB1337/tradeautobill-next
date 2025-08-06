// app/auth/callback/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/dashboard' // where to go after login

  if (!code) {
    // optional: show an error page instead
    return NextResponse.redirect(new URL('/auth?error=missing_code', url.origin))
  }

  const supabase = createRouteHandlerClient({ cookies })
  // This handles the PKCE exchange server-side and sets auth cookies
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // surface the error so you can see it
    return NextResponse.redirect(new URL('/auth?error=' + encodeURIComponent(error.message), url.origin))
  }

  return NextResponse.redirect(new URL(next, url.origin))
}
