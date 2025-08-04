import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.getUser()
    if (error) {
      console.error('[whoami] getUser error:', error)
      return NextResponse.json({ user: null, error: error.message }, { status: 401 })
    }

    return NextResponse.json({ user: data.user }, { status: data.user ? 200 : 401 })
  } catch (e: any) {
    console.error('[whoami] fatal:', e)
    return NextResponse.json({ user: null, error: e?.message ?? 'unknown' }, { status: 500 })
  }
}
