// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })

  // Extract the user’s email and the OTP or token hash
  const { searchParams } = new URL(req.url)
  const email     = searchParams.get('email')
  const tokenHash = searchParams.get('token_hash')
  const token     = searchParams.get('token')

  if (!email || !(tokenHash || token)) {
    return NextResponse.json({ message: 'Missing parameters' }, { status: 400 })
  }

  // Call Supabase to verify the OTP or magic-link
  const params = tokenHash
    ? { token_hash: tokenHash, type: 'email' }    // magic-link flow
    : { email, token: token,       type: 'email' } // 6-digit OTP flow

  const { data, error } = await supabase.auth.verifyOtp(params)

  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  // On success, redirect the user where you like
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
}
