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
  const [sort, setSort] = useState<'date_desc'|'date_asc'|'amount_desc'|'amount_asc'>('date_desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/invoices', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`)
      setInvoices(json.invoices)
    } catch (e: any) {
      setError(e.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  // Filter & sort
  const filtered = useMemo(() => {
    let rows = invoices
    const q = query.trim().toLowerCase()
    if (q) {
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
      )
    }
    return rows.sort((a,b) => {
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
  const slice      = filtered.slice((pageSafe-1)*pageSize, pageSafe*pageSize)

  function copyText(text: string) {
    navigator.clipboard.writeText(text).catch(() => {})
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
    ]
    .map(cell => `"${String(cell).replace(/"/g,'""')}"`)
    .join(','))
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-8">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* Toolbar */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="w-full md:w-1/3">
            <input
              type="text"
              placeholder="Search invoice # or email…"
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1) }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="sort" className="self-center text-sm font-medium">Sort by:</label>
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
            <button
              onClick={load}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              Refresh
            </button>
            <button
              onClick={() => downloadCsv(filtered)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
            >
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="bg-white border border-gray-200 shadow-sm rounded-lg p-4 overflow-x-auto">
        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-1/3 bg-gray-200 rounded" />
            {[...Array(5)].map((_,i) => (
              <div key={i} className="h-10 bg-gray-100 rounded" />
            ))}
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded">
            Error: {error}
          </div>
        ) : slice.length === 0 ? (
          <div className="text-center py-12 text-gray-600">
            No invoices yet.
          </div>
        ) : (
          <table className="min-w-full table-auto text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Invoice</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-right">Value</th>
                <th className="px-4 py-2 text-left">Created</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">PDF</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((inv, i) => {
                const idx  = (pageSafe-1)*pageSize + i + 1
                const date = new Date(inv.created_at)
                return (
                  <tr key={inv.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">{idx}</td>
                    <td className="px-4 py-2 font-mono flex items-center gap-2">
                      {inv.id}
                      <button
                        onClick={() => copyText(inv.id)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Copy
                      </button>
                    </td>
                    <td className="px-4 py-2">{inv.email ?? '—'}</td>
                    <td className="px-4 py-2 text-right">£{inv.total.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <div>{date.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">{timeAgo(date)}</div>
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded-full ${
                          inv.pdf_url
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {inv.pdf_url ? 'Ready' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{inv.pdf_url ? <a href={inv.pdf_url!} target="_blank" rel="noopener" className="underline">Open</a> : '—'}</td>
                    <td className="px-4 py-2 flex gap-2">
                      <button onClick={() => load()} className="text-sm text-blue-600 hover:underline">Resend</button>
                      <button onClick={() => inv.pdf_url && window.open(inv.pdf_url)} className="text-sm text-blue-600 hover:underline">View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Pagination */}
      {filtered.length > pageSize && (
        <section className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Showing {(pageSafe-1)*pageSize+1}–{Math.min(pageSafe*pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1,p-1))}
              disabled={pageSafe===1}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">{pageSafe} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages,p+1))}
              disabled={pageSafe===totalPages}
              className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const m    = Math.floor(diff/60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}
