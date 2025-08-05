'use client';
export const dynamic = 'force-dynamic';

// app/create/page.tsx

import { useRouter } from 'next/navigation'
export default function Page(){
  return (
    <section className="container py-10">
      <h1>Terms of Service</h1>
      <p className='muted'>Last updated: 2 August 2025</p>
      <p>Content goes here.</p>
    </section>
  );
}
