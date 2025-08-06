// app/api/invoices/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

// Avoid TS generic mismatch headaches
type AnySupabase = SupabaseClient<any, any, any>;

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return json({ ok: false, error: 'Supabase admin env not set' }, 500);
    }

    // 1) Get the logged-in user from cookies
    const userClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr) return json({ ok: false, error: authErr.message }, 500);
    if (!user)   return json({ ok: false, error: 'Unauthorized' }, 401);

    // 2) Admin client for reading invoices
    const admin: AnySupabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    // 3) Read everything so we can normalize regardless of exact schema
    const { data: rows, error } = await admin
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    // 4) Normalize to the stable shape the dashboard expects
    const invoices = (rows ?? []).map((inv: any) => ({
      id: inv.id,
      sent_at:
        inv.created_at ??
        inv.inserted_at ??
        inv.created ??
        null,

      // Be tolerant of different column names / nested meta
      invoice_num:
        inv.invoice_number ??
        inv.invoice_num ??
        inv.number ??
        inv.meta?.invoiceNumber ??
        '',

      customer_name:
        inv.customer?.name ??
        inv.customer_name ??
        '',

      customer_email:
        inv.customer?.email ??
        inv.customer_email ??
        '',

      total:
        inv.totals?.grandTotal ??
        inv.totals?.total ??
        inv.total ??
        null,

      currency:
        inv.totals?.currency ??
        inv.currency ??
        'GBP',

      pdf_url:
        inv.pdf_url ??
        inv.meta?.pdfUrl ??
        null,
    }));

    // 5) Always return the same shape
    return json({ ok: true, invoices });
  } catch (e: any) {
    return json({ ok: false, error: String(e) }, 500);
  }
}
