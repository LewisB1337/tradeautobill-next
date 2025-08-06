'use client'

import { useState, useEffect, useMemo } from 'react'

type Invoice = {
  id: string
  email: string | null
  total: number
  created_at: string
  pdf_url: string | null
}

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI state
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/invoices', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setInvoices(json.invoices)
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let rows = invoices
    const q = query.trim().toLowerCase()
    if (q) rows = rows.filter(r =>
      r.id.toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q)
    )
    return rows.sort((a, b) => {
      switch (sort) {
        case 'date_desc':   return +new Date(b.created_at) - +new Date(a.created_at)
        case 'date_asc':    return +new Date(a.created_at) - +new Date(b.created_at)
        case 'amount_desc': return b.total - a.total
        case 'amount_asc':  return a.total - b.total
      }
    })
  }, [invoices, query, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageSafe   = Math.min(Math.max(1, page), totalPages)
  const slice      = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize)

  function copyText(txt: string) {
    navigator.clipboard.writeText(txt).catch(() => {})
  }

  function downloadCsv(rows: Invoice[]) {
    const header = ['Invoice','Email','Value','Created','Status','PDF']
    const lines = rows.map(r => [
      r.id,
      r.email ?? '',
      r.total.toFixed(2),
      new Date(r.created_at).toISOString(),
      r.pdf_url ? 'Ready' : 'Pending',
      r.pdf_url ?? '',
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href     = url
    a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="bg-white border border-gray-200 shadow-sm rounded-lg p-6">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center w-full md:w-1/3">
            <input
              type="text"
              placeholder="🔍 Search invoice # or email…"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="sort" className="text-sm text-gray-600">Sort by</label>
              <select
                id="sort"
                value={sort}
                onChange={e => setSort(e.target.value as any)}
                className="border border-gray-300 rounded-md px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date_desc">Date ↓</option>
                <option value="date_asc">Date ↑</option>
                <option value="amount_desc">Value ↓</option>
                <option value="amount_asc">Value ↑</option>
              </select>
            </div>
            <button
              onClick={load}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => downloadCsv(filtered)}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              ⬇️ Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
            Error: {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No invoices yet.</p>
            <button
              onClick={() => (location.href = '/create')}
              className="px-4 py-2 bg-blue-600 text-white rounded-md"
            >
              Create invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['#','Invoice','Email','Value','Created','Status','PDF','Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-left font-semibold">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((inv, i) => {
                  const idx = (pageSafe - 1) * pageSize + i + 1
                  const hasPdf = Boolean(inv.pdf_url)
                  const date = new Date(inv.created_at)
                  return (
                    <tr key={inv.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-500">{idx}</td>
                      <td className="px-4 py-2 font-mono flex items-center gap-2">
                        {inv.id}
                        <button onClick={() => copyText(inv.id)} className="text-gray-500 hover:text-gray-700">
                          📄
                        </button>
                      </td>
                      <td className="px-4 py-2 flex items-center gap-1">
                        ✉️
                        <span className="truncate">{inv.email ?? '—'}</span>
                      </td>
                      <td className="px-4 py-2 text-right">{`£${inv.total.toFixed(2)}`}</td>
                      <td className="px-4 py-2">
                        <div>{date.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">{timeAgo(date)}</div>
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full ${
                            hasPdf
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {hasPdf ? 'Ready' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {hasPdf ? (
                          <a href={inv.pdf_url!} target="_blank" rel="noopener" className="underline">
                            Open
                          </a>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2 flex items-center gap-2">
                        <button className="hover:text-gray-700" title="Resend">🔄</button>
                        <button className="hover:text-gray-700" title="View PDF">👁️</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > pageSize && (
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-gray-600">
              Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pageSafe === 1}
                className="px-3 py-1 border rounded-md disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm">{pageSafe} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={pageSafe === totalPages}
                className="px-3 py-1 border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}
