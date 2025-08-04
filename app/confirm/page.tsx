'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabaseBrowser'

export default function ConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    async function run() {
      const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : ''
      const query = typeof window !== 'undefined' ? window.location.search : ''
      console.log('[confirm] hash=', hash, 'query=', query)

      // 1) PKCE code flow
      const sp = new URLSearchParams(query)
      const code = sp.get('code')
      if (code) {
        console.log('[confirm] exchanging code for session')
        const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code)
        if (!error) {
          console.log('[confirm] code exchange ok, redirecting')
          return router.replace('/create')
        }
        console.error('[confirm] exchange error:', error)
        return router.replace('/login?error=' + encodeURIComponent(error.message))
      }

      // 2) Fallback: implicit/hash
      const h = new URLSearchParams(hash)
      const access_token = h.get('access_token')
      const refresh_token = h.get('refresh_token')
      if (access_token && refresh_token) {
        console.log('[confirm] setting session from hash')
        const { error } = await supabaseBrowser.auth.setSession({ access_token, refresh_token })
        if (!error) return router.replace('/create')
        return router.replace('/login?error=' + encodeURIComponent(error.message))
      }

      const err = h.get('error_description') || h.get('error')
      if (err) {
        console.error('[confirm] supabase error in hash:', err)
        return router.replace('/login?error=' + encodeURIComponent(err))
      }

      router.replace('/login?error=invalid_or_expired')
    }
    run()
  }, [router])

  return (
    <section className="container py-10">
      <h1>Signing you in…</h1>
      <p>Completing authentication…</p>
    </section>
  )
}
