// lib/auth.ts
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function getUserFromRequest() {
  // Create a Supabase client bound to this request’s cookies
  const supabase = createRouteHandlerClient({ cookies })

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { user: null as null }
  }
  return { user }
}
