// middleware.ts (optional)
import { NextResponse } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
export async function middleware(req: any) {
  const res = NextResponse.next()
  await createMiddlewareClient({ req, res }).auth.getSession()
  return res
}
export const config = { matcher: ['/dashboard', '/account'] }
