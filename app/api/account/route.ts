// app/api/account/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

// Map your plan names -> limits here
const PLAN_LIMITS: Record<string, { daily: number | null; monthly: number | null }> = {
  Free: { daily: 3, monthly: 10 },
  Pro:  { daily: 50, monthly: 1000 },
  // Add more tiers as you introduce them
}

function startOfUTCDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0))
}
function startOfUTCMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0))
}

function mapPriceToTier(input?: string | null): string | null {
  if (!input) return null
  const key = String(input).toLowerCase()
  // map either Stripe price lookup keys or IDs to your tier names
  if (key.includes('pro'))  return 'Pro'
  if (key.includes('free')) return 'Free'
  return null
}

export async function GET() {
  try {
    const sb = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr) return NextResponse.json({ ok: false, error: authErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // --- Determine tier & renewal date ---
    let tier: string | null = null
    let renewsAt: string | null = null

    // Try profiles table first (if you keep tier/renewal there)
    const { data: profile } = await sb
      .from('profiles')
      .select('tier, renews_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.tier) {
      tier = profile.tier
      renewsAt = profile.renews_at ?? null
    } else {
      // Try subscriptions table (Stripe-style)
      const { data: sub } = await sb
        .from('subscriptions')
        .select('status, current_period_end, price_id, price_lookup_key')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sub) {
        tier = mapPriceToTier(sub.price_lookup_key || sub.price_id) ?? 'Pro' // default to Pro if active
        renewsAt = sub.current_period_end ?? null
      }
    }

    if (!tier) tier = 'Free' // fallback

    // --- Usage from invoices table ---
    const todayStart  = startOfUTCDay()
    const monthStart  = startOfUTCMonth()

    const { count: countToday,  error: ctErr } = await sb
      .from('invoices')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', todayStart.toISOString())

    if (ctErr) return NextResponse.json({ ok: false, error: ctErr.message }, { status: 500 })

    const { count: countMonth, error: cmErr } = await sb
      .from('invoices')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())

    if (cmErr) return NextResponse.json({ ok: false, error: cmErr.message }, { status: 500 })

    const limits = PLAN_LIMITS[tier] ?? PLAN_LIMITS.Free
    const usage = {
      today: {
        count: countToday ?? 0,
        limit: limits.daily, // null means unlimited
      },
      month: {
        count: countMonth ?? 0,
        limit: limits.monthly, // null means unlimited
      },
    }

    return NextResponse.json({
      ok: true,
      plan: { tier, renewsAt },
      usage,
      meta: {
        // clarify that counts are computed in UTC to avoid confusion
        tz: 'UTC',
        todayStart: todayStart.toISOString(),
        monthStart: monthStart.toISOString(),
      },
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
