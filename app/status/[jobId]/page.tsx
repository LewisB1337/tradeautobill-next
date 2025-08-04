'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type JobState = 'queued' | 'working' | 'sent' | 'failed'

export default function StatusPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params
  const [state, setState] = useState<JobState>('queued')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined

    async function poll() {
      try {
        const r = await fetch(`/api/status/${jobId}`)
        if (!r.ok) throw new Error(`status API ${r.status}`)
        const data = await r.json()

        // data.status should be 'queued' | 'working' | 'sent' | 'failed'
        setState(data.status as JobState)
        if (data.pdfUrl) setPdfUrl(data.pdfUrl)

        if (data.status !== 'sent' && data.status !== 'failed') {
          timer = setTimeout(poll, 3000) // poll again in 3 s
        }
      } catch (err) {
        console.error('poll error', err)
        setState('failed')
      }
    }

    poll()
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [jobId])

  return (
    <section className="container py-16">
      <h1>Invoice status</h1>

      {state === 'queued' && <p>🕓 Queued…</p>}
      {state === 'working' && <p>⏳ Generating PDF & sending email…</p>}

      {state === 'sent' && (
        <>
          <p style={{ color: 'green' }}>✅ Email sent!</p>
          {pdfUrl && (
            <p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Download PDF
              </a>
            </p>
          )}
          <p>
            <Link href="/create" className="btn">
              Create another invoice
            </Link>
          </p>
        </>
      )}

      {state === 'failed' && (
        <>
          <p style={{ color: 'red' }}>❌ Something went wrong. Please try again later.</p>
          <p>
            <Link href="/create" className="btn">
              Back to create
            </Link>
          </p>
        </>
      )}
    </section>
  )
}
