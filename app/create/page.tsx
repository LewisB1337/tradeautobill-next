// app/create/page.tsx
'use client';

import React, { useMemo, useState } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = { id: string; description: string; quantity: number; unitPrice: number };

export default function CreatePage() {
  // Replace these with real values (e.g., fetched in useEffect)
  const daily = { used: 12, limit: 50 };
  const monthly = { used: 15, limit: 200 };

  // Business / Customer
  const [business, setBusiness] = useState({
    name: '',
    email: '',
    address: '',
    vatNumber: '',
  });
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    address: '',
  });

  // Items
  const [items, setItems] = useState<Item[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
  ]);
  const [vatRate, setVatRate] = useState<number>(20); // % VAT

  const currency = 'GBP';
  const nfMoney = useMemo(
    () => new Intl.NumberFormat('en-GB', { style: 'currency', currency }),
    [currency]
  );

  const subTotal = useMemo(
    () =>
      items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0),
    [items]
  );
  const vatAmount = useMemo(() => subTotal * (Math.max(0, vatRate) / 100), [subTotal, vatRate]);
  const grandTotal = useMemo(() => subTotal + vatAmount, [subTotal, vatAmount]);

  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), description: '', quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // TODO: replace with your real API
    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business,
          customer,
          items,
          vatRate,
          totals: { subTotal, vatAmount, grandTotal, currency },
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert('Invoice submitted');
    } catch (err) {
      console.error(err);
      alert('Failed to submit invoice');
    }
  }

  return (
    <main className="container py-10">
      <h1 style={{ marginTop: 0 }}>Create invoice</h1>

      {/* Usage */}
      <section className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Usage</h3>
        <div className="row" style={{ alignItems: 'stretch' }}>
          <div style={{ flex: 1 }}>
            <div className="row" style={{ alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div className="tiny muted" style={{ marginBottom: 8 }}>
                  Today
                </div>
                <UsageMeter daily={daily} monthly={monthly} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={onSubmit} id="invoiceForm">
        <div className="grid-2">
          {/* Business */}
          <fieldset>
            <legend>Business</legend>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                name="businessName"
                placeholder="Business name"
                required
                value={business.name}
                onChange={(e) => setBusiness({ ...business, name: e.target.value })}
              />
              <input
                name="businessEmail"
                type="email"
                placeholder="billing@you.co.uk"
                required
                value={business.email}
                onChange={(e) => setBusiness({ ...business, email: e.target.value })}
              />
              <input
                name="businessAddress"
                placeholder="Address"
                value={business.address}
                onChange={(e) => setBusiness({ ...business, address: e.target.value })}
              />
              <input
                name="vatNumber"
                placeholder="VAT number (optional)"
                value={business.vatNumber}
                onChange={(e) => setBusiness({ ...business, vatNumber: e.target.value })}
              />
            </div>
          </fieldset>

          {/* Customer */}
          <fieldset>
            <legend>Customer</legend>
            <div style={{ display: 'grid', gap: 12 }}>
              <input
                name="customerName"
                placeholder="Customer name"
                required
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
              />
              <input
                name="customerEmail"
                type="email"
                placeholder="customer@their.com"
                required
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
              <input
                name="customerAddress"
                placeholder="Address (optional)"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
            </div>
          </fieldset>
        </div>

        {/* Items */}
        <fieldset>
          <legend>Items</legend>
          <table className="data" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '55%' }}>Description</th>
                <th className="num" style={{ width: '10%' }}>
                  Qty
                </th>
                <th className="num" style={{ width: '20%' }}>
                  Unit price
                </th>
                <th className="num" style={{ width: '10%' }}>
                  Line total
                </th>
                <th style={{ width: '5%' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const line = (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0);
                return (
                  <tr key={it.id}>
                    <td>
                      <input
                        placeholder="Description"
                        value={it.description}
                        onChange={(e) => updateItem(it.id, { description: e.target.value })}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={it.quantity}
                        onChange={(e) =>
                          updateItem(it.id, { quantity: Math.max(0, Number(e.target.value)) })
                        }
                      />
                    </td>
                    <td className="num">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unitPrice}
                        onChange={(e) =>
                          updateItem(it.id, { unitPrice: Math.max(0, Number(e.target.value)) })
                        }
                      />
                    </td>
                    <td className="num">{nfMoney.format(line || 0)}</td>
                    <td className="num">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => removeItem(it.id)}
                        aria-label="Remove row"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={addItem}>
              + Add item
            </button>

            <div className="card" style={{ minWidth: 280 }}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>Subtotal</span>
                <strong>{nfMoney.format(subTotal)}</strong>
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <label htmlFor="vat">VAT (%)</label>
                <input
                  id="vat"
                  type="number"
                  min={0}
                  step="0.5"
                  value={vatRate}
                  onChange={(e) => setVatRate(Math.max(0, Number(e.target.value)))}
                  style={{ width: 90 }}
                />
              </div>
              <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                <span>VAT amount</span>
                <strong>{nfMoney.format(vatAmount)}</strong>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '8px 0' }} />
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span>Total</span>
                <strong>{nfMoney.format(grandTotal)}</strong>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn btn-primary">
            Send invoice
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => window.print()}
            title="Print / Save as PDF"
          >
            Print
          </button>
        </div>
      </form>
    </main>
  );
}
