'use client'

import Head from 'next/head'
import { useEffect, useMemo, useState } from 'react'

type Invoice = {
  id: string           // invoice number
  email: string | null
  total: number
  created_at: string
  pdf_url: string | null
}
type PlanResp = { ok: boolean; plan: { tier: string } }

export default function DashboardPage() {
  const [tier, setTier] = useState<string>('Standard')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'date_desc'|'date_asc'|'amount_desc'|'amount_asc'>('date_desc')
  const [page, setPage] = useState(1)
  const pageSize = 12

  useEffect(() => {
    ;(async () => {
      try {
        const [acctR, invR] = await Promise.all([
          fetch('/api/account', { cache: 'no-store' }),
          fetch('/api/invoices', { cache: 'no-store' })
        ])
        if (acctR.ok) {
          const a: PlanResp = await acctR.json()
          if (a?.ok && a.plan?.tier) setTier(a.plan.tier)
        }
        const j = await invR.json()
        if (!invR.ok || !j.ok) throw new Error(j?.error || `HTTP ${invR.status}`)
        setInvoices(j.invoices || [])
      } catch (e: any) {
        setError(e?.message ?? String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    let rows = invoices
    if (query) {
      rows = rows.filter(r =>
        r.id.toLowerCase().includes(query) ||
        (r.email ?? '').toLowerCase().includes(query)
      )
    }
    rows = [...rows].sort((a,b) => {
      switch (sort) {
        case 'date_desc':   return +new Date(b.created_at) - +new Date(a.created_at)
        case 'date_asc':    return +new Date(a.created_at) - +new Date(b.created_at)
        case 'amount_desc': return (b.total ?? 0) - (a.total ?? 0)
        case 'amount_asc':  return (a.total ?? 0) - (b.total ?? 0)
      }
    })
    return rows
  }, [invoices, q, sort])

  const nextPage = filtered.length > page * pageSize ? page + 1 : null
  const slice = filtered.slice(0, page * pageSize)

  return (
    <>
      <Head>
        <title>Dashboard — Tradeautobill</title>
        <meta name="description" content="List and manage your invoices." />
        <meta name="theme-color" content="#0066FF" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
      </Head>

      <div className="container py-10">
        <header className="row" style={{ alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          <span className="pill">{tier}</span>
        </header>

        <div className="row" style={{ margin: '12px 0' }}>
          <input
            id="q"
            placeholder="Search email or invoice #"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1) }}
          />
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="date_desc">Date ↓</option>
            <option value="date_asc">Date ↑</option>
            <option value="amount_desc">Total ↓</option>
            <option value="amount_asc">Total ↑</option>
          </select>
        </div>

        <section className="card" style={{ padding: 0 }}>
          {loading ? (
            <div className="card" style={{ border: 0 }}>
              Loading…
            </div>
          ) : error ? (
            <div className="card" style={{ borderColor: '#f3b4b4', background: '#fff8f8' }}>
              <strong>Error:</strong> {error}
            </div>
          ) : slice.length === 0 ? (
            <div className="card" style={{ border: 0 }}>
              <p className="muted">No invoices yet.</p>
            </div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                  <th className="num"></th>
                </tr>
              </thead>
              <tbody>
                {slice.map((it) => {
                  const ready = Boolean(it.pdf_url)
                  return (
                    <tr key={`${it.id}-${it.created_at}`}>
                      <td>{new Date(it.created_at).toLocaleDateString()}</td>
                      <td className="font-mono">{it.id}</td>
                      <td>{it.email ?? '—'}</td>
                      <td className="num">£{Number(it.total ?? 0).toFixed(2)}</td>
                      <td>
                        <span className="pill" style={{ background: ready ? '#F0FFF4' : '#FFFDF0', borderColor: '#E6E6E6' }}>
                          {ready ? 'Ready' : 'Pending'}
                        </span>
                      </td>
                      <td className="num">
                        {ready && (
                          <a className="btn btn-link" target="_blank" rel="noopener" href={it.pdf_url!}>
                            Download
                          </a>
                        )}
                        <button
                          className="btn btn-link"
                          onClick={() => navigator.clipboard.writeText(it.id).catch(()=>{})}
                        >
                          Copy #
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        <nav className="row" style={{ marginTop: 12 }}>
          {nextPage && (
            <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>
              Next
            </button>
          )}
        </nav>
      </div>

      {/* ---- Same design system as the HTML mocks ---- */}
      <style jsx global>{styles}</style>
    </>
  )
}

const styles = `
:root{
  --color-bg:#FFFFFF; --color-text:#111; --color-muted:#444;
  --color-accent:#0066FF; --color-border:#E6E6E6; --color-soft:#F7F9FF;
  --spacing:8px; --font-body:'Inter',sans-serif; --font-heading:'Space Grotesk',sans-serif;
  --radius:10px; --shadow:0 6px 24px rgba(0,0,0,0.06);
}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);line-height:1.5}
h1{font-family:var(--font-heading);font-size:2rem;margin:0 0 16px}
a{color:var(--color-accent);text-decoration:none}
.container{max-width:1140px;margin:0 auto;padding:0 16px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.card{border:1px solid var(--color-border);border-radius:12px;padding:18px;background:#fff;box-shadow:var(--shadow)}
.btn{display:inline-flex;align-items:center;justify-content:center;font-weight:700;border:none;border-radius:10px;cursor:pointer}
.btn-secondary{background:#fff;color:var(--color-text);padding:12px 16px;border:1px solid var(--color-border)}
.btn-link{background:none;border:none;padding:0;color:var(--color-accent);cursor:pointer}
.pill{display:inline-block;padding:4px 10px;border-radius:999px;border:1px solid var(--color-border);font-size:.9rem}
.data{width:100%;border-collapse:collapse;border-top-left-radius:12px;border-top-right-radius:12px;overflow:hidden}
.data th,.data td{padding:10px;border-top:1px solid var(--color-border);text-align:left}
.data thead th{background:#F8F9FB}
.num{text-align:right}
.font-mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace}
@media (max-width: 960px){
  .row input, .row select { flex: 1 1 100% }
}
`;
