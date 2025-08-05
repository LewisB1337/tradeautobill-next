// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(req: Request) {
  // 1) Instantiate Supabase client using the Next.js cookies helper
  const supabase = createRouteHandlerClient({ cookies })

  // 2) Parse out our query parameters
  const { searchParams } = new URL(req.url)
  const email     = searchParams.get('email')
  const tokenHash = searchParams.get('token_hash')
  const token     = searchParams.get('token')

  // 3) Validate presence of required params
  if (!email || (!tokenHash && !token)) {
    return NextResponse.json(
      { message: 'Missing parameters (email and token_hash or token)' },
      { status: 400 }
    )
  }

  // 4) Build the correct params object for verifyOtp()
  const params = tokenHash
    ? { token_hash: tokenHash, type: 'email' }       // Magic-link flow
    : { email, token: token!,      type: 'email' }   // 6-digit OTP flow

  // 5) Verify the OTP/email link with Supabase
  const { data, error } = await supabase.auth.verifyOtp(params)
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 400 })
  }

  // 6) On success, redirect wherever you like
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`)
}
