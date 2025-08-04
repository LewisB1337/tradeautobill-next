import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUserFromRequest } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Item = { description: string; qty: number; unitPrice: number; vatRate: number }
type InvoicePayload = Record<string, any> & { items: Item[] }

function sign(body: unknown) {
  const json = JSON.stringify(body)
  const hmac = crypto.createHmac('sha256', process.env.N8N_HMAC_SECRET!)
  hmac.update(json)
  return hmac.digest('hex')
}

// TODO: Replace with real lookup (profiles table / Stripe)
async function getTierForUser(_userId: string): Promise<'free'|'standard'|'pro'> {
  return 'free'
}

export async function POST(req: Request) {
  // 1) Auth
  const { user } = await getUserFromRequest()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Parse/validate
  let body: InvoicePayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body?.customerEmail || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // 3) Usage gating
  const tier = await getTierForUser(user.id)
  const { error: rpcError } = await supabaseAdmin.rpc('check_and_increment_usage', {
    p_user: user.id,
    p_tier: tier
  })
  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 429 })
  }

  // 4) Forward to n8n with HMAC
  const forward = { userId: user.id, tier, invoice: body }
  const sig = sign(forward)

  const res = await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-hmac-signature': sig
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
