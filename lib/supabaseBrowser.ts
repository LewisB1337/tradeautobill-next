// lib/supabaseBrowser.ts
'use client'

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types_db'   // omit if you don’t have generated types

/** One singleton browser client */
export const supabaseBrowser =
  createBrowserSupabaseClient<Database>()    // or <any> if you don’t have types
