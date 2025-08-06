// app/api/invoices/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 1) Auth
    const sb = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    if (authErr) return NextResponse.json({ ok: false, error: authErr.message }, { status: 500 })
    if (!user)   return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

    // 2) Fetch only what we need
    const { data, error } = await sb
      .from('invoices')
      .select(`
        invoice_num,
        created_at,
        pdf_url,
        customer_email,
        total
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    // 3) Shape response so "id" equals the invoice number
    const invoices = (data ?? []).map((row: any) => ({
      id: row.invoice_num,            // <- ID is the INV number
      created_at: row.created_at,
      pdf_url: row.pdf_url,
      email: row.customer_email ?? null,
      total: Number(row.total ?? 0),
    }))

    return NextResponse.json({ ok: true, invoices })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 })
  }
}
