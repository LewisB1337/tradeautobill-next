'use client'

import { useEffect, useState } from 'react'

type Usage = {
  today:  { count: number; limit: number | null }
  month:  { count: number; limit: number | null }
}
type Plan = { tier: string; renewsAt: string | null }

export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [plan,    setPlan]    = useState<Plan | null>(null)
  const [usage,   setUsage]   = useState<Usage | null>(null)

  async function load() {
    setLoading(true); setError(null)
    try {
      const res  = await fetch('/api/account', { cache: 'no-store' })
      const json = await res.json()
      if (!res.ok || !json.ok) throw new Error(json?.error || `HTTP ${res.status}`)
      setPlan(json.plan)
      setUsage(json.usage)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      {error && (
        <div className="p-3 border rounded bg-red-50 text-red-700">
          Error: {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Plan card */}
        <div className="border rounded-xl p-4">
          <div className="text-lg font-medium mb-1">Your plan</div>
          {loading ? (
            <div className="h-6 w-24 bg-gray-100 rounded" />
          ) : plan ? (
            <>
              <div className="text-sm">Tier: <span className="font-medium">{plan.tier}</span></div>
              <div className="text-sm">
                Renews: {plan.renewsAt ? new Date(plan.renewsAt).toLocaleDateString() : '—'}
              </div>
              <div className="mt-3">
                <a
                  href="/api/billing/portal"
                  className="inline-block px-3 py-2 rounded border hover:bg-gray-50"
                >
                  Manage subscription
                </a>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600">No plan data.</div>
          )}
        </div>

        {/* Usage card */}
        <div className="border rounded-xl p-4">
          <div className="text-lg font-medium mb-3">Usage</div>
          {loading || !usage ? (
            <div className="space-y-3">
              <div className="h-5 bg-gray-100 rounded" />
              <div className="h-5 bg-gray-100 rounded" />
            </div>
          ) : (
            <div className="space-y-4">
              <UsageBar label="Today"  count={usage.today.count}  limit={usage.today.limit} />
              <UsageBar label="This month" count={usage.month.count} limit={usage.month.limit} />
            </div>
          )}
        </div>
      </div>

      {/* Business profile (your existing form can stay below here) */}
      {/* ... keep your existing profile form component here ... */}
    </div>
  )
}

function UsageBar({ label, count, limit }: { label: string; count: number; limit: number | null }) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((count / limit) * 100)) : null
  const barStyle = pct === null ? 'bg-gray-200' : pct >= 100 ? 'bg-red-500' : 'bg-green-500'
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-700">{label}</div>
      <div className="w-full h-2 rounded bg-gray-100 overflow-hidden">
        <div
          className={`h-2 ${barStyle}`}
          style={{ width: `${pct ?? 100}%` }}
          aria-valuemin={0}
          aria-valuemax={limit ?? 0}
          aria-valuenow={count}
          role="progressbar"
        />
      </div>
      <div className="text-xs text-gray-600">
        {limit === null ? `${count} / Unlimited` : `${count} / ${limit} (${pct}%)`}
      </div>
    </div>
  )
}
