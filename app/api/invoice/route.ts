// app/api/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'

export const runtime = 'nodejs'

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL
const RAW_SECRET = process.env.N8N_SIGNING_SECRET || ''
const SIGNING_SECRET = RAW_SECRET.trim() // kill whitespace

function hmac(raw: string) {
  return crypto.createHmac('sha256', SIGNING_SECRET).update(raw).digest('hex')
}

export async function POST(req: NextRequest) {
  if (!N8N_WEBHOOK_URL) {
    return NextResponse.json({ error: 'Server not configured: N8N_WEBHOOK_URL is missing' }, { status: 500 })
  }
  if (!SIGNING_SECRET) {
    return NextResponse.json({ error: 'Server not configured: N8N_SIGNING_SECRET is missing' }, { status: 500 })
  }

  let body: any
  try { body = await req.json() }
  catch (e) { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // minimal validation
  if (!body?.customerEmail || !Array.isArray(body?.items)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const raw = JSON.stringify(body)
  const sig = hmac(raw)
  console.log('HMAC sig (first 12):', sig.slice(0, 12), ' bodyLen:', raw.length)

  try {
    const upstream = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // send BOTH casings to satisfy any header normalization
        'x-hmac-signature': sig,
        'X-Hmac-Signature': sig,
      },
      body: raw, // sign EXACTLY what you send
    })
    const text = await upstream.text()
    if (!upstream.ok) {
      console.error('Upstream error', upstream.status, text.slice(0, 400))
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
