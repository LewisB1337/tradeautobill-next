'use client';
export const dynamic = 'force-dynamic';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import UsageMeter from '../../components/UsageMeter';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/usage');
      if (!res.ok) return;
      const u = await res.json();
      setDaily({ used: u.dailyUsed, limit: u.dailyLimit });
      setMonthly({ used: u.monthlyUsed, limit: u.monthlyLimit });
    })();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const data = {
        ...(Object.fromEntries(new FormData(formRef.current!).entries())),
        items,
      };
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.status === 429) {
        const { error } = await res.json();
        setError(error);
        return;
      }
      if (!res.ok) throw new Error(res.statusText);
      const { jobId } = await res.json();
      router.replace(`/status/${encodeURIComponent(jobId)}`);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="container py-10">
      <h1>Create invoice</h1>
      <UsageMeter daily={daily} monthly={monthly} />
      <form ref={formRef} onSubmit={handleSubmit}>
        {/* …your form fields here… */}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send invoice'}
        </button>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
