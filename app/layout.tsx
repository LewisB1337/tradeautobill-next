import './globals.css'
import type { Metadata } from 'next'
import HashRedirect from './HashRedirect'
import EnvLogger from '../components/EnvLogger'
import type { ReactNode } from 'react'
import SupabaseProvider from '../components/SupabaseProvider'

export const metadata: Metadata = {
  title: 'Tradeautobill',
  description: 'Create & email clean invoices fast.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <HashRedirect />
          <EnvLogger />

          <nav className="nav container" aria-label="Top">
            <div className="logo"><a href="/">Tradeautobill</a></div>
            <div className="row">
              <a href="/pricing" className="btn">Pricing</a>
              <a href="/account" className="btn">Account</a>
            </div>
          </nav>

          {children}

          <footer>
            <div className="container">
              <p>© 2025 Tradeautobill. <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/faq">FAQ</a></p>
            </div>
          </footer>
        </SupabaseProvider>
      </body>
    </html>
  )
}
