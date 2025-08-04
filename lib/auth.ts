import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/** Returns { user } or { user: null } based on the Supabase JWT in cookies */
export async function getUserFromRequest() {
  const jar = cookies()
  const token =
    jar.get('sb-access-token')?.value ??
    jar.get('sb:token')?.value ??                 // some setups
    jar.get('supabase-auth-token')?.value ??      // fallback
    null

  if (!token) return { user: null as const }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return { user: null as const }
  return { user: data.user }
}
