// app/api/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabaseServer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { jobId: string } }) {
  const { jobId } = params
  const supabase = supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('workflow_jobs')
    .select('job_id,status,updated_at')
    .eq('job_id', jobId)
    .single()

  if (error) {
    // if no record yet, treat as in progress
    return NextResponse.json({ job: { jobId, status: 'in_progress' } })
  }

  return NextResponse.json({
    job: {
      jobId: data.job_id,
      status: data.status,
      updatedAt: data.updated_at,
    },
  })
}
