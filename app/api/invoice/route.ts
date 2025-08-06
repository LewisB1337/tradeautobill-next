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
function json(body: any, status = 200) {
  return NextResponse.json(body, { status })
}

function hmacHex(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

// Normalize incoming payload (keep it simple; pass through fields you need)
function normalizePayload(raw: any) {
  const business      = raw?.business ?? {}
  const customer      = raw?.customer ?? {}
  const itemsIn       = Array.isArray(raw?.items) ? raw.items : []
  const items         = itemsIn.map((it: any) => ({
    description: String(it?.description ?? ''),
    quantity:    Number(it?.quantity ?? it?.qty ?? 0),
    unitPrice:   Number(it?.unitPrice ?? it?.price ?? 0),
  }))

  const subtotal = items.reduce((s: number, it: any) => s + (it.quantity * it.unitPrice), 0)
  const taxRate  = Number(raw?.taxRate ?? 0)
  const tax      = +(subtotal * (taxRate / 100)).toFixed(2)
  const total    = +(subtotal + tax).toFixed(2)

  return {
    business,
    customer,
    items,
    meta: {
      // keep whatever you had before if needed; not persisted in DB in this minimal schema
      invoiceNumber: raw?.meta?.invoiceNumber ?? null,
      notes: raw?.meta?.notes ?? '',
      taxRate,
    },
    totals: { subtotal, tax, total },
  }
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let stage = 'start'
  try {
    // 1) Auth as the end-user
    stage = 'auth'
    const userClient = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authErr } = await userClient.auth.getUser()
    if (authErr) return json({ ok: false, stage, error: authErr.message }, 500)
    if (!user)   return json({ ok: false, stage, error: 'Unauthorized' }, 401)

    // 2) Parse and normalize input
    stage = 'parse'
    const raw = await req.json().catch(() => ({}))
    const norm = normalizePayload(raw)

    // 3) Kick n8n workflow (optional, if configured)
    stage = 'n8n'
    let n8nJson: any = null
    let n8nText = ''
    if (N8N_URL) {
      const outBody = JSON.stringify({ ...norm, userId: user.id })
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (SIGN_SECRET) headers['x-signature'] = hmacHex(SIGN_SECRET, outBody)

      const res = await fetch(N8N_URL, {
        method: 'POST',
        headers,
        body: outBody,
      })
      n8nText = await res.text().catch(() => '')
      try { n8nJson = n8nText ? JSON.parse(n8nText) : null } catch {}
      if (!res.ok) {
        return json({ ok: false, stage, error: `n8n ${res.status}`, detail: n8nText }, 502)
      }
    }

    // 4) Persist invoice record (minimal schema)
    stage = 'db.insertInvoice'
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    const pdfUrl = n8nJson?.pdfUrl ?? null

    const invRec = {
      user_id: user.id,
      pdf_url: pdfUrl,     // only columns that actually exist
      // created_at is defaulted by DB
    }

    const { error: invErr } = await admin.from('invoices').insert(invRec)
    if (invErr) {
      // Don’t fail the whole request if history insert fails; log and continue
      console.error('[invoice] history insert error', invErr)
    }

    // 5) Done
    stage = 'done'
    return json({
      ok: true,
      stage,
      jobId: n8nJson?.jobId ?? null,
      pdfUrl: pdfUrl ?? null,
      n8n: n8nJson ?? n8nText || null,
    }, 200)

  } catch (e: any) {
    const err = typeof e === 'object' ? (e?.message ?? JSON.stringify(e)) : String(e)
    return json({ ok: false, stage, error: err }, 500)
  }
}
