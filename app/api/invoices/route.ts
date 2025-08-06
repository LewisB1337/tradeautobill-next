// app/api/invoices/route.ts  
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  // 1) Auth
  const userClient = createRouteHandlerClient({ cookies });
  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Admin client
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // 3) Fetch *all* columns so we can inspect them
  const { data: rows, error } = await admin
    .from('invoices')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 4) Return raw rows for debugging
  return NextResponse.json({ debug: rows });
}
