'use client';

import React, { useEffect, useState } from 'react';

type Invoice = {
  id?: string | number | null;
  sent_at?: string | null;
  invoice_num?: string;
  customer_name?: string;
  customer_email?: string;
  total?: number | null;
  currency?: string | null;
  pdf_url?: string | null;
};

function formatDate(d?: string | null) {
  if (!d) return '—';
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleString();
}

function formatMoney(v?: number | null, currency?: string | null) {
  if (typeof v !== 'number') return '—';
  const cur = currency || 'GBP';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: cur }).format(v);
  } catch {
    return `${cur} ${v.toFixed(2)}`;
  }
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch('/api/invoices', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Accept': 'application/json' },
        });

        if (res.status === 401) {
          // Not logged in → bounce to login and come back
          window.location.href = '/login?from=/dashboard';
          return;
        }

        const data = await res.json().catch(() => ({} as any));

        // Accept { ok:true, invoices:[...] } (new shape)
        if (data && data.ok === true && Array.isArray(data.invoices)) {
          if (!cancelled) setInvoices(data.invoices);
        }
        // Back-compat: if API ever returned a raw array
        else if (Array.isArray(data)) {
          if (!cancelled) setInvoices(data);
        }
        // Some earlier debug shapes like { debug: [...] }
        else if (data && Array.isArray(data.debug)) {
          if (!cancelled) setInvoices(data.debug);
        } else {
          throw new Error('Invalid response shape');
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="container py-10">
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      {loading && <div>Loading…</div>}

      {!loading && error && (
        <div style={{ color: 'crimson', margin: '12px 0' }}>
          {error}
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="card" style={{ padding: 16 }}>
          <strong>No invoices yet.</strong>
          <div className="muted" style={{ marginTop: 6 }}>
            Create your first invoice on the <a href="/create">Create Invoice</a> page.
          </div>
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <section className="card" style={{ overflowX: 'auto' }}>
          <table className="data" style={{ width: '100%', minWidth: 720 }}>
            <thead>
              <tr>
                <th>Sent</th>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Email</th>
                <th className="num">Total</th>
                <th>PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={String(inv.id ?? idx)}>
                  <td>{formatDate(inv.sent_at)}</td>
                  <td>{inv.invoice_num || '—'}</td>
                  <td>{inv.customer_name || '—'}</td>
                  <td>{inv.customer_email || '—'}</td>
                  <td className="num">{formatMoney(inv.total, inv.currency)}</td>
                  <td>
                    {inv.pdf_url ? (
                      <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer">
                        Open PDF
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
