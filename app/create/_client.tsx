// app/create/_client.tsx
// ───────────────────────
'use client';

import React, { useMemo, useState } from 'react';

type Item = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // per-line VAT
};

export default function CreateForm() {
  // ── Form State ───────────────────────────────────────────────────────────
  const [businessName,    setBusinessName]    = useState('');
  const [businessEmail,   setBusinessEmail]   = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [vatNumber,       setVatNumber]       = useState('');

  const [customerName,    setCustomerName]    = useState('');
  const [customerEmail,   setCustomerEmail]   = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate,   setInvoiceDate]   = useState('');
  const [dueDate,       setDueDate]       = useState('');
  const [poNumber,      setPoNumber]      = useState('');
  const [notes,         setNotes]         = useState('');

  const DEFAULT_LINE_VAT = 20;

  const [items, setItems] = useState<Item[]>([
    {
      id:        crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      description: '',
      quantity:    1,
      unitPrice:   0,
      vatRate:     DEFAULT_LINE_VAT,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

  // ── Totals ───────────────────────────────────────────────────────────────
  const currency = 'GBP';
  const nfMoney  = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency }),
    [currency]
  );

  const subTotal = useMemo(
    () => items.reduce((sum, it) =>
      sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  );
  const vatTotal = useMemo(
    () => items.reduce((sum, it) =>
      sum + (Number(it.quantity) || 0) *
            (Number(it.unitPrice)  || 0) *
            ((Number(it.vatRate)   || 0) / 100), 0),
    [items]
  );
  const grandTotal = subTotal + vatTotal;

  // ── Item helpers ─────────────────────────────────────────────────────────
  function updateItem(id: string, patch: Partial<Item>) {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems(prev => [
      ...prev,
      {
        id:        crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        description: '',
        quantity:    1,
        unitPrice:   0,
        vatRate:     DEFAULT_LINE_VAT,
      },
    ]);
  }
  function removeItem(id: string) {
    setItems(prev => (prev.length > 1 ? prev.filter(it => it.id !== id) : prev));
  }

  // ── Submit ───────────────────────────────────────────────────────────────
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
        headers:      { 'Content-Type': 'application/json' },
        credentials:  'include',
        body:         JSON.stringify(payload),
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="container py-10">
      {/* Header */}
      <header className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Create invoice</h1>
      </header>

      {/* Form */}
      <form id="invoiceForm"
            onSubmit={onSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Business & customer sections */}
        <div className="grid-2">
          <fieldset>
            <legend>Business</legend>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Business name" required value={businessName}
                     onChange={e => setBusinessName(e.target.value)} />
              <input type="email" placeholder="billing@you.co.uk" required value={businessEmail}
                     onChange={e => setBusinessEmail(e.target.value)} />
              <input placeholder="Address" value={businessAddress}
                     onChange={e => setBusinessAddress(e.target.value)} />
              <input placeholder="VAT number (optional)" value={vatNumber}
                     onChange={e => setVatNumber(e.target.value)} />
            </div>
          </fieldset>

          <fieldset>
            <legend>Customer</legend>
            <div style={{ display: 'grid', gap: 12 }}>
              <input placeholder="Customer name" required value={customerName}
                     onChange={e => setCustomerName(e.target.value)} />
              <input type="email" placeholder="customer@their.com" required value={customerEmail}
                     onChange={e => setCustomerEmail(e.target.value)} />
              <input placeholder="Address (optional)" value={customerAddress}
                     onChange={e => setCustomerAddress(e.target.value)} />
            </div>
          </fieldset>
        </div>

        {/* Invoice details */}
        <fieldset>
          <legend>Invoice details</legend>
          <div className="grid-2">
            <input placeholder="INV-2025-0001" required value={invoiceNumber}
                   onChange={e => setInvoiceNumber(e.target.value)} />
            <input type="date" required value={invoiceDate}
                   onChange={e => setInvoiceDate(e.target.value)} />
            <input type="date" required value={dueDate}
                   onChange={e => setDueDate(e.target.value)} />
            <input placeholder="PO number (optional)" value={poNumber}
                   onChange={e => setPoNumber(e.target.value)} />
          </div>
          <textarea placeholder="Notes (optional)" value={notes}
                    onChange={e => setNotes(e.target.value)}
                    style={{ width: '100%', padding: 12, borderRadius: 8,
                             border: '1px solid var(--color-border)', marginTop: 12 }} />
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
                const lineExVat = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                const lineIncVat = lineExVat * (1 + (Number(it.vatRate) || 0) / 100);
                return (
                  <tr key={it.id}>
                    <td>
                      <input placeholder="Description" value={it.description}
                             onChange={e => updateItem(it.id, { description: e.target.value })} />
                    </td>
                    <td className="num">
                      <input type="number" min={0} step={1} value={it.quantity}
                             onChange={e => updateItem(it.id, { quantity: Number(e.target.value) })} />
                    </td>
                    <td className="num">
                      <input type="number" min={0} step="0.01" value={it.unitPrice}
                             onChange={e => updateItem(it.id, { unitPrice: Number(e.target.value) })} />
                    </td>
                    <td className="num">
                      <input type="number" min={0} step="0.5" value={it.vatRate}
                             onChange={e => updateItem(it.id, { vatRate: Number(e.target.value) })} />
                    </td>
                    <td className="num">{nfMoney.format(lineIncVat)}</td>
                    <td className="num">
                      <button type="button" className="btn btn-secondary"
                              onClick={() => removeItem(it.id)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button type="button" className="btn btn-secondary" onClick={addItem}
                  style={{ marginTop: 8 }}>+ Add item</button>
        </fieldset>

        {/* Totals display */}
        <section className="card" id="totals">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Subtotal</strong> <span>{nfMoney.format(subTotal)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>VAT</strong> <span>{nfMoney.format(vatTotal)}</span>
          </div>
          <div className="row" style={{
            justifyContent: 'space-between',
            fontSize: '1.1rem', marginTop: 8 }}>
            <strong>Total</strong> <span>{nfMoney.format(grandTotal)}</span>
          </div>
        </section>

        {/* Actions & error */}
        <div className="row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invoice'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
            Print
          </button>
        </div>
        {errorMsg && <div style={{ color: 'crimson', marginTop: 8 }}>{errorMsg}</div>}
      </form>
    </main>
  );
}
