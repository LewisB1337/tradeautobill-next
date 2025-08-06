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
  let stage = 'start';
  try {
    stage = 'env';
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ ok: false, stage, error: 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' }, 500);
    }

    stage = 'auth.getUser';
    const userClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr) return json({ ok: false, stage, error: authErr.message }, 500);
    if (!user)   return json({ ok: false, stage, error: 'Unauthorized' }, 401);

    stage = 'admin.connect';
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    stage = 'query.windows';
    const now = Date.now();
    const dayAgo   = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    stage = 'query.daily';
    const { count: dailyCount, error: dailyErr } = await admin
      .from('usage').select('id', { head: true, count: 'exact' })
      .eq('user', user.id).gte('created_at', dayAgo);
    if (dailyErr) return json({ ok: false, stage, error: dailyErr.message }, 500);

    stage = 'query.monthly';
    const { count: monthlyCount, error: monthlyErr } = await admin
      .from('usage').select('id', { head: true, count: 'exact' })
      .eq('user', user.id).gte('created_at', monthAgo);
    if (monthlyErr) return json({ ok: false, stage, error: monthlyErr.message }, 500);

    stage = 'tier';
    const tier = (user.app_metadata?.tier as string) || 'free';
    let daily_limit = 3, monthly_limit = 10;
    if (tier === 'standard') { daily_limit = 25;  monthly_limit = 200; }
    if (tier === 'pro')      { daily_limit = 100; monthly_limit = 1000; }

    return json({
      ok: true,
      stage: 'done',
      daily_count: dailyCount ?? 0,
      monthly_count: monthlyCount ?? 0,
      daily_limit,
      monthly_limit,
      tier,
    });
  } catch (e: any) {
    return json({ ok: false, stage, error: e?.message || String(e) }, 500);
  }
}
