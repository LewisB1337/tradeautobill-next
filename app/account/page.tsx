'use client'

import Head from 'next/head'
import { useEffect, useState } from 'react'

type Plan = { tier: string; renewsAt: string | null }
type Usage = {
  today:  { count: number; limit: number | null }
  month:  { count: number; limit: number | null }
}
type ApiAccount = { ok: boolean; plan: Plan; usage: Usage }

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [plan,    setPlan]    = useState<Plan>({ tier: 'Free', renewsAt: null })
  const [usage,   setUsage]   = useState<Usage>({
    today: { count: 0, limit: 3 },
    month: { count: 0, limit: 10 },
  })

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/account', { cache: 'no-store' })
        const j: ApiAccount = await r.json()
        if (!r.ok || !j.ok) throw new Error((j as any)?.error || `HTTP ${r.status}`)
        setPlan(j.plan)
        setUsage(j.usage)
      } catch (e: any) {
        setError(e?.message ?? String(e))
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const dailyPct  = pct(usage.today.count, usage.today.limit)
  const monthPct  = pct(usage.month.count, usage.month.limit)

  return (
    <>
      <Head>
        <title>Account — Tradeautobill</title>
        <meta name="description" content="Manage your plan, usage and profile." />
        <meta name="theme-color" content="#0066FF" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&family=Space+Grotesk:wght@700&display=swap" rel="stylesheet" />
      </Head>

      <div className="container py-10">
        <h1>Account</h1>

        {error && (
          <div className="card" style={{ borderColor: '#f3b4b4', background: '#fff8f8' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="grid-2">
          <div className="card">
            <h2>Your plan</h2>
            {loading ? (
              <p className="muted">Loading…</p>
            ) : (
              <>
                <p>Tier: <strong id="tier">{plan.tier}</strong></p>
                <p>Renews: <span id="renews">{plan.renewsAt ? new Date(plan.renewsAt).toLocaleDateString() : '—'}</span></p>
                <a href="/api/billing/portal" className="btn btn-secondary">Manage subscription</a>
              </>
            )}
          </div>

          <div className="card">
            <h2>Usage</h2>

            <div className="meter" aria-label="Usage today">
              <span className="tiny">Today:&nbsp;
                <strong>{usage.today.count}</strong> /
                <span>{usage.today.limit ?? '∞'}</span>
              </span>
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={usage.today.limit ?? 0} aria-valuenow={usage.today.count}>
                <span style={{ width: `${dailyPct}%` }} />
              </div>
              <span className="tiny">{dailyPct}%</span>
            </div>

            <div className="meter" aria-label="Usage this month">
              <span className="tiny">Month:&nbsp;
                <strong>{usage.month.count}</strong> /
                <span>{usage.month.limit ?? '∞'}</span>
              </span>
              <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={usage.month.limit ?? 0} aria-valuenow={usage.month.count}>
                <span style={{ width: `${monthPct}%` }} />
              </div>
              <span className="tiny">{monthPct}%</span>
            </div>
          </div>
        </div>

        {/* Business profile (visual only – hook to your existing handlers if needed) */}
        <form className="card" style={{ marginTop: 16 }} onSubmit={(e) => e.preventDefault()}>
          <h2>Business profile</h2>
          <div className="grid-2">
            <input name="businessName" placeholder="Business name" />
            <input name="businessEmail" type="email" placeholder="you@business.co.uk" />
            <input name="businessAddress" placeholder="Address" />
            <input name="vatNumber" placeholder="VAT number" />
          </div>
          <label>Logo <input type="file" name="logo" accept="image/*" /></label>
          <div className="row" style={{ marginTop: 8 }}><button className="btn btn-primary" type="submit">Save</button></div>
        </form>

        <form className="card" style={{ marginTop: 16 }} onSubmit={(e) => e.preventDefault()}>
          <h2>Email preferences</h2>
          <label><input type="checkbox" name="marketing_opt_in" /> Receive product updates</label>
          <div className="row" style={{ marginTop: 8 }}><button className="btn btn-secondary" type="submit">Save</button></div>
        </form>

        <button className="btn btn-link" style={{ marginTop: 12 }} onClick={() => (location.href = '/logout')}>Log out</button>
      </div>

      {/* ---- Design system from the HTML mocks ---- */}
      <style jsx global>{styles}</style>
    </>
  )
}

function pct(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

const styles = `
:root{
  --color-bg:#FFFFFF; --color-text:#111; --color-muted:#444;
  --color-accent:#0066FF; --color-border:#E6E6E6; --color-soft:#F7F9FF;
  --spacing:8px; --font-body:'Inter',sans-serif; --font-heading:'Space Grotesk',sans-serif;
  --radius:10px; --shadow:0 6px 24px rgba(0,0,0,0.06);
}
*,*::before,*::after{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--color-bg);color:var(--color-text);font-family:var(--font-body);line-height:1.5}
h1{font-family:var(--font-heading);font-size:2rem;margin:0 0 16px}
h2{font-size:1.1rem;margin:0 0 8px}
a{color:var(--color-accent);text-decoration:none}
.container{max-width:1140px;margin:0 auto;padding:0 16px}
.row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.card{border:1px solid var(--color-border);border-radius:12px;padding:18px;background:#fff;box-shadow:var(--shadow)}
.btn{display:inline-flex;align-items:center;justify-content:center;font-weight:700;border:none;border-radius:10px;cursor:pointer}
.btn-primary{background:var(--color-accent);color:#fff;padding:12px 16px}
.btn-secondary{background:#fff;color:var(--color-text);padding:12px 16px;border:1px solid var(--color-border)}
.btn-link{background:none;border:none;padding:0;color:var(--color-accent);cursor:pointer}
.muted{color:#555}
.tiny{font-size:.85rem}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.meter{display:flex;gap:12px;align-items:center;margin:8px 0}
.bar{flex:1;height:10px;background:#eee;border-radius:8px;overflow:hidden}
.bar > span{display:block;height:100%;background:var(--color-accent);width:0}
form input, form select, form textarea{width:100%;padding:12px 14px;border:1px solid var(--color-border);border-radius:8px}
@media (max-width: 960px){ .grid-2{grid-template-columns:1fr} }
`;
