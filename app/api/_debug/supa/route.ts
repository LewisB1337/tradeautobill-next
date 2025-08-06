import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) {
    return NextResponse.json({ ok:false, stage:'env', error:'SUPABASE_URL or SERVICE_ROLE missing' }, { status:500 });
  }

  try {
    const admin = createClient(url, key, { auth: { persistSession: false } });
    const { count, error } = await admin.from('usage').select('id', { head:true, count:'exact' }).limit(0);
    if (error) return NextResponse.json({ ok:false, stage:'usage.count', error:error.message }, { status:500 });
    return NextResponse.json({ ok:true, usage_count_test: count ?? 0 });
  } catch (e:any) {
    return NextResponse.json({ ok:false, stage:'catch', error: e?.message || String(e) }, { status:500 });
  }
}
