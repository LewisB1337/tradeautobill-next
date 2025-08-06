// app/api/usage/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  // 1) Auth
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Call your Postgres RPC `get_usage_counts(p_user)`
  //    It should return { daily_count, monthly_count, daily_limit, monthly_limit }
  const { data, error: rpcError } = await supabase
    .rpc('get_usage_counts', { p_user: user.id });

  if (rpcError) {
    console.error('Usage RPC error', rpcError);
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
