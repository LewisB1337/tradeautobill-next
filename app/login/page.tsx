'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')
  const [err, setErr] = useState<string|null>(null)
  const router = useRouter()

  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), [])

  // 1) If URL hash contains tokens (magic link), set session then bounce
  useEffect(() => {
    (async () => {
      const hash = window.location.hash // e.g. #access_token=...&refresh_token=...
      if (!hash) return
      const params = new URLSearchParams(hash.slice(1))
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
      if (!access_token || !refresh_token) return

      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      if (error) {
        setErr(error.message)
        return
      }

      // 2) Tell the server to set auth cookies for route handlers & RSC
      await fetch('/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'SIGNED_IN' }),
        credentials: 'include',
      })

      router.replace('/dashboard')
    })()
  }, [supabase, router])

  // Magic-link sender
  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending'); setErr(null)
    try {
      const redirect = `${process.env.NEXT_PUBLIC_SITE_URL ?? location.origin}/login`
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect },
      })
      if (error) throw error
      setStatus('sent')
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to send link')
      setStatus('error')
    }
  }

  return (
    <main className="container py-10 max-w-md">
      <h1>Sign in</h1>
      <form onSubmit={sendMagicLink} className="card" style={{ marginTop: 12 }}>
        <input type="email" required placeholder="you@company.com"
               value={email} onChange={(e)=>setEmail(e.target.value)} />
        <button className="btn" disabled={status==='sending' || !email}>
          {status==='sending' ? 'Sending…' : 'Send magic link'}
        </button>
        {status==='sent' && <div style={{color:'green'}}>Check your email.</div>}
        {err && <div style={{color:'crimson'}}>Error: {err}</div>}
      </form>
    </main>
  )
}
