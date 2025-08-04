'use client'

import './globals.css'
import type { Metadata } from 'next'
import HashRedirect from './HashRedirect'
import EnvLogger from '../components/EnvLogger'
import type { ReactNode } from 'react'

import { useState } from 'react'
import { SessionContextProvider } from '@supabase/auth-helpers-react'
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

export const metadata: Metadata = {
  title: 'Tradeautobill',
  description: 'Create & email clean invoices fast.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // Create a browser Supabase client once
  const [supabaseClient] = useState(() => createBrowserSupabaseClient())

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={null}>
      <html lang="en">
        <body>
          <HashRedirect />
          <EnvLogger />

          <nav className="nav container" aria-label="Top">
            <div className="logo">
              <a href="/">Tradeautobill</a>
            </div>
            <div className="row">
              <a href="/pricing" className="btn">
                Pricing
              </a>
              <a href="/account" className="btn">
                Account
              </a>
            </div>
          </nav>

          {children}

          <footer>
            <div className="container">
              <p>
                © 2025 Tradeautobill. <a href="/privacy">Privacy</a> ·{' '}
                <a href="/terms">Terms</a> · <a href="/faq">FAQ</a>
              </p>
            </div>
          </footer>
        </body>
      </html>
    </SessionContextProvider>
  )
}
