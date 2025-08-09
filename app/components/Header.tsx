// app/components/Header.tsx
import Link from 'next/link'
import { cookies } from 'next/headers'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

export default async function Header() {
  const supabase = createServerComponentClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()
  const loggedIn = !!session

  return (
    <nav className="nav container py-4" aria-label="Main navigation">
      <div className="logo">
        <Link href="/" className="btn btn-logo">Tradeautobill</Link>
      </div>
      <div className="row" style={{ gap: '0.5rem' }}>
        <Link href="/" className="btn">Home</Link>
        <Link href="/pricing" className="btn">Pricing</Link>

        {loggedIn && <Link href="/create" className="btn">Create Invoice</Link>}
        {loggedIn && <Link href="/dashboard" className="btn">Dashboard</Link>}
        {loggedIn && <Link href="/account" className="btn">Account</Link>}

        {!loggedIn ? (
          <Link href="/login" className="btn">Login</Link>
        ) : (
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn">Logout</button>
          </form>
        )}
      </div>
    </nav>
  )
}
