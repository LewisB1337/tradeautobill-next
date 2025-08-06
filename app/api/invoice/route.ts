// app/api/invoice/route.ts
import { NextRequest, NextResponse } from 'next/server'

// If you call an upstream like n8n, set this in Netlify env
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL

export const runtime = 'nodejs' // ensure Node runtime on Netlify

export async function POST(req: NextRequest) {
  let body: any

  // --- Parse body
  try {
    body = await req.json()
  } catch (err) {
    console.error('❌ Invalid JSON:', err)
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('<<< /api/invoice received payload:', JSON.stringify(body))

  // --- Minimal validation (matches what your UI now sends)
  if (!body?.customerEmail || !Array.isArray(body.items)) {
    console.error('❌ Invalid payload shape:', {
      hasCustomerEmail: !!body?.customerEmail,
      itemsIsArray: Array.isArray(body.items),
    })
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Optional: normalize item numbers (defensive)
  body.items = body.items.map((it: any) => ({
    description: it.description ?? '',
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    id: it.id ?? null,
  }))

  // --- Call upstream (if configured)
  if (!N8N_WEBHOOK_URL) {
    console.error('❌ Missing env N8N_WEBHOOK_URL')
    return NextResponse.json(
      { error: 'Server not configured: N8N_WEBHOOK_URL is missing' },
      { status: 500 }
    )
  }

  try {
    const upstreamRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await upstreamRes.text()

    if (!upstreamRes.ok) {
      console.error('❌ Upstream error', upstreamRes.status, text.slice(0, 500))
      return NextResponse.json(
        { error: 'Upstream error', status: upstreamRes.status, detail: text },
        { status: 502 }
      )
    }

    console.log('✅ Upstream success', text.slice(0, 500))
    // pass upstream JSON/text back to client
    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      return new NextResponse(text, { status: 200 })
    }
  } catch (err: any) {
    console.error('❌ Exception calling upstream:', err?.message || err)
    return NextResponse.json(
      { error: 'Server exception', message: String(err) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ ok: true })
}
