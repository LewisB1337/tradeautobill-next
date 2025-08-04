// app/api/invoice/route.ts
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getTierForUser } from '@/lib/tiers'

// helper to HMAC-sign the body
function sign(body: unknown) {
  const json = JSON.stringify(body)
  return crypto.createHmac('sha256', process.env.N8N_HMAC_SECRET!).update(json).digest('hex')
}

export async function POST(req: Request) {
  // 1) Authenticate
  const { user } = await getUserFromRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Parse & validate
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body?.customerEmail || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // 3) Determine the real tier and enforce usage
  const tier = await getTierForUser(user.id)
  const { error: rpcError } = await supabaseAdmin.rpc('check_and_increment_usage', {
    p_user: user.id,
    p_tier: tier,
  })
  if (rpcError) {
    // rpcError.message will be 'Daily free limit reached', etc.
    return NextResponse.json({ error: rpcError.message }, { status: 429 })
  }

  // 4) Forward to n8n, signed with your secret
  const forward = { userId: user.id, tier, invoice: body }
  const sig = sign(forward)

  const res = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hmac-signature': sig,
    },
    body: JSON.stringify(forward),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return NextResponse.json({ error: `Upstream error (${res.status}) ${text}` }, { status: 502 })
  }

  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: 200 })
}
