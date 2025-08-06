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

async function countUsage(
  admin: ReturnType<typeof createClient>,
  userId: string,
  sinceISO: string
) {
  // Try column "user" (quoted in SQL) then fallback to "user_id"
  let { count, error } = await admin
    .from('usage')
    .select('id', { head: true, count: 'exact' })
    .eq('user', userId)
    .gte('created_at', sinceISO);

  if (error) {
    // Fallback to user_id
    const r2 = await admin
      .from('usage')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', sinceISO);
    if (r2.error) {
      throw new Error(
        `countUsage failed: ${JSON.stringify({ err1: error, err2: r2.error })}`
      );
    }
    count = r2.count!;
  }

  return count ?? 0;
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
    const dailyCount = await countUsage(admin, user.id, dayAgo);

    stage = 'query.monthly';
    const monthlyCount = await countUsage(admin, user.id, monthAgo);

    stage = 'tier';
    const tier = (user.app_metadata?.tier as string) || 'free';
    let daily_limit = 3, monthly_limit = 10;
    if (tier === 'standard') { daily_limit = 25;  monthly_limit = 200; }
    if (tier === 'pro')      { daily_limit = 100; monthly_limit = 1000; }

    return json({
      ok: true,
      stage: 'done',
      daily_count: dailyCount,
      monthly_count: monthlyCount,
      daily_limit,
      monthly_limit,
      tier,
    });
  } catch (e: any) {
    // Properly serialize the error
    const err = typeof e === 'object' ? JSON.stringify(e) : String(e);
    return json({ ok: false, stage, error: err }, 500);
  }
}
