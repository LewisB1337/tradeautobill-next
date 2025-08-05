export const dynamic = 'force-dynamic';
// app/pricing/page.tsx
import { Suspense } from 'react';
import type { Metadata } from 'next';
import PricingClient from './_client';      // relative import

export const metadata: Metadata = {
  title: 'Pricing · TradeAutoBill',
};

export default function PricingPage() {
  return (
    <section className="container py-16">
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Pricing</h1>

      {/* Anything that never needs the browser can stay right here … */}

      <Suspense fallback={<div style={{ height: 300 }} />}>
        <PricingClient />                   {/* browser-only logic lives here */}
      </Suspense>
    </section>
  );
}
