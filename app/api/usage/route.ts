// app/api/usage/route.ts
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const FREE_LIMITS = { daily: 3, monthly: 10 }  // match your RPC

export async function GET() {
  const { user } = await getUserFromRequest()
  if (!user) {
    return NextResponse.json({
      dailyUsed: 0,
      dailyLimit: FREE_LIMITS.daily,
      monthlyUsed: 0,
      monthlyLimit: FREE_LIMITS.monthly,
      tier: 'free',
    })
  }

  const userId = user.id
  // Count today’s usage
  const { count: dailyCount, error: todayErr } = await supabaseAdmin
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('user_id', userId)

  // Count this month’s usage
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const { count: monthlyCount, error: monthErr } = await supabaseAdmin
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart.toISOString())
    .eq('user_id', userId)

  if (todayErr || monthErr) {
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
  }

  return NextResponse.json({
    dailyUsed: dailyCount || 0,
    dailyLimit: FREE_LIMITS.daily,
    monthlyUsed: monthlyCount || 0,
    monthlyLimit: FREE_LIMITS.monthly,
    tier: 'free',
  })
}
