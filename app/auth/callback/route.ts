import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // Called from client after supabase.auth.setSession()
  try {
    const supabase = createRouteHandlerClient({ cookies })
    // getSession() forces the helper to read client session and set cookies
    await supabase.auth.getSession()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? 'server' }, { status: 500 })
  }
}

// Optional: keep GET handler for OAuth providers that return ?code=
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 })
  }
  // If someone hits GET without a code, send them to login
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
