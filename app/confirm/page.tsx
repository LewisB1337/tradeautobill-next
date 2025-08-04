// app/confirm/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function ConfirmPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = useSupabaseClient()
  const [status, setStatus] = useState<'working' | 'error'>('working')

  useEffect(() => {
    async function finishSignIn() {
      const { data, error } = await supabase.auth.exchangeCodeForSession()
      if (error) {
        console.error('[confirm] exchange error:', error)
        setStatus('error')
      } else {
        // ✅ cookies are now set, redirect
        router.replace('/create')
      }
    }
    finishSignIn()
  }, [supabase, router, params])

  if (status === 'error') {
    return <p style={{ color: 'red' }}>Sign-in failed. Try the link again.</p>
  }
  return <p>Signing you in…</p>
}
