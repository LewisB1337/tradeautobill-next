// app/create/_client.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

interface CreateFormProps {
  initialUsage: {
    daily: { used: number; limit: number };
    monthly: { used: number; limit: number };
  };
}

export default function CreateForm({ initialUsage }: CreateFormProps) {
  // ── Usage from server ───────────────────────────────────────────────────────
  const [daily] = useState(initialUsage.daily);
  const [monthly] = useState(initialUsage.monthly);

  // ── Tier fetch only ─────────────────────────────────────────────────────────
  const [tier, setTier] = useState('Free');
  useEffect(() => {
    fetch('/api/invoice', { credentials: 'include' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(inv => {
        if (inv.user?.tier) {
          setTier(String(inv.user.tier).replace(/^\w/, c => c.toUpperCase()));
        }
      })
      .catch(() => {});
  }, []);

  // ── Form state, items, totals, submit…───────────────────────────────────────
  // (Same as before: business/customer inputs, items array, totals calc, onSubmit handler)

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container py-10">
      {/* Header & Usage */}
      <header className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Create invoice</h1>
        <span className="pill">{tier}</span>
      </header>

      <section className="card" style={{ margin: '16px 0' }}>
        <h3>Usage</h3>
        <UsageMeter daily={daily} monthly={monthly} />
      </section>

      {/* …rest of your form markup, submit button, error display… */}
    </main>
  );
}
