import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const FREE_LIMITS = { daily: 3, monthly: 10 } // match your RPC logic

export async function GET() {
  const { user } = await getUserFromRequest()
  if (!user) {
    // For logged-out users you can show zero usage but limits for the "Free" tier
    return NextResponse.json({
      dailyUsed: 0,
      dailyLimit: FREE_LIMITS.daily,
      monthlyUsed: 0,
      monthlyLimit: FREE_LIMITS.monthly,
      tier: 'free',
    })
  }

  const userId = user.id

  // Count today
  const { data: todayRows, error: todayErr } = await supabaseAdmin
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('user_id', userId)

  // Count this month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthRows, error: monthErr } = await supabaseAdmin
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart.toISOString())
    .eq('user_id', userId)

  if (todayErr || monthErr) {
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
  }

  return NextResponse.json({
    dailyUsed: todayRows ? (todayRows as any).length ?? 0 : 0,   // head:true + count:'exact' → count is in headers in some clients; fallback length
    dailyLimit: FREE_LIMITS.daily,
    monthlyUsed: monthRows ? (monthRows as any).length ?? 0 : 0,
    monthlyLimit: FREE_LIMITS.monthly,
    tier: 'free',
  })
}
import { NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const FREE_LIMITS = { daily: 3, monthly: 10 } // match your RPC logic

export async function GET() {
  const { user } = await getUserFromRequest()
  if (!user) {
    // For logged-out users you can show zero usage but limits for the "Free" tier
    return NextResponse.json({
      dailyUsed: 0,
      dailyLimit: FREE_LIMITS.daily,
      monthlyUsed: 0,
      monthlyLimit: FREE_LIMITS.monthly,
      tier: 'free',
    })
  }

  const userId = user.id

  // Count today
  const { data: todayRows, error: todayErr } = await supabaseAdmin
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('user_id', userId)

  // Count this month
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data: monthRows, error: monthErr } = await supabaseAdmin
    .from('usage')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart.toISOString())
    .eq('user_id', userId)

  if (todayErr || monthErr) {
    return NextResponse.json({ error: 'Failed to load usage' }, { status: 500 })
  }

  return NextResponse.json({
    dailyUsed: todayRows ? (todayRows as any).length ?? 0 : 0,   // head:true + count:'exact' → count is in headers in some clients; fallback length
    dailyLimit: FREE_LIMITS.daily,
    monthlyUsed: monthRows ? (monthRows as any).length ?? 0 : 0,
    monthlyLimit: FREE_LIMITS.monthly,
    tier: 'free',
  })
}
