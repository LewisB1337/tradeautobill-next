'use client';
export const dynamic = 'force-dynamic';


// app/faq/page.tsx

import { useRouter } from 'next/navigation';

export default function Page() {
  return (
    <section className="container py-10">
      <h1>Help & FAQ</h1>

      <p>Content goes here.</p>
    </section>
  );
}
