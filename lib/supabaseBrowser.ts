'use client'
import { createBrowserClient } from '@supabase/ssr'

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',           // PKCE to match ?code= links
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,  // we handle ?code= manually on /confirm
    },
  }
)
