// app/(auth)/LoginButton.tsx
'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function LoginButton() {
  const handleLogin = async () => {
    const supabase = createClientComponentClient()

    // Build an absolute redirect URL on the same origin
    const redirectTo = `${location.origin}/api/auth/callback`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', // or 'github' | 'apple' | ...
      options: {
        redirectTo,
        // Good defaults for Google if you want refresh tokens:
        scopes: 'email profile',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })

    if (error) console.error('OAuth start failed:', error)
  }

  return (
    <button onClick={handleLogin} className="btn">
      Continue with Google
    </button>
  )
}
