// app/create/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSupabaseClient } from '@supabase/auth-helpers-react'

export default function ConfirmPage() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = useSupabaseClient()
  const [status, setStatus] = useState<'working' | 'error'>('working')

  // grab the "code" param from the URL
  const code = params.get('code')

  useEffect(() => {
    async function finishSignIn() {
      if (!code) {
        console.error('[confirm] no code in URL')
        setStatus('error')
        return
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('[confirm] exchange error:', error)
        setStatus('error')
      } else {
        // ✅ cookies are now set, redirect
        router.replace('/create')
      }
    }
    finishSignIn()
  }, [supabase, router, code])

  if (status === 'error') {
    return <p style={{ color: 'red' }}>Sign-in failed. Try the link again.</p>
  }
  return <p>Signing you in…</p>
}
