// app/api/invoices/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// required env
const SUPABASE_URL    = process.env.SUPABASE_URL!;
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  // 1) Auth
  const userClient = createRouteHandlerClient({ cookies });
  const {
    data: { user },
    error: authErr,
  } = await userClient.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2) Supabase admin client
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 3) Fetch all invoices for this user, newest first
  const { data: invoices, error: fetchErr } = await admin
    .from('invoices')
    .select(`
      id,
      created_at,
      invoice_number,
      customer,
      totals
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (fetchErr) {
    return NextResponse.json(
      { error: fetchErr.message },
      { status: 500 }
    );
  }

  // 4) Map to the shape DashboardPage expects
  const result = (invoices || []).map((inv) => ({
    id:        inv.id,
    sent_at:   inv.created_at,
    // note: your column is invoice_number not invoice_num
    invoice_num: inv.invoice_number,
    customer:  inv.customer,   // assuming { name, email }
    totals:    inv.totals,     // assuming { grandTotal, currency }
  }));

  return NextResponse.json(result);
}
