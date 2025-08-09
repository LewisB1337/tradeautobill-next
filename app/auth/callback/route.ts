import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { access_token, refresh_token } = await req.json().catch(() => ({} as any))
  if (!access_token || !refresh_token) {
    // fallback: refresh existing cookies if any
    await supabase.auth.getSession()
    return NextResponse.json({ ok: true })
  }
  const { error } = await supabase.auth.setSession({ access_token, refresh_token })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

// keep GET handler for OAuth ?code=... flows (optional)
export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
    return NextResponse.redirect(new URL('/dashboard', request.url), { status: 303 })
  }
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 })
}
