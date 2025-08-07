// app/create/_client.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import UsageMeter from '../components/UsageMeter';

type Item = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // per-line VAT
};

interface CreateFormProps {
  initialUsage: {
    daily: { used: number; limit: number };
    monthly: { used: number; limit: number };
  };
}

export default function CreateForm({ initialUsage }: CreateFormProps) {
  // ── Usage ──────────────────────────────────────────────────────────────────
  const [daily, setDaily] = useState(initialUsage.daily);
  const [monthly, setMonthly] = useState(initialUsage.monthly);
  const [tier, setTier] = useState<string>('Free');

  // ── Fetch tier on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/invoice', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((inv) => {
        if (inv.user?.tier) {
          setTier(
            String(inv.user.tier).replace(/^\w/, (c) =>
              c.toUpperCase()
            )
          );
        }
      })
      .catch(() => {});
  }, []);

  // ── Form State ─────────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [vatNumber, setVatNumber] = useState('');

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [notes, setNotes] = useState('');

  const DEFAULT_LINE_VAT = 20;
  const [items, setItems] = useState<Item[]>([
    {
      id:
        globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2),
      description: '',
      quantity: 1,
      unitPrice: 0,
      vatRate: DEFAULT_LINE_VAT,
    },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Totals ─────────────────────────────────────────────────────────────────
  const currency = 'GBP';
  const nfMoney = useMemo(
    () =>
      new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency,
      }),
    [currency]
  );

  const subTotal = useMemo(
    () =>
      items.reduce(
        (sum, it) =>
          sum +
          (Number(it.quantity) || 0) *
            (Number(it.unitPrice) || 0),
        0
      ),
    [items]
  );
  const vatTotal = useMemo(
    () =>
      items.reduce(
        (sum, it) =>
          sum +
          (Number(it.quantity) || 0) *
            (Number(it.unitPrice) || 0) *
            ((Number(it.vatRate) || 0) / 100),
        0
      ),
    [items]
  );
  const grandTotal = subTotal + vatTotal;

  // ── Item helpers ───────────────────────────────────────────────────────────
  function updateItem(id: string, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, ...patch } : it
      )
    );
  }
  function addItem() {
    setItems((prev) => [
      ...prev,
      {
        id:
          globalThis.crypto?.randomUUID?.() ??
          Math.random().toString(36).slice(2),
        description: '',
        quantity: 1,
        unitPrice: 0,
        vatRate: DEFAULT_LINE_VAT,
      },
    ]);
  }
  function removeItem(id: string) {
    setItems((prev) =>
      prev.length > 1
        ? prev.filter((it) => it.id !== id)
        : prev
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      business: {
        name: businessName,
        email: businessEmail,
        address: businessAddress,
        vatNumber,
      },
      customer: {
        name: customerName,
        email: customerEmail,
        address: customerAddress,
      },
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
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        window.location.href = `/login?from=/create`;
        return;
      }
      if (res.status === 429) {
        const { error } = await res
          .json()
          .catch(() => ({}));
        setErrorMsg(
          error || 'Quota reached. Upgrade to send more.'
        );
        return;
      }
      if (!res.ok) {
        const { error, detail } = await res
          .json()
          .catch(() => ({}));
        setErrorMsg(
          error || detail || 'Something went wrong.'
        );
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="container py-10">
      <header className="row" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Create invoice</h1>
        <span className="pill">{tier}</span>
      </header>

      {/* Usage meter */}
      <section className="card" style={{ margin: '16px 0' }}>
        <h3 style={{ marginTop: 0 }}>Usage</h3>
        <UsageMeter daily={daily} monthly={monthly} />
      </section>

      <form
        id="invoiceForm"
        onSubmit={onSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        {/* …rest of your form markup unchanged… */}
      </form>

      {errorMsg && (
        <div style={{ color: 'crimson', marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
    </main>
  );
}
