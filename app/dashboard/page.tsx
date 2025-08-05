'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';

type Invoice = {
  id: string;
  created_at: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: 'sent' | 'queued' | 'failed';
  pdfUrl?: string;
};

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [nextPage, setNextPage] = useState<number>();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  async function load(page = 1) {
    const res = await fetch(
      `/api/invoices?page=${page}&q=${encodeURIComponent(
        q
      )}&status=${encodeURIComponent(status)}`
    );
    if (!res.ok) return;
    const data = await res.json();
    setInvoices(data.items || []);
    setNextPage(data.nextPage);
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <section className="container py-10">
      <h1>Dashboard</h1>
      <div className="row" style={{ margin: '12px 0' }}>
        <input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="sent">sent</option>
          <option value="queued">queued</option>
          <option value="failed">failed</option>
        </select>
        <button onClick={() => load(1)} className="btn btn-secondary">
          Search
        </button>
      </div>
      <table className="data">
        <thead>
          <tr>
            <th>Date</th>
            <th>Invoice #</th>
            <th>Customer</th>
            <th className="num">Total</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{new Date(inv.created_at).toLocaleDateString()}</td>
              <td>{inv.invoiceNumber}</td>
              <td>{inv.customerName}</td>
              <td className="num">£{inv.total.toFixed(2)}</td>
              <td>{inv.status}</td>
              <td className="num">
                <a href={`/status/${inv.id}`} className="btn btn-link">
                  View
                </a>
                {inv.pdfUrl && (
                  <a
                    href={inv.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-link"
                  >
                    Download
                  </a>
                )}
                <button
                  className="btn btn-link"
                  onClick={() =>
                    fetch(`/api/invoices/${inv.id}/resend`, { method: 'POST' })
                  }
                >
                  Resend
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {nextPage && (
        <button
          onClick={() => load(nextPage)}
          className="btn btn-secondary"
        >
          Next
        </button>
      )}
    </section>
  );
}
