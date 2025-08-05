// app/api/auth/request-magic-link/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  const { email } = await request.json()
  if (!email || typeof email !== 'string')
    return NextResponse.json({ message: 'Missing email' }, { status: 400 })

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Make sure this matches your Confirm page path:
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/confirm`,
  },
})

  if (error)
    return NextResponse.json(
      { message: error.message },
      { status: error.status ?? 500 }
    )

  return NextResponse.json({ ok: true })
}
