'use client'

import { useEffect, useMemo, useState } from 'react'

// ---- Types coming from /api/invoices ----
type Invoice = {
  id: string            // invoice_num exposed by API as "id"
  created_at: string
  pdf_url: string | null
  email: string | null
  total: number
}

// ---- Helpers ----
const GBP = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
function fmtMoney(n: number) { return GBP.format(Number.isFinite(n) ? n : 0) }
function fmtDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString()
}
function relative(iso: string) {
  const d = new Date(iso).getTime()
  const diff = Date.now() - d
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])

  // UI state
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'created_desc' | 'created_asc' | 'amount_desc' | 'amount_asc'>('created_desc')
  const [page, setPage] = useState(1)
  const pageSize = 10

  async function load() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/invoices', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      setInvoices(json.invoices || [])
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // derived
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = invoices
    if (q) {
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q)
      )
    }
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'created_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'created_asc':  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'amount_desc':  return (b.total ?? 0) - (a.total ?? 0)
        case 'amount_asc':   return (a.total ?? 0) - (b.total ?? 0)
      }
    })
    return rows
  }, [invoices, query, sort])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const pageSafe = Math.min(Math.max(1, page), totalPages)
  const slice = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize)

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {})
  }

  // ---- Render ----
  return (
    <div className="mx-auto max-w-6xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3 py-2 rounded border hover:bg-gray-50"
            aria-label="Refresh"
          >
            Refresh
          </button>
          <button
            onClick={() => downloadCsv(filtered)}
            className="px-3 py-2 rounded border hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <input
          value={query}
          onChange={(e) => { setPage(1); setQuery(e.target.value) }}
          placeholder="Search by invoice # or email…"
          className="w-full md:w-80 border rounded px-3 py-2"
        />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort</label>
          <select
            className="border rounded px-2 py-2"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="amount_desc">Amount high → low</option>
            <option value="amount_asc">Amount low → high</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <TableSkeleton />
      ) : error ? (
        <div className="p-4 border rounded text-red-700 bg-red-50">Error: {error}</div>
      ) : filtered.length === 0 ? (
        <EmptyState onCreate={() => location.assign('/create')} />
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Invoice</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Value</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">PDF</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((inv, i) => {
                const idx = (pageSafe - 1) * pageSize + i + 1
                const hasPdf = Boolean(inv.pdf_url)
                return (
                  <tr key={`${inv.id}-${inv.created_at}`} className="border-t hover:bg-gray-50/60">
                    <td className="px-4 py-2 text-gray-500">{idx}</td>
                    <td className="px-4 py-2 font-mono">
                      <div className="flex items-center gap-2">
                        <span>{inv.id}</span>
                        <button
                          onClick={() => copy(inv.id)}
                          className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                          title="Copy invoice number"
                        >
                          Copy
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-2">{inv.email ?? <span className="text-gray-400">—</span>}</td>
                    <td className="px-4 py-2">{fmtMoney(inv.total)}</td>
                    <td className="px-4 py-2">
                      <div className="flex flex-col">
                        <span>{fmtDate(inv.created_at)}</span>
                        <span className="text-xs text-gray-500">{relative(inv.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {hasPdf ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 border border-green-200">
                          Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {hasPdf ? (
                        <a
                          href={inv.pdf_url!}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Open
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => resend(inv)}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                        >
                          Resend
                        </button>
                        <button
                          onClick={() => view(inv)}
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-100"
                        >
                          View
                        </button>
                      </div>
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
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-600">
            Showing {(pageSafe - 1) * pageSize + 1}–{Math.min(pageSafe * pageSize, filtered.length)} of {filtered.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-sm">Page {pageSafe} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Dumb action stubs: wire these to your real flows when ready ----
async function resend(inv: Invoice) {
  // TODO: call your resend endpoint
  alert(`Resend invoice ${inv.id} to ${inv.email ?? 'unknown email'}`)
}
function view(inv: Invoice) {
  // TODO: route to an invoice detail page when you have one
  if (inv.pdf_url) window.open(inv.pdf_url, '_blank')
}

// ---- CSV Export ----
function downloadCsv(rows: Invoice[]) {
  const header = ['Invoice','Email','Total','Created','Status','PDF']
  const lines = rows.map(r => [
    r.id,
    r.email ?? '',
    r.total,
    new Date(r.created_at).toISOString(),
    r.pdf_url ? 'Ready' : 'Pending',
    r.pdf_url ?? ''
  ]
  // ↓ replaceAll removed; regex works on older lib targets
  .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
  .join(','))
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `invoices-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ---- Skeleton / Empty components ----
function TableSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="h-4 w-1/3 bg-gray-100 rounded" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-9 w-full bg-gray-50 rounded" />
      ))}
    </div>
  )
}
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="p-8 border rounded-lg text-center space-y-3">
      <div className="text-lg font-medium">No invoices yet</div>
      <div className="text-gray-600">Create your first invoice to see it here.</div>
      <button onClick={onCreate} className="px-4 py-2 rounded bg-black text-white">
        Create invoice
      </button>
    </div>
  )
}
