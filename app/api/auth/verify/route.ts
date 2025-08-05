import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ headers: req.headers })

  const { searchParams } = new URL(req.url)

  // pull everything you need from the query string
  const email      = searchParams.get('email')
  const tokenHash  = searchParams.get('token_hash')   // ← preferred
  const token      = searchParams.get('token')        // ← 6-digit OTP, if you use those

  if (!email || !(tokenHash || token)) {
    return NextResponse.json({ message: 'Missing parameters' }, { status: 400 })
  }

  /* ---------- verify ---------- */
  const { data, error } = await supabase.auth.verifyOtp(
    tokenHash
      ? { token_hash: tokenHash, type: 'email' }          // magic-link flow
      : { email, token: token!, type: 'email' },          // 6-digit OTP flow
  )

  if (error) return NextResponse.json({ message: error.message }, { status: 400 })

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
}
