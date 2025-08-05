// app/api/status/[jobId]/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(
  req: Request,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  // Lookup the status record
  const { data, error } = await supabaseAdmin
    .from('invoice_status')
    .select('status, pdf_url')
    .eq('job_id', jobId)
    .single()

  if (error || !data) {
    // If not found, treat as still pending or failed
    return NextResponse.json({ status: 'working', pdfUrl: null })
  }

  return NextResponse.json({
    status: data.status,        // 'queued' | 'working' | 'sent' | 'failed'
    pdfUrl: data.pdf_url ?? null,
  })
}
