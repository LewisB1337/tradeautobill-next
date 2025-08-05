'use client';

export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import UsageMeter from '../components/UsageMeter';
import { useEffect, useRef, useState } from 'react';

type Item = {
  description: string;
  qty: number;
  unitPrice: number;
  vatRate: number;
};

export default function CreatePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [items, setItems] = useState<Item[]>([
    { description: '', qty: 1, unitPrice: 0, vatRate: 20 },
  ]);
  const [daily, setDaily] = useState({ used: 0, limit: 3 });
  const [monthly, setMonthly] = useState({ used: 0, limit: 10 });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/usage');
        if (!r.ok) return;
        const u = await r.json();
        setDaily({ used: u.dailyUsed, limit: u.dailyLimit });
        setMonthly({ used: u.monthlyUsed, limit: u.monthlyLimit });
      } catch {}
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      const formData = Object.fromEntries(new FormData(formRef.current!).entries());
      const payload = { ...formData, items };
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
      if (!r.ok) throw new Error(`Invoice API failed: ${r.status}`);
      const { jobId } = await r.json();
      router.replace(`/status/${encodeURIComponent(jobId)}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container py-10">
      <header className="row">
        <h1>Create invoice</h1>
      </header>
      <UsageMeter daily={daily} monthly={monthly} />
      <form ref={formRef} onSubmit={submit}>
        {/* your form fields */}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send invoice'}
        </button>
        {submitError && <p className="error">{submitError}</p>}
      </form>
    </section>
  );
}
