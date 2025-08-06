// app/create/_client.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
};

export default function CreateForm() {
  // ── Usage & Tier ────────────────────────────────────────────────────────────
  const [daily, setDaily]       = useState({ used: 0, limit: 0 });
  const [monthly, setMonthly]   = useState({ used: 0, limit: 0 });
  const [tier, setTier]         = useState('Free');

  useEffect(() => {
    // Fetch usage + tier in parallel
    Promise.all([
      fetch('/api/usage', { credentials: 'include' }).then(r => r.ok ? r.json() : Promise.reject()),
      fetch('/api/invoice', { credentials: 'include' }).then(r => r.ok ? r.json() : Promise.reject())
    ]).then(([u, inv]) => {
      setDaily({ used: u.daily_count, limit: u.daily_limit });
      setMonthly({ used: u.monthly_count, limit: u.monthly_limit });
      if (inv.user?.tier) setTier(inv.user.tier.charAt(0).toUpperCase() + inv.user.tier.slice(1));
    }).catch(() => {
      // unauthorized or error → leave zeros
    });
  }, []);

  // ── Form State ──────────────────────────────────────────────────────────────
  const [businessName,    setBusinessName]    = useState('');
  const [businessEmail,   setBusinessEmail]   = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [vatNumber,       setVatNumber]       = useState('');

  const [customerName,    setCustomerName]    = useState('');
  const [customerEmail,   setCustomerEmail]   = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [invoiceNumber,   setInvoiceNumber]   = useState('');
  const [invoiceDate,     setInvoiceDate]     = useState('');
  const [dueDate,         setDueDate]         = useState('');
  const [poNumber,        setPoNumber]        = useState('');
  const [notes,           setNotes]           = useState('');

  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate: 20 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const currency = 'GBP';
  const nfMoney = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency }),
    [currency]
  );

  const subTotal  = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0),
    [items]
  );
  const vatTotal  = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity * it.unitPrice * (it.vatRate/100), 0),
    [items]
  );
  const grandTotal = subTotal + vatTotal;

  // ── Item Helpers ───────────────────────────────────────────────────────────
  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }
  function addItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0, vatRate }]);
  }
  function removeItem(id: string) {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
  }

  // ── Submit Handler ─────────────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      business: { name: businessName, email: businessEmail, address: businessAddress, vatNumber },
      customer: { name: customerName, email: customerEmail, address: customerAddress },
      invoiceNumber,
      invoiceDate,
      dueDate,
      poNumber,
      notes,
      items,
      totals: { subTotal, vatTotal, grandTotal, currency },
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
    } catch {
      setErrorMsg('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container py-10">
      <header className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Create invoice</h1>
        <span className="pill">{tier}</span>
      </header>

      <div className="meter" style={{ margin: '16px 0' }}>
        <span className="tiny">
          Today: <strong>{daily.used}</strong>/<span>{daily.limit}</span>
        </span>
        <div className="bar" style={{ flex: 1, margin: '0 12px' }}>
          <span style={{ width: daily.limit ? `${(daily.used / daily.limit) * 100}%` : '0%' }} />
        </div>
        <span className="tiny">
          Month: <strong>{monthly.used}</strong>/<span>{monthly.limit}</span>
        </span>
        <div className="bar" style={{ flex: 1, margin: '0 12px' }}>
          <span style={{ width: monthly.limit ? `${(monthly.used / monthly.limit) * 100}%` : '0%' }} />
        </div>
      </div>

      <form id="invoiceForm" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Business & Customer */}
        <div className="grid-2">
          <fieldset>
            <legend>Business</legend>
            <input
              placeholder="Business name"
              required
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
            <input
              type="email"
              placeholder="billing@you.co.uk"
              required
              value={businessEmail}
              onChange={e => setBusinessEmail(e.target.value)}
            />
            <input
              placeholder="Address"
              value={businessAddress}
              onChange={e => setBusinessAddress(e.target.value)}
            />
            <input
              placeholder="VAT number (optional)"
              value={vatNumber}
              onChange={e => setVatNumber(e.target.value)}
            />
          </fieldset>

          <fieldset>
            <legend>Customer</legend>
            <input
              placeholder="Customer name"
              required
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
            />
            <input
              type="email"
              placeholder="customer@their.com"
              required
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
            />
            <input
              placeholder="Address (optional)"
              value={customerAddress}
              onChange={e => setCustomerAddress(e.target.value)}
            />
          </fieldset>
        </div>

        {/* Invoice details */}
        <fieldset>
          <legend>Invoice details</legend>
          <div className="grid-2">
            <input
              placeholder="INV-2025-0001"
              required
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
            />
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
            />
            <input
              type="date"
              required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
            <input
              placeholder="PO number (optional)"
              value={poNumber}
              onChange={e => setPoNumber(e.target.value)}
            />
          </div>
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}
          />
        </fieldset>

        {/* Line items */}
        <fieldset>
          <legend>Line items</legend>
          <table className="data" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Description</th>
                <th className="num">Qty</th>
                <th className="num">Unit £</th>
                <th className="num">VAT %</th>
                <th className="num">Line £</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(it => {
                const lineTotal = it.quantity * it.unitPrice * (1 + it.vatRate / 100);
                return (
                  <tr key={it.id}>
                    <td>
                      <input
                        placeholder="Description"
                        value={it.description}
                        onChange={e => updateItem(it.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        value={it.quantity}
                        onChange={e => updateItem(it.id, { quantity: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPrice}
                        onChange={e => updateItem(it.id, { unitPrice: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        step="0.5"
                        value={it.vatRate}
                        onChange={e => updateItem(it.id, { vatRate: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num">{nfMoney.format(lineTotal)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-link"
                        onClick={() => removeItem(it.id)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addItem}
            style={{ marginTop: '8px' }}
          >
            Add item
          </button>
        </fieldset>

        {/* Totals */}
        <section className="card" id="totals">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Subtotal</strong> <span>{nfMoney.format(subTotal)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>VAT</strong> <span>{nfMoney.format(vatTotal)}</span>
          </div>
          <div
            className="row"
            style={{ justifyContent: 'space-between', fontSize: '1.25rem', marginTop: '8px' }}
          >
            <strong>Total</strong> <span>{nfMoney.format(grandTotal)}</span>
          </div>
        </section>

        {/* Actions + Error */}
        <div className="row" style={{ marginTop: '12px' }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invoice'}
          </button>
          <a href="/pricing.html" className="btn btn-secondary">
            Remove watermark & lift limits
          </a>
        </div>
        {errorMsg && (
          <div style={{ color: 'crimson', marginTop: '8px' }}>
            {errorMsg}
          </div>
        )}
      </form>
    </main>
  );
}
