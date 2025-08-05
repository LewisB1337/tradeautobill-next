// app/create/_client.tsx
'use client';

import React, { useMemo, useState } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = { id: string; description: string; quantity: number; unitPrice: number };

export default function CreateForm() {
  const daily = { used: 12, limit: 50 };
  const monthly = { used: 15, limit: 200 };

  const [business, setBusiness] = useState({ name: '', email: '', address: '', vatNumber: '' });
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });

  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [vatRate, setVatRate] = useState<number>(20);

  const currency = 'GBP';
  const nfMoney = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency }),
    [currency]
  );

  const subTotal = useMemo(
    () => items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  );
  const vatAmount = useMemo(() => subTotal * (vatRate / 100), [subTotal, vatRate]);
  const grandTotal = useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const invoiceData = {
      business,
      customer,
      items,
      vatRate,
      totals: { subTotal, vatAmount, grandTotal, currency },
    };

    console.log('>>> Sending invoice payload:', invoiceData);

    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(invoiceData),
      });

      if (res.status === 401) {
        window.location.href = '/login?from=/create';
        return;
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      alert('Invoice submitted');
    } catch (err) {
      console.error('Failed to submit invoice:', err);
      alert('Failed to submit invoice');
    }
  }

  return (
    <main className="container py-10">
      <h1 style={{ marginTop: 0 }}>Create invoice</h1>

      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Usage</h3>
        <div className="row" style={{ alignItems: 'stretch' }}>
          <div style={{ flex: 1 }}>
            <div className="tiny muted" style={{ marginBottom: 8 }}>Today</div>
            <UsageMeter daily={daily} monthly={monthly} />
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} id="invoiceForm">
        {/* …rest of your form stays the same… */}
        <div className="row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-primary">Send invoice</button>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()} title="Print / Save as PDF">
            Print
          </button>
        </div>
      </form>
    </main>
  );
}
