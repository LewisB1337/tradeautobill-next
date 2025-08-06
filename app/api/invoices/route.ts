// app/api/invoices/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  try {
    // 1) Authenticate
    const supa = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authErr,
    } = await supa.auth.getUser();
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 401 });
    if (!user)   return NextResponse.json({ error: 'Unauthorized' },    { status: 401 });

    // 2) Fetch their invoices
    const { data, error } = await supa
      .from('invoices')
      .select('id, invoice_num, sent_at, totals')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 3) Return them
    return NextResponse.json(data, { status: 200 });

  } catch (e: any) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
