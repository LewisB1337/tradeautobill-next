import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const { data: { user }, error: uerr } = await supabase.auth.getUser();
    if (uerr) return NextResponse.json({ ok: false, error: 'Auth error' }, { status: 401 });
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    const { data, error } = await supabase
      .from('invoices')
      .select('id,email,total,created_at,pdf_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      // PostgREST/RLS errors show up here; don’t 500 the whole page
      console.error('invoices select error', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, invoices: data ?? [] }, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/invoices fatal', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
