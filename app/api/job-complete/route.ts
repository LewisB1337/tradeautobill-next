// app/api/job-complete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { jobId?: string; status?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { jobId, status } = body
  if (!jobId || !status) {
    return NextResponse.json({ error: 'Missing jobId or status' }, { status: 400 })
  }

  const { error } = await supabase
    .from('workflow_jobs')
    .upsert({
      job_id: jobId,
      status,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    console.error('[job-complete] upsert error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
