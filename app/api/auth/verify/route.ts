// app/api/auth/verify/route.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  const { token } = await request.json()
  if (!token || typeof token !== 'string')
    return NextResponse.json({ message: 'Missing token' }, { status: 400 })

  const { data, error } = await supabase.auth.verifyOtp({
    token,
    type: 'magiclink',
  })

  if (error)
    return NextResponse.json(
      { message: error.message },
      { status: error.status ?? 500 }
    )

  return NextResponse.json({ user: data.user })
}
