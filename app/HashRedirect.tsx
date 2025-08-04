'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

export default function HashRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (pathname === '/confirm') return

    // Forward PKCE (?code=…) → /confirm
    const code = search.get('code')
    if (code) {
      router.replace(`/confirm?code=${encodeURIComponent(code)}`)
      return
    }

    // Forward implicit (#access_token / #refresh_token) → /confirm
    const hash = window.location.hash
    if (hash && /access_token=|refresh_token=/.test(hash)) {
      router.replace('/confirm' + hash)
    }
  }, [pathname, router, search])

  return null
}
