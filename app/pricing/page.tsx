'use client';
export const dynamic = 'force-dynamic';

export default function PricingPage() {
  return (
    <section className="container py-10">
      <h1>Pricing</h1>
      <div className="card">
        <h2>Free</h2>
        <p>3 invoices/day, 10/month</p>
      </div>
      <div className="card">
        <h2>Pro</h2>
        <p>500 invoices/month — £25/month</p>
      </div>
    </section>
  );
}
