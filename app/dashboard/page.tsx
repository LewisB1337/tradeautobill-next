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
  const [items, setItems] = useState<Invoice[]>([]);
  const [nextPage, setNextPage] = useState<number>();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  async function load(page = 1) {
    const r = await fetch(
      `/api/invoices?page=${page}&q=${encodeURIComponent(
        q
      )}&status=${encodeURIComponent(status)}`
    );
    if (!r.ok) return;
    const data = await r.json();
    setItems(data.items || []);
    setNextPage(data.nextPage);
  }

  useEffect(() => {
    load(1);
  }, []);

  return (
    <section className="container py-10">
      <header className="row">
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        <span className="pill">Standard</span>
      </header>
      <div className="row" style={{ margin: '12px 0' }}>
        <input
          placeholder="Search customer or invoice #"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="sent">sent</option>
          <option value="queued">queued</option>
          <option value="failed">failed</option>
        </select>
        <button className="btn btn-secondary" onClick={() => load(1)}>
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
          {items.map((it) => (
            <tr key={it.id}>
              <td>{new Date(it.created_at).toLocaleDateString()}</td>
              <td>{it.invoiceNumber}</td>
              <td>{it.customerName}</td>
              <td className="num">£{it.total.toFixed(2)}</td>
              <td>{it.status}</td>
              <td className="num">
                <a className="btn btn-link" href={`/status/${it.id}`}>
                  View
                </a>
                {it.pdfUrl && (
                  <a
                    className="btn btn-link"
                    target="_blank"
                    href={it.pdfUrl}
                    rel="noreferrer"
                  >
                    Download
                  </a>
                )}
                <button
                  className="btn btn-link"
                  onClick={() =>
                    fetch(`/api/invoices/${it.id}/resend`, {
                      method: 'POST',
                    })
                  }
                >
                  Resend
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <nav className="row" style={{ marginTop: 12 }}>
        {nextPage && (
          <button className="btn btn-secondary" onClick={() => load(nextPage)}>
            Next
          </button>
        )}
      </nav>
    </section>
  );
}
