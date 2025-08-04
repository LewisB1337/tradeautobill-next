// lib/auth.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function getUserFromRequest() {
  // Create a Supabase client bound to the incoming request’s cookies
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { user: null as null }
  return { user }
}
