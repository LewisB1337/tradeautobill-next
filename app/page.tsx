'use client';
export const dynamic = 'error';



// app/create/page.tsx

import { useRouter } from 'next/navigation'
export default function Page(){
  return (
    <header className="hero">
      <div className="container grid-2">
        <div>
          <h1>Create & email clean invoices in minutes</h1>
          <p className="tagline">For tradespeople who don’t have time for admin.</p>
          <div className="cta-row">
            <a href="/create" className="btn btn-primary">Create your first invoice for free</a>
            <a href="/pricing" className="btn btn-secondary">See pricing</a>
          </div>
          <p className="tiny muted">No credit card. Free tier: 3 invoices/day.</p>
        </div>
        <div className="demo"><div className="frame">Demo invoice preview</div></div>
      </div>
    </header>
  );
}
