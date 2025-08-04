// components/WorkflowRunner.tsx
'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  jobId: string
}

type JobStatus = {
  job?: {
    jobId?: string
    status?: string
    [key: string]: any
  }
  error?: string
}

export default function WorkflowRunner({ jobId }: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)
  const [manualMode, setManualMode] = useState(false)

  useEffect(() => {
    if (!jobId) return
    let cancelled = false

    async function tick() {
      if (!jobId) return
      try {
        const res = await fetch(`/api/status/${encodeURIComponent(jobId)}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`Status fetch failed: ${res.status} ${text}`)
        }
        const json: JobStatus = await res.json()
        if (cancelled) return
        setDetail(json)
        const s = json.job?.status || 'unknown'
        setStatus(s)
        if (s === 'completed' || s === 'failed') {
          // stop polling
          return
        }
        pollRef.current = window.setTimeout(tick, 2000)
      } catch (e: any) {
        if (cancelled) return
        console.error('Polling error', e)
        setError(e.message)
        pollRef.current = window.setTimeout(tick, 4000)
      }
    }

    tick()
    return () => {
      cancelled = true
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
  }, [jobId])

  // Simulate completion (for debug)
  async function markComplete() {
    if (!jobId) return
    await fetch('/api/job-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId, status: 'completed' }),
    })
    // immediately refresh
    setManualMode(true)
    setTimeout(() => {
      setManualMode(false)
    }, 500)
  }

  return (
    <div className="card" style={{ padding: 16, position: 'relative' }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>Job ID:</strong> {jobId}
        </div>
        <div>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              // retrigger polling manually
              setStatus(null)
              setError(null)
              setDetail(null)
              setManualMode(prev => !prev)
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div>
          <strong>Status:</strong>{' '}
          {status ? (
            <span>{status}</span>
          ) : (
            <span style={{ fontStyle: 'italic' }}>loading…</span>
          )}
        </div>
        {error && (
          <div style={{ color: 'crimson', marginTop: 4 }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        {detail && (
          <pre
            style={{
              background: '#f5f5f5',
              padding: 8,
              marginTop: 8,
              maxHeight: 200,
              overflow: 'auto',
              fontSize: 12,
            }}
          >
            {JSON.stringify(detail, null, 2)}
          </pre>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-secondary" onClick={markComplete}>
          Simulate completion
        </button>
      </div>
    </div>
  )
}
