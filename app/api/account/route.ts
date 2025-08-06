// app/api/account/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

// Per-tier limits
const PLAN_LIMITS: Record<string, { daily: number | null; monthly: number | null }> = {
  Free:    { daily: 3,  monthly: 10 },
  Starter: { daily: 20, monthly: 500 },
  Pro:     { daily: 50, monthly: 1000 },
  Business:{ daily: null, monthly: null }, // unlimited
}

function startOfUTCDay(d = new Date())   { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0,0,0,0)) }
function startOfUTCMonth(d = new Date()) { return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0,0,0,0)) }

function mapToTier(input?: string | null): string | null {
  if (!input) return null
  const s = input.toLowerCase()
  if (s.includes('business')) return 'Business'
  if (s.includes('pro'))      return 'Pro'
  if (s.includes('starter'))  return 'Starter'
  if (s.includes('basic'))    return 'Starter'
  if (s.includes('free'))     return 'Free'
  if (s.includes('standard')) return 'Starter'
  return null
}

export async function GET() {
  try {
    const sb = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr) return NextResponse.json({ ok: false, error: authErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // ---- 1) profiles.tier (ONLY) ----
    let tier: string | null = null
    let renewsAt: string | null = null

    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('tier')                // do NOT select renews_at (it doesn't exist)
      .eq('id', user.id)
      .maybeSingle()

    if (pErr && pErr.code !== 'PGRST116') {
      // ignore "no rows" type errors; only bail on real errors
      return NextResponse.json({ ok: false, error: pErr.message }, { status: 500 })
    }
    if (profile?.tier) tier = profile.tier

    // ---- 2) If no explicit tier, infer from Stripe subscription → price → product ----
    if (!tier) {
      const { data: sub } = await sb
        .from('subscriptions')
        .select('status, current_period_end, price_id')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (sub) {
        renewsAt = sub.current_period_end ?? null

        let lookup_key: string | null = null
        let nickname:   string | null = null
        let product_id: string | null = null

        if (sub.price_id) {
          const { data: price } = await sb
            .from('prices')
            .select('lookup_key, nickname, product_id')
            .eq('id', sub.price_id)
            .maybeSingle()

          lookup_key = price?.lookup_key ?? null
          nickname   = price?.nickname ?? null
          product_id = price?.product_id ?? null
        }

        let product_name: string | null = null
        if (product_id) {
          const { data: product } = await sb
            .from('products')
            .select('name')
            .eq('id', product_id)
            .maybeSingle()
          product_name = product?.name ?? null
        }

        tier =
          mapToTier(lookup_key) ||
          mapToTier(nickname)   ||
          mapToTier(product_name) ||
          'Pro' // active sub but unknown naming → treat as Pro
      }
    }

    if (!tier) tier = 'Free'

    // ---- 3) Usage (UTC) ----
    const todayStart = startOfUTCDay()
    const monthStart = startOfUTCMonth()

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
      today: { count: countToday ?? 0,  limit: limits.daily },
      month: { count: countMonth ?? 0,  limit: limits.monthly },
    }

    return NextResponse.json({ ok: true, plan: { tier, renewsAt }, usage })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
