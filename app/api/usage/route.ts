// app/api/usage/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  // 1) Require env
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json(
      { error: 'Server not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
      { status: 500 }
    );
  }

  // 2) Get logged-in user from cookie (user context only)
  const userClient = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 3) Admin client (bypasses RLS) to read usage counts safely on the server
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const userId = user.id;
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Count last 24h
  const { count: dailyCount, error: dailyErr } = await admin
    .from('usage')
    .select('id', { head: true, count: 'exact' })
    .eq('user', userId)
    .gte('created_at', dayAgo);

  if (dailyErr) {
    console.error('[usage] daily error:', dailyErr);
    return NextResponse.json({ error: dailyErr.message }, { status: 500 });
  }

  // Count last ~30 days
  const { count: monthlyCount, error: monthlyErr } = await admin
    .from('usage')
    .select('id', { head: true, count: 'exact' })
    .eq('user', userId)
    .gte('created_at', monthAgo);

  if (monthlyErr) {
    console.error('[usage] monthly error:', monthlyErr);
    return NextResponse.json({ error: monthlyErr.message }, { status: 500 });
  }

  // Limits by tier
  const tier = (user.app_metadata?.tier as string) || 'free';
  let dailyLimit = 3;
  let monthlyLimit = 10;
  if (tier === 'standard') { dailyLimit = 25; monthlyLimit = 200; }
  if (tier === 'pro')      { dailyLimit = 100; monthlyLimit = 1000; }

  return NextResponse.json({
    daily_count: dailyCount ?? 0,
    monthly_count: monthlyCount ?? 0,
    daily_limit: dailyLimit,
    monthly_limit: monthlyLimit,
    tier,
  });
}
