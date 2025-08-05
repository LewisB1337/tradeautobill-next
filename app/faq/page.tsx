'use client';

export const dynamic = 'force-dynamic';

import React from 'react';

export default function FaqPage() {
  return (
    <section className="container py-10">
      <h1>FAQ</h1>
      <div className="card">
        <h2>How do I create an invoice?</h2>
        <p>Click “Create your first invoice” on the homepage, fill in details, and hit Send.</p>
      </div>
      <div className="card">
        <h2>What’s the free tier limit?</h2>
        <p>You can send up to 3 invoices a day, 10 a month on the free plan.</p>
      </div>
      {/* Add more FAQs here */}
    </section>
  );
}
