import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const url = process.env.SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!url || !key) {
      return NextResponse.json(
        { ok:false, stage:'env', error:'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 200 }
      );
    }

    const admin = createClient(url, key, { auth: { persistSession: false } });

    // Lightest possible existence check for the table
    const { count, error } = await admin
      .from('usage')
      .select('id', { head: true, count: 'exact' })
      .limit(0);

    if (error) {
      return NextResponse.json({ ok:false, stage:'usage.count', error: error.message }, { status: 200 });
    }
    return NextResponse.json({ ok:true, usage_count_test: count ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok:false, stage:'catch', error: String(e) }, { status: 200 });
  }
}
