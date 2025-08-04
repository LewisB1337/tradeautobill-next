// app/api/usage/route.ts
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getTierForUser } from '@/lib/tiers'

type Usage = { dailyUsed: number; dailyLimit: number | null; monthlyUsed: number; monthlyLimit: number | null; tier: string }

export async function GET() {
  const { user } = await getUserFromRequest()
  // Unauthenticated users count as free with zero usage
  const userId = user?.id ?? null

  // 1) Determine tier
  const tier = userId ? await getTierForUser(userId) : 'free'

  // 2) Map tier → limits
  const LIMITS: Record<string, { daily: number | null; monthly: number | null }> = {
    free:     { daily: 3,    monthly: 10 },
    standard: { daily: 50,   monthly: 200 },
    pro:      { daily: null, monthly: null }, // unlimited
  }
  const { daily: dailyLimit, monthly: monthlyLimit } = LIMITS[tier] ?? LIMITS.free

  // 3) Count usage
  let dailyUsed = 0, monthlyUsed = 0
  if (userId) {
    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const today = await supabaseAdmin
      .from('usage')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sinceDay)
      .eq('user_id', userId)
    if (!today.error) dailyUsed = today.count ?? 0

    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const thisMonth = await supabaseAdmin
      .from('usage')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthStart.toISOString())
      .eq('user_id', userId)
    if (!thisMonth.error) monthlyUsed = thisMonth.count ?? 0
  }

  const result: Usage = {
    dailyUsed,
    dailyLimit,
    monthlyUsed,
    monthlyLimit,
    tier,
  }
  return NextResponse.json(result)
}
