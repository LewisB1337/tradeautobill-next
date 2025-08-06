'use client'

import { useEffect, useState } from 'react'

type Invoice = {
  id: string
  created_at: string
  pdf_url: string | null
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    let isMounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/invoices', { cache: 'no-store' })
        const json = await res.json()
        if (!res.ok || !json.ok) {
          throw new Error(json?.error || `HTTP ${res.status}`)
        }
        if (isMounted) setInvoices(json.invoices || [])
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? String(e))
      } finally {
        if (isMounted) setLoading(false)
      }
    })()
    return () => { isMounted = false }
  }, [])

  if (loading) return <div className="p-6">Loading…</div>
  if (error)   return <div className="p-6 text-red-600">Error: {error}</div>

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-[640px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-2">#</th>
              <th className="text-left px-4 py-2">ID</th>
              <th className="text-left px-4 py-2">Created</th>
              <th className="text-left px-4 py-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No invoices yet.
                </td>
              </tr>
            ) : invoices.map((inv, i) => (
              <tr key={inv.id} className="border-t">
                <td className="px-4 py-2">{i + 1}</td>
                <td className="px-4 py-2 font-mono">{inv.id.slice(0, 8)}…</td>
                <td className="px-4 py-2">
                  {new Date(inv.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {inv.pdf_url
                    ? <a href={inv.pdf_url} target="_blank" rel="noopener noreferrer" className="underline">Open PDF</a>
                    : <span className="text-gray-500">Pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
