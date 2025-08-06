// app/create/_client.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = { id: string; description: string; quantity: number; unitPrice: number };

export default function CreateForm() {
  // Real usage state
  const [daily, setDaily]     = useState({ used: 0, limit: 0 });
  const [monthly, setMonthly] = useState({ used: 0, limit: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  // Invoice form state
  const [business, setBusiness] = useState({ name: '', email: '', address: '', vatNumber: '' });
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });
  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [vatRate, setVatRate] = useState(20);

  // Fetch real usage on mount
  useEffect(() => {
    fetch('/api/usage', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Not authorized');
        const data = await res.json();
        setDaily({ used: data.daily_count,   limit: data.daily_limit });
        setMonthly({ used: data.monthly_count, limit: data.monthly_limit });
      })
      .catch((err) => {
        console.error('Usage fetch failed', err);
      });
  }, []);

  // Money + totals
  const currency = 'GBP';
  const nf = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency }),
    [currency]
  );
  const subTotal = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items]
  );
  const vatAmount  = useMemo(() => subTotal * (vatRate / 100), [subTotal, vatRate]);
  const grandTotal = useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  // Item helpers
  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  }
  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  // Submit handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = { business, customer, items, vatRate, totals: { subTotal, vatAmount, grandTotal, currency } };

    try {
      const res = await fetch('/api/invoice', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        window.location.href = `/login?from=/create`;
        return;
      }
      if (res.status === 429) {
        const { error } = await res.json().catch(() => ({}));
        setErrorMsg(error || 'Quota reached.');
        return;
      }
      if (!res.ok) {
        const { error, detail } = await res.json().catch(() => ({}));
        setErrorMsg(error || detail || 'Something went wrong');
        return;
      }

      alert('Invoice sent! Check your email.');
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-10">
      <h1>Create invoice</h1>

      {/* Real usage */}
      <section className="card mb-4">
        <h3>Usage</h3>
        <UsageMeter daily={daily} monthly={monthly} />
      </section>

      <form onSubmit={onSubmit}>
        {/* Business & Customer fields… (same as before) */}
        {/* Items table… */}
        {/* Totals card… */}

        {/* Actions */}
        <div className="row mt-4">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invoice'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
        {errorMsg && <div className="mt-2 text-danger">{errorMsg}</div>}
      </form>
    </main>
  );
}
