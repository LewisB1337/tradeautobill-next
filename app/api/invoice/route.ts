// app/api/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs' // ensure Node runtime for crypto + env

// Env vars
const N8N_WEBHOOK_URL    = process.env.N8N_WEBHOOK_URL
const SIGNING_SECRET     = (process.env.N8N_SIGNING_SECRET  || '').trim()

// Helper: HMAC-SHA256
function hmac(raw: string) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(raw).digest('hex')
}

export async function POST(req: NextRequest) {
  // 1) Config checks
  if (!N8N_WEBHOOK_URL) {
    return NextResponse.json({ error: 'Server not configured: N8N_WEBHOOK_URL missing' }, { status: 500 })
  }
  if (!SIGNING_SECRET) {
    return NextResponse.json({ error: 'Server not configured: N8N_SIGNING_SECRET missing' }, { status: 500 })
  }

  // 2) Authenticate user via Supabase cookie
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 3) Parse incoming JSON
  let body: any
  try {
    body = await req.json()
  } catch (err) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 4) Shape validation
  if (!body?.customerEmail || !Array.isArray(body?.items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // 5) Usage RPC: enforce tier limits
  const tier = user.app_metadata?.tier || 'free'
  const { error: usageErr } = await supabase
    .rpc('check_and_increment_usage', {
      p_user:  user.id,
      p_tier:  tier
    })

  if (usageErr) {
    // 429 on limit reached
    return NextResponse.json({ error: usageErr.message }, { status: 429 })
  }

  // 6) Normalize and attach userId
  body.userId = user.id
  body.tier   = tier
  body.items  = body.items.map((it: any) => ({
    id:          it.id ?? null,
    description: it.description ?? '',
    quantity:    Number(it.quantity)  || 0,
    unitPrice:   Number(it.unitPrice) || 0,
  }))

  // 7) HMAC-sign and forward to n8n
  const raw = JSON.stringify(body)
  const sig = hmac(raw)
  console.log('[invoice] sig=', sig.slice(0,12), 'len=', raw.length)

  try {
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-hmac-signature':  sig,
      },
      body: raw,
    })

    const text = await upstream.text()

    if (!upstream.ok) {
      console.error('[invoice] upstream error', upstream.status, text.slice(0,500))
      return NextResponse.json(
        { error: 'Upstream error', status: upstream.status, detail: text },
        { status: 502 }
      )
    }

    // Return n8n’s response
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return new NextResponse(text, { status: 200 })
    }
  } catch (err: any) {
    console.error('❌ Exception calling n8n:', err?.message || err)
    return NextResponse.json({ error: 'Server exception', message: String(err) }, { status: 500 })
  }
}

// GET probe (verify env + auth)
export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  return NextResponse.json({
    hasN8N:       !!N8N_WEBHOOK_URL,
    hasSignSecret: !!SIGNING_SECRET,
    secretLen:    SIGNING_SECRET.length || 0,
    user:         user ? { id: user.id, tier: user.app_metadata?.tier } : null,
  })
}
