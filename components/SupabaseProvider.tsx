'use client'

import { ReactNode } from 'react'
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'
import { SessionContextProvider } from '@supabase/auth-helpers-react'

export default function SupabaseProvider({ children }: { children: ReactNode }) {
  const supabase = createPagesBrowserClient()
  return (
    <SessionContextProvider supabaseClient={supabase} initialSession={null}>
      {children}
    </SessionContextProvider>
  )
}
