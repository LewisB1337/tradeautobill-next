// app/api/invoice/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export const runtime = 'nodejs'

// ── Env vars ───────────────────────────────────────────────────────────────────
const SUPABASE_URL    = process.env.SUPABASE_URL             || ''
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const N8N_URL         = process.env.N8N_WEBHOOK_URL           || ''
const SIGN_SECRET     = process.env.N8N_SIGNING_SECRET        || ''

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(body: any, status = 200) { return NextResponse.json(body, { status }) }
function hmacHex(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}
const num = (v: any): number => {
  if (v === null || v === undefined) return 0
  if (typeof v === 'number') return isFinite(v) ? v : 0
  const n = parseFloat(String(v).replace(/[, ]/g, ''))
  return isFinite(n) ? n : 0
}

// Accept a bunch of input shapes and compute totals robustly
function normalizePayload(raw: any) {
  const invoiceNumber =
    raw?.meta?.invoiceNumber ??
    raw?.invoiceNumber ??
    raw?.invoice_num ??
    raw?.invoiceId ??
    raw?.number ??
    null

  const customerEmail =
    raw?.customerEmail ??
    raw?.customer?.email ??
    raw?.email ??
    null

  // Try to find line items under several common keys
  const candidates = [
    raw?.items, raw?.lineItems, raw?.lines, raw?.rows
  ].find(a => Array.isArray(a)) as any[] | undefined

  const items: { description: string; quantity: number; unitPrice: number; lineTotal: number }[] =
    (candidates ?? []).map((it: any) => {
      const qty = num(it?.quantity ?? it?.qty)
      const unitPrice = num(it?.unitPrice ?? it?.price ?? it?.unit_price)
      // prefer explicit line-total if present; else qty*unitPrice
      const explicitLine = num(it?.total ?? it?.line_total ?? it?.amount)
      const lineTotal = explicitLine || +(qty * unitPrice).toFixed(2)
      return {
        description: String(it?.description ?? it?.name ?? ''),
        quantity: qty,
        unitPrice,
        lineTotal,
      }
    })

  // Compute subtotal from lines if any; otherwise try flat totals on root/meta
  const sumLines = items.reduce((s, it) => s + num(it.lineTotal), 0)
  const taxRate  = num(raw?.taxRate ?? raw?.meta?.taxRate)
  const providedSubtotal = num(raw?.subtotal ?? raw?.totals?.subtotal)
  const providedTax      = num(raw?.tax ?? raw?.totals?.tax)
  const providedTotal    = num(raw?.total ?? raw?.amount ?? raw?.grand_total ?? raw?.totals?.total)

  const subtotal = (items.length > 0 ? sumLines : (providedSubtotal || (providedTotal && !providedTax ? providedTotal : 0)))
  const tax      = providedTax || +(subtotal * (taxRate/100)).toFixed(2)
  const total    = providedTotal || +(subtotal + tax).toFixed(2)

  return {
    invoiceNumber,
    customerEmail,
    items,
    totals: { subtotal, tax, total },
    meta: {
      notes: raw?.meta?.notes ?? '',
      taxRate,
    }
  }
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let stage = 'start'
  try {
    // 1) Auth
    stage = 'auth'
    const userClient = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr) return json({ ok: false, stage, error: authErr.message }, 500)
    if (!user)   return json({ ok: false, stage, error: 'Unauthorized' }, 401)

    // 2) Parse & normalize
    stage = 'parse'
    const raw  = await req.json().catch(() => ({}))
    const norm = normalizePayload(raw)
    const invNum = String(norm.invoiceNumber ?? '').trim()
    if (!invNum) return json({ ok: false, stage, error: 'invoiceNumber is required' }, 400)

    // Optional format guard: comment out if you don’t want to enforce shape
    // if (!/^INV-\d{4}-\d{4}$/.test(invNum)) {
    //   return json({ ok: false, stage, error: 'invoiceNumber must look like INV-YYYY-####' }, 400)
    // }

    // 3) Optional: n8n workflow
    stage = 'n8n'
    let n8nJson: any = null
    let n8nText = ''
    if (N8N_URL) {
      const outBody = JSON.stringify({ ...norm, userId: user.id, invoiceNumber: invNum })
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (SIGN_SECRET) headers['x-signature'] = hmacHex(SIGN_SECRET, outBody)
      const res = await fetch(N8N_URL, { method: 'POST', headers, body: outBody })
      n8nText = await res.text().catch(() => '')
      try { n8nJson = n8nText ? JSON.parse(n8nText) : null } catch {}
      if (!res.ok) return json({ ok: false, stage, error: `n8n ${res.status}`, detail: n8nText }, 502)
    }

    // 4) Persist
    stage = 'db.insertInvoice'
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // Pre-check duplicate per user
    const { count: existsCount, error: existsErr } = await admin
      .from('invoices').select('id', { head: true, count: 'exact' })
      .eq('user_id', user.id).eq('invoice_num', invNum)
    if (existsErr) return json({ ok: false, stage, error: existsErr.message }, 500)
    if ((existsCount ?? 0) > 0) return json({ ok: false, stage, error: 'Invoice number already exists', code: 'DUPLICATE' }, 409)

    const pdfUrl = n8nJson?.pdfUrl ?? null
    const invRec = {
      user_id:        user.id,
      invoice_num:    invNum,
      customer_email: norm.customerEmail || null,
      total:          num(norm.totals.total),     // <- robust
      pdf_url:        pdfUrl,
    }

    const { data: inserted, error: invErr } = await admin
      .from('invoices')
      .insert(invRec)
      .select('invoice_num, created_at, pdf_url, customer_email, total')
      .single()

    if (invErr) {
      // @ts-ignore code may exist on error
      if (invErr.code === '23505') return json({ ok: false, stage, error: 'Invoice number already exists', code: 'DUPLICATE' }, 409)
      return json({ ok: false, stage, error: invErr.message }, 500)
    }

    stage = 'done'
    return json({
      ok: true,
      stage,
      jobId:  n8nJson?.jobId ?? null,
      pdfUrl: inserted?.pdf_url ?? null,
      n8n:    n8nJson ?? (n8nText || null),
      invoice: {
        id: inserted?.invoice_num,
        email: inserted?.customer_email ?? null,
        total: num(inserted?.total),
        created_at: inserted?.created_at,
        pdf_url: inserted?.pdf_url ?? null,
      },
    }, 200)

  } catch (e: any) {
    const err = typeof e === 'object' ? (e?.message ?? JSON.stringify(e)) : String(e)
    return json({ ok: false, stage, error: err }, 500)
  }
}
