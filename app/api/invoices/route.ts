// app/api/invoices/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 1) Auth
    const userClient = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr.message }, { status: 500 })
    }
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 2) Fetch invoices for this user
    // we reuse the same handler client (which is scoped to the right cookie/headers)
    const supabase = createRouteHandlerClient({ cookies })
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_num,
        customer,
        totals,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }

    // 3) Return shape { ok: true, invoices: [...] }
    return NextResponse.json({ ok: true, invoices })

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
