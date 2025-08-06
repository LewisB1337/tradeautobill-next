'use client'

import React, { useEffect, useState } from 'react'

type Invoice = {
  id: string
  invoice_num: string
  customer: { name: string }
  totals: { grandTotal: number; currency: string }
  created_at: string
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/invoices', { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to load')
        if (!Array.isArray(json.invoices)) throw new Error('Invalid response shape')
        setInvoices(json.invoices)
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="container py-10">
      <h1>Dashboard</h1>

      {loading && <p>Loading your invoices…</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {!loading && !error && invoices.length === 0 && (
        <p>You haven’t sent any invoices yet.</p>
      )}

      {!loading && invoices.length > 0 && (
        <table className="data" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Number</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoice_num || '—'}</td>
                <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                <td>{inv.customer.name}</td>
                <td>
                  {inv.totals.currency}{' '}
                  {inv.totals.grandTotal.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
