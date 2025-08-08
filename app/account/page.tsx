'use client'

import Head from 'next/head'
import { useEffect, useState } from 'react'
import ManageSubscriptionButton from "@/components/ManageSubscriptionButton";

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
  const [usage,   setUsage]   = useState<Usage>({ today: { count: 0, limit: 3 }, month: { count: 0, limit: 10 } })

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
                <ManageSubscriptionButton />
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

      <style jsx global>{styles}</style>
    </>
  )
}

function pct(used: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

const styles = `/* … keep your CSS … */`
