'use client';
export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Invoice = {
  id: string;
  invoice_num: string;
  sent_at: string;
  customer: { name: string; email: string };
  totals: { grandTotal: number; currency: string };
};

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/invoices', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json() as Promise<Invoice[]>;
      })
      .then(setInvoices)
      .catch((err) => {
        console.error('Failed to load invoices:', err);
        setError(err.message || 'Unknown error');
      });
  }, []);

  return (
    <section className="container py-10">
      <h1>Dashboard</h1>

      {error && (
        <div style={{ color: 'crimson', margin: '1rem 0' }}>
          {error}
        </div>
      )}

      {invoices.length === 0 && !error ? (
        <p>No invoices sent yet.</p>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice #</th>
              <th>Customer</th>
              <th className="num">Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{new Date(inv.sent_at).toLocaleDateString()}</td>
                <td>{inv.invoice_num}</td>
                <td>{inv.customer?.name || ''}</td>
                <td className="num">
                  {inv.totals.currency}
                  {inv.totals.grandTotal.toFixed(2)}
                </td>
                <td className="num">
                  <Link href={`/status/${inv.id}`} className="btn btn-link">
                    View status
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
