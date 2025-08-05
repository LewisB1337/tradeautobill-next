// app/api/status-callback/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: Request) {
  let body: { jobId: string; status: string; pdfUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { jobId, status, pdfUrl } = body
  if (!jobId || !status) {
    return NextResponse.json({ error: 'Missing jobId or status' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('invoice_status')
    .upsert({
      job_id: jobId,
      status,
      pdf_url: pdfUrl ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'job_id' })

  if (error) {
    console.error('Status callback error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
