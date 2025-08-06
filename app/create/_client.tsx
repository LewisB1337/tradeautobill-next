// app/create/_client.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = { id: string; description: string; quantity: number; unitPrice: number };

export default function CreateForm() {
  // Real usage state
  const [daily, setDaily]     = useState({ used: 0, limit: 0 });
  const [monthly, setMonthly] = useState({ used: 0, limit: 0 });

  // Form state
  const [business, setBusiness] = useState({ name: '', email: '', address: '', vatNumber: '' });
  const [customer, setCustomer] = useState({ name: '', email: '', address: '' });
  const [items, setItems]       = useState<Item[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [vatRate, setVatRate]   = useState(20);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  // Fetch real usage on mount
  useEffect(() => {
    fetch('/api/usage', { credentials: 'include' })
      .then(async res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => {
        setDaily({ used: data.daily_count, limit: data.daily_limit });
        setMonthly({ used: data.monthly_count, limit: data.monthly_limit });
      })
      .catch(err => console.error('Usage fetch failed', err));
  }, []);

  // Totals formatting
  const currency = 'GBP';
  const nfMoney = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency }),
    [currency]
  );

  const subTotal  = useMemo(() => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0), [items]);
  const vatAmount = useMemo(() => subTotal * (vatRate / 100), [subTotal, vatRate]);
  const grandTotal= useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  // Item helpers
  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }
  function addItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 }]);
  }
  function removeItem(id: string) {
    setItems(prev => (prev.length > 1 ? prev.filter(it => it.id !== id) : prev));
  }

  // Submit handler
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      business,
      customer,
      items,
      vatRate,
      totals: { subTotal, vatAmount, grandTotal, currency }
    };

    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
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
        setErrorMsg(error || 'Quota reached. Upgrade to send more.');
        return;
      }
      if (!res.ok) {
        const { error, detail } = await res.json().catch(() => ({}));
        setErrorMsg(error || detail || 'Something went wrong.');
        return;
      }

      alert('Invoice sent! Check your email.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container py-10">
      <h1>Create invoice</h1>

      {/* Usage meter */}
      <section className="card mb-6">
        <h3>Usage</h3>
        <UsageMeter daily={daily} monthly={monthly} />
      </section>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Business & Customer */}
        <div className="grid grid-cols-2 gap-6">
          <fieldset>
            <legend>Business</legend>
            <input
              placeholder="Business name"
              required
              value={business.name}
              onChange={e => setBusiness({ ...business, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Business email"
              required
              value={business.email}
              onChange={e => setBusiness({ ...business, email: e.target.value })}
            />
            <input
              placeholder="Address"
              value={business.address}
              onChange={e => setBusiness({ ...business, address: e.target.value })}
            />
            <input
              placeholder="VAT number (optional)"
              value={business.vatNumber}
              onChange={e => setBusiness({ ...business, vatNumber: e.target.value })}
            />
          </fieldset>

          <fieldset>
            <legend>Customer</legend>
            <input
              placeholder="Customer name"
              required
              value={customer.name}
              onChange={e => setCustomer({ ...customer, name: e.target.value })}
            />
            <input
              type="email"
              placeholder="Customer email"
              required
              value={customer.email}
              onChange={e => setCustomer({ ...customer, email: e.target.value })}
            />
            <input
              placeholder="Address (optional)"
              value={customer.address}
              onChange={e => setCustomer({ ...customer, address: e.target.value })}
            />
          </fieldset>
        </div>

        {/* Items table */}
        <fieldset>
          <legend>Items</legend>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th/>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const line = it.quantity * it.unitPrice;
                return (
                  <tr key={it.id}>
                    <td>
                      <input
                        placeholder="Description"
                        value={it.description}
                        onChange={e => updateItem(it.id, { description: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        value={it.quantity}
                        onChange={e => updateItem(it.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPrice}
                        onChange={e => updateItem(it.id, { unitPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td>{nfMoney.format(line)}</td>
                    <td>
                      <button type="button" onClick={() => removeItem(it.id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" onClick={addItem}>+ Add item</button>
        </fieldset>

        {/* Totals & actions */}
        <div className="flex justify-between items-center">
          <div>
            <div>Subtotal: <strong>{nfMoney.format(subTotal)}</strong></div>
            <div>
              VAT (%): 
              <input
                type="number"
                min={0}
                step="0.5"
                value={vatRate}
                onChange={e => setVatRate(Number(e.target.value))}
                style={{ width: 60, marginLeft: 8 }}
              />
            </div>
            <div>VAT amount: <strong>{nfMoney.format(vatAmount)}</strong></div>
            <div>Grand total: <strong>{nfMoney.format(grandTotal)}</strong></div>
          </div>
          <div className="space-x-4">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Sending…' : 'Send invoice'}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
            >
              Print
            </button>
          </div>
        </div>

        {errorMsg && (
          <div style={{ color: 'crimson', marginTop: 8 }}>
            {errorMsg}
          </div>
        )}
      </form>
    </main>
  );
}
