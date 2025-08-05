'use client';
export const dynamic = 'error';


// app/create/page.tsx

import { useRouter } from 'next/navigation';
import UsageMeter from '../components/UsageMeter';
import { useEffect, useRef, useState } from 'react';

type Item = { description: string; qty: number; unitPrice: number; vatRate: number };
type InvoicePayload = Record<string, any> & { items: Item[] };

export default function Page() {
  const router = useRouter();

  /* ------------------------------------------------------------------ */
  /*  state                                                             */
  /* ------------------------------------------------------------------ */
  const [daily, setDaily]       = useState({ used: 0, limit: 3 });
  const [monthly, setMonthly]   = useState({ used: 0, limit: 10 });
  const [items, setItems]       = useState<Item[]>([
    { description: '', qty: 1, unitPrice: 0, vatRate: 20 },
  ]);
  const formRef                 = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [jobId, setJobId]               = useState<string | null>(null);
  const [invoiceSent, setInvoiceSent]   = useState(false);

  /* ------------------------------------------------------------------ */
  /*  load usage limits                                                 */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/usage');
        if (!r.ok) return;
        const u = await r.json();
        setDaily  ({ used: u.dailyUsed,   limit: u.dailyLimit  });
        setMonthly({ used: u.monthlyUsed, limit: u.monthlyLimit });
      } catch {}
    })();
  }, []);

  /* ------------------------------------------------------------------ */
  /*  derived totals                                                    */
  /* ------------------------------------------------------------------ */
  const totals = items.reduce(
    (acc, it) => {
      const line = (it.qty || 0) * (it.unitPrice || 0);
      const v    = line * ((it.vatRate || 0) / 100);
      acc.sub += line;
      acc.vat += v;
      return acc;
    },
    { sub: 0, vat: 0 },
  );
  const grand = totals.sub + totals.vat;

  /* ------------------------------------------------------------------ */
  /*  item helpers                                                      */
  /* ------------------------------------------------------------------ */
  const updateItem = (i: number, patch: Partial<Item>) =>
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const removeItem = (i: number) =>
    setItems(prev => prev.filter((_, idx) => idx !== i));

  const addItem = () =>
    setItems(prev => [...prev, { description: '', qty: 1, unitPrice: 0, vatRate: 20 }]);

  /* ------------------------------------------------------------------ */
  /*  submit handler                                                    */
  /* ------------------------------------------------------------------ */
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    setJobId(null);
    setInvoiceSent(false);

    try {
      const formData = Object.fromEntries(new FormData(formRef.current!).entries());
      const payload: InvoicePayload = { ...formData, items };

      const r = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (r.status === 429) {
        const { error } = await r.json();
        setSubmitError(error);
        return;
      }

      const text = await r.text();
      let json: any = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {}

      if (!r.ok) throw new Error(json?.error || `Invoice API failed: ${r.status}`);

      const returnedJobId =
        json.jobId ??
        json.jobID ??
        json.job?.jobId ??
        json.job?.jobID ??
        json.id ??
        null;

      if (!returnedJobId) throw new Error('No jobId returned');

      setJobId(returnedJobId);
      setInvoiceSent(true);
      router.replace(`/status/${encodeURIComponent(returnedJobId)}`);
    } catch (err: any) {
      console.error('Invoice submit error', err);
      setSubmitError(err?.message || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  render                                                            */
  /* ------------------------------------------------------------------ */
  return (
    <section className="container py-10">
      <header className="row">
        <h1 style={{ margin: 0 }}>Create invoice</h1>
        <span className="pill" id="tier"></span>
      </header>

      <UsageMeter daily={daily} monthly={monthly} />

      {/* ----- FORM --------------------------------------------------- */}
      {/* (rest of form markup unchanged) */}
      {/* -------------------------------------------------------------- */}

      {/* Confirmation */}
      {invoiceSent && (
        <div style={{ marginTop: 32 }}>
          <h2>Invoice status</h2>
          <p style={{ color: 'green' }}>✅ Invoice sent.</p>
          {jobId && (
            <p style={{ fontSize: '0.9rem' }}>
              Job ID: <code>{jobId}</code>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
