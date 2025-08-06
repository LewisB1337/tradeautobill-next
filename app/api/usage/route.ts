// app/api/usage/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ error: 'Server not configured: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing', stage: 'env' }, 500);
    }

    const userClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError) return json({ error: authError.message, stage: 'auth' }, 500);
    if (!user) return json({ error: 'Unauthorized', stage: 'auth' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    const now = Date.now();
    const dayAgo   = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { count: dailyCount, error: dailyErr } = await admin
      .from('usage')
      .select('id', { head: true, count: 'exact' })
      .eq('user', user.id)
      .gte('created_at', dayAgo);

    if (dailyErr) return json({ error: dailyErr.message, stage: 'daily' }, 500);

    const { count: monthlyCount, error: monthlyErr } = await admin
      .from('usage')
      .select('id', { head: true, count: 'exact' })
      .eq('user', user.id)
      .gte('created_at', monthAgo);

    if (monthlyErr) return json({ error: monthlyErr.message, stage: 'monthly' }, 500);

    const tier = (user.app_metadata?.tier as string) || 'free';
    let daily_limit = 3, monthly_limit = 10;
    if (tier === 'standard') { daily_limit = 25; monthly_limit = 200; }
    if (tier === 'pro')      { daily_limit = 100; monthly_limit = 1000; }

    return json({
      daily_count: dailyCount ?? 0,
      monthly_count: monthlyCount ?? 0,
      daily_limit,
      monthly_limit,
      tier,
    });
  } catch (e: any) {
    return json({ error: e?.message || 'Internal error', stage: 'catch' }, 500);
  }
}
