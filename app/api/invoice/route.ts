// app/api/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Required env (server-only):
 * - N8N_WEBHOOK_URL=<your n8n webhook prod URL>   (alias: N8N_INVOICE_WEBHOOK is supported too)
 * - N8N_HMAC_SECRET=<shared secret with n8n Code node> (optional; if present we send x-hub-signature)
 *
 * And your existing public Supabase env vars for client; not needed here.
 */

function makeSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        },
      },
    }
  )
}

export async function POST(req: NextRequest) {
  // 1) Auth (cookie-based via @supabase/ssr)
  const supabase = makeSupabaseServer()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr) {
    console.error('[invoice] auth error:', authErr)
  }
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Read payload from client
  let payload: any
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Enrich with metadata
  const bodyForN8n = {
    ...payload,
    userId: user.id,
    source: 'nextjs-invoice',
    submittedAt: new Date().toISOString(),
  }

  // 3) Env + HMAC
  const n8nUrl =
    process.env.N8N_WEBHOOK_URL ||
    process.env.N8N_INVOICE_WEBHOOK // support your older var name as a fallback
  const secret = process.env.N8N_HMAC_SECRET || ''

  if (!n8nUrl) {
    return NextResponse.json({ error: 'Missing N8N_WEBHOOK_URL' }, { status: 500 })
  }

  const raw = JSON.stringify(bodyForN8n)
  let headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (secret) {
    const signature = crypto.createHmac('sha256', secret)
      .update(Buffer.from(raw, 'utf8'))
      .digest('hex')
    headers['x-hub-signature'] = signature
  }

  // 4) Call n8n webhook
  let n8nText = ''
  let n8nJson: any = null
  try {
    const res = await fetch(n8nUrl, {
      method: 'POST',
      headers,
      body: raw,
      cache: 'no-store',
    })

    n8nText = await res.text()
    try {
      n8nJson = n8nText ? JSON.parse(n8nText) : null
    } catch {
      n8nJson = null
    }

    if (!res.ok) {
      // Bubble up n8n error details
      return NextResponse.json(
        { error: `n8n error ${res.status}`, n8n: n8nJson ?? n8nText },
        { status: 502 }
      )
    }
  } catch (e: any) {
    console.error('[invoice] n8n request failed:', e)
    return NextResponse.json({ error: e.message || 'n8n request failed' }, { status: 502 })
  }

  // 5) Extract jobId from array or object responses
  const pickJobId = (o: any) =>
    o?.jobId ?? o?.job?.jobId ?? o?.id ?? o?.executionId ?? null

  const candidate = Array.isArray(n8nJson) ? n8nJson[0] : n8nJson
  const jobId = pickJobId(candidate)

  if (!jobId) {
    console.error('[invoice] no jobId from n8n. Response:', n8nJson ?? n8nText)
    return NextResponse.json(
      { error: 'No jobId from n8n', n8n: n8nJson ?? n8nText },
      { status: 502 }
    )
  }

  // (Optional) Seed a jobs table so /api/status can read immediately
  // await supabase.from('workflow_jobs').upsert({
  //   job_id: jobId,
  //   status: 'in_progress',
  //   updated_at: new Date().toISOString(),
  //   user_id: user.id
  // })

  // 6) Return jobId to the browser
  return NextResponse.json({ ok: true, jobId }, { status: 200 })
}
