'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabaseClient, useSession } from '@supabase/auth-helpers-react'

export default function LoginPage() {
  const supabase = useSupabaseClient()
  const session = useSession()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  // Redirect if already signed in
  useEffect(() => {
    if (session) {
      router.replace('/create')
    }
  }, [session, router])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const email = (new FormData(e.currentTarget).get('email') as string).trim()

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/confirm` },
    })

    // Now set the message and loading state
    setMessage(
      error ? `❌ ${error.message}` : '✅ Check your email for the magic link!'
    )
    setLoading(false)
  }

  return (
    <section className="container max-w-md py-16">
      <h1>Sign in with your email</h1>
      <p className="muted">No passwords. We’ll send a one-time link.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="email"
          type="email"
          required
          placeholder="you@business.co.uk"
          className="block w-full px-4 py-2 border rounded"
          disabled={loading}
        />
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      {message && <p className="tiny muted mt-4">{message}</p>}
    </section>
  )
}
