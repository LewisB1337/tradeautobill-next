// lib/supabaseClient.ts
'use client'

import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs'

// This automatically picks up NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY from your environment.
export const supabase = createPagesBrowserClient()
