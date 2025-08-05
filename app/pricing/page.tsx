// app/pricing/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import PricingClient from './_client';

export default function PricingPage() {
  return (
    <section className="container py-10">
      <h1 style={{ marginTop: 0 }}>Simple pricing</h1>
      <PricingClient />
    </section>
  );
}
