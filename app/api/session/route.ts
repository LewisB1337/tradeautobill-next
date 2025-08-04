// app/api/session/route.ts
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types_db'   // remove if you don’t have generated types

// GET  ― return the current user (or 401)
export async function GET() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  return NextResponse.json({ user })
}

// POST  ― sign out (optional helper)
export async function POST() {
  const supabase = createRouteHandlerClient<Database>({ cookies })
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
