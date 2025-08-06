import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

export const runtime = 'nodejs'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
const SIGNING_SECRET  = (process.env.N8N_SIGNING_SECRET || '').trim()

function hmac(raw: string) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(raw).digest('hex')
}

export async function POST(req: NextRequest) {
  if (!N8N_WEBHOOK_URL) return NextResponse.json({ error: 'Server not configured: N8N_WEBHOOK_URL is missing' }, { status: 500 })
  if (!SIGNING_SECRET)  return NextResponse.json({ error: 'Server not configured: N8N_SIGNING_SECRET is missing' }, { status: 500 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (!body?.customerEmail || !Array.isArray(body?.items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // normalize
  body.items = body.items.map((it: any) => ({
    id: it.id ?? null,
    description: it.description ?? '',
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
  }))

  const raw = JSON.stringify(body)
  const sig = hmac(raw)
  console.log('[invoice] sig(first12)=', sig.slice(0,12), 'len=', raw.length)

  try {
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hmac-signature': sig, // single header
      },
      body: raw,
    })
    const text = await upstream.text()
    if (!upstream.ok) {
      console.error('[invoice] upstream error', upstream.status, text.slice(0,500))
      return NextResponse.json({ error: 'Upstream error', status: upstream.status, detail: text }, { status: 502 })
    }
    try { return NextResponse.json(JSON.parse(text)) } catch { return new NextResponse(text, { status: 200 }) }
  } catch (e: any) {
    console.error('Exception calling n8n:', e?.message || e)
    return NextResponse.json({ error: 'Server exception', message: String(e) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    hasN8N: !!N8N_WEBHOOK_URL,
    hasSignSecret: !!SIGNING_SECRET,
    secretLen: SIGNING_SECRET.length || 0,
  })
}
