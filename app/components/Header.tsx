// app/components/Header.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const path = usePathname();

  const isActive = (href: string) => path === href;

  const linkClass = (href: string) =>
    `btn${isActive(href) ? ' btn-active' : ''}`;

  return (
    <nav className="nav container py-4" aria-label="Main navigation">
      <div className="logo">
        <Link href="/" className="btn btn-logo">
          Tradeautobill
        </Link>
      </div>
      <div className="row" style={{ gap: '0.5rem' }}>
        <Link href="/pricing" className={linkClass('/pricing')}>
          Pricing
        </Link>
        <Link href="/create" className={linkClass('/create')}>
          Create Invoice
        </Link>
        <Link href="/dashboard" className={linkClass('/dashboard')}>
          Dashboard
        </Link>
        <Link href="/account" className={linkClass('/account')}>
          Account
        </Link>
      </div>
    </nav>
  );
}
