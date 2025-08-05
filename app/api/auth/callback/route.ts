// app/auth/callback/page.tsx
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AuthCallback() {
  const router = useRouter()
  useEffect(() => {
    const run = async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
      if (error) console.error('exchange error', error)
      router.replace('/dashboard') // wherever you want to land
    }
    run()
  }, [router])
  return <p>Signing you in…</p>
}
