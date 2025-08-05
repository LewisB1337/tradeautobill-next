'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <section className="container py-10">
      <h1>404 — Page not found</h1>
      <p>Sorry, we can’t find the page you’re looking for.</p>
      <Link href="/" className="btn btn-primary">
        Back to home
      </Link>
    </section>
  );
}
