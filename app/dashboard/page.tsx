'use client'

import React, { useEffect, useState } from 'react'

type Invoice = {
  id: string
  invoice_num: string
  created_at: string
  pdf_url: string | null
  totals: {
    grandTotal: number
    currency: string
  }
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/invoices', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((body) => {
        if (!body.ok || !Array.isArray(body.invoices)) {
          throw new Error('Invalid response shape')
        }
        setInvoices(body.invoices)
      })
      .catch((err) => {
        console.error('Failed to load invoices', err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p>Loading your sent invoices…</p>
  }
  if (error) {
    return <p style={{ color: 'crimson' }}>Error: {error}</p>
  }
  if (invoices.length === 0) {
    return <p>You haven’t sent any invoices yet.</p>
  }

  return (
    <main className="container py-10">
      <h1>Your sent invoices</h1>
      <table className="data" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Date</th>
            <th>Total</th>
            <th>PDF</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.invoice_num || '—'}</td>
              <td>{new Date(inv.created_at).toLocaleDateString()}</td>
              <td>
                {inv.totals.currency}{inv.totals.grandTotal.toFixed(2)}
              </td>
              <td>
                {inv.pdf_url
                  ? <a href={inv.pdf_url} target="_blank" rel="noopener">View PDF</a>
                  : 'n/a'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
