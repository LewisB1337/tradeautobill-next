// app/create/page.tsx
'use client'

import UsageMeter from '../components/UsageMeter'
import { useEffect, useRef, useState } from 'react'

type Item = { description: string; qty: number; unitPrice: number; vatRate: number }

type InvoicePayload = Record<string, any> & {
  items: Item[]
}

export default function Page() {
  const [daily, setDaily] = useState({ used: 0, limit: 3 })
  const [monthly, setMonthly] = useState({ used: 0, limit: 10 })
  const [items, setItems] = useState<Item[]>([{ description: '', qty: 1, unitPrice: 0, vatRate: 20 }])
  const formRef = useRef<HTMLFormElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [invoiceSent, setInvoiceSent] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/usage')
        if (!r.ok) return
        const u = await r.json()
        setDaily({ used: u.dailyUsed, limit: u.dailyLimit })
        setMonthly({ used: u.monthlyUsed, limit: u.monthlyLimit })
      } catch {}
    })()
  }, [])

  const totals = items.reduce(
    (acc, it) => {
      const line = (it.qty || 0) * (it.unitPrice || 0)
      const v = line * ((it.vatRate || 0) / 100)
      acc.sub += line
      acc.vat += v
      return acc
    },
    { sub: 0, vat: 0 }
  )
  const grand = totals.sub + totals.vat

  function updateItem(i: number, patch: Partial<Item>) {
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function removeItem(i: number) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }
  function addItem() {
    setItems(prev => [...prev, { description: '', qty: 1, unitPrice: 0, vatRate: 20 }])
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    setJobId(null)
    setInvoiceSent(false)

    try {
      const formData = Object.fromEntries(new FormData(formRef.current!).entries())
      const payload: InvoicePayload = { ...formData, items }

      const r = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const text = await r.text()
      let json: any = {}
      try {
        json = text ? JSON.parse(text) : {}
      } catch (parseErr) {
        console.warn('Failed to parse /api/invoice response as JSON:', parseErr, 'raw:', text)
      }

      if (!r.ok) {
        console.error('Invoice API error', r.status, text)
        throw new Error(json?.error || `Invoice API failed: ${r.status}`)
      }

      const returnedJobId =
        json.jobId ??
        json.jobID ??
        json.job?.jobId ??
        json.job?.jobID ??
        json.id ??
        null

      if (!returnedJobId) {
        console.error('No jobId returned from /api/invoice response', json)
        throw new Error('No jobId returned')
      }

      setJobId(returnedJobId)
      setInvoiceSent(true)

      window.history.replaceState({}, '', `/status/${encodeURIComponent(returnedJobId)}`)
    } catch (err: any) {
      console.error('Invoice submit error', err)
      setSubmitError(err?.message || 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="container py-10">
      <header className="row">
        <h1 style={{ margin: 0 }}>Create invoice</h1>
        <span className="pill" id="tier">
          Free
        </span>
      </header>
      <UsageMeter daily={daily} monthly={monthly} />

      <form ref={formRef} onSubmit={submit} className="space-y-6">
        <fieldset>
          <legend>Business</legend>
          <div className="grid-2" style={{ gap: 8 }}>
            <input name="businessName" placeholder="Business name" required />
            <input name="businessEmail" type="email" placeholder="billing@you.co.uk" required />
          </div>
          <div className="grid-2" style={{ gap: 8, marginTop: 8 }}>
            <input name="businessAddress" placeholder="Address" />
            <input name="vatNumber" placeholder="VAT number (optional)" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Customer</legend>
          <div className="grid-2" style={{ gap: 8 }}>
            <input name="customerName" placeholder="Customer name" required />
            <input name="customerEmail" type="email" placeholder="customer@their.com" required />
          </div>
          <input name="customerAddress" placeholder="Address (optional)" style={{ marginTop: 8 }} />
        </fieldset>

        <fieldset>
          <legend>Invoice details</legend>
          <div className="grid-2" style={{ gap: 8 }}>
            <input name="invoiceNumber" placeholder="INV-2025-0001" required />
            <input name="invoiceDate" type="date" required />
            <input name="dueDate" type="date" required />
            <input name="poNumber" placeholder="PO number (optional)" />
          </div>
          <textarea name="notes" placeholder="Notes (optional)" style={{ marginTop: 8 }}></textarea>
        </fieldset>

        <fieldset>
          <legend>Line items</legend>
          <table className="data">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit £</th>
                <th>VAT %</th>
                <th className="num">Line £</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => {
                const line = (it.qty || 0) * (it.unitPrice || 0)
                const v = line * ((it.vatRate || 0) / 100)
                return (
                  <tr key={i}>
                    <td>
                      <input
                        value={it.description}
                        onChange={e => updateItem(i, { description: e.target.value })}
                        placeholder="Description"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={it.qty}
                        onChange={e => updateItem(i, { qty: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={it.unitPrice}
                        onChange={e => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="1"
                        value={it.vatRate}
                        onChange={e => updateItem(i, { vatRate: parseFloat(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="num">£{(line + v).toFixed(2)}</td>
                    <td>
                      <button type="button" className="btn btn-link" onClick={() => removeItem(i)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button type="button" className="btn btn-secondary" onClick={addItem} style={{ marginTop: 8 }}>
            Add item
          </button>
        </fieldset>

        <section className="card" id="totals">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Subtotal</strong>
            <span>£{totals.sub.toFixed(2)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>VAT</strong>
            <span>£{totals.vat.toFixed(2)}</span>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', fontSize: '1.25rem' }}>
            <strong>Total</strong>
            <span>£{grand.toFixed(2)}</span>
          </div>
        </section>

        {submitError && (
          <div style={{ color: 'red', marginBottom: 6 }}>
            <strong>Error:</strong> {submitError}
          </div>
        )}

        <div className="row" style={{ marginTop: 12, gap: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invoice'}
          </button>
          <a className="btn btn-secondary" href="/pricing">
            Remove watermark & lift limits
          </a>
        </div>
      </form>

      {/* Confirmation */}
      {invoiceSent && (
        <div style={{ marginTop: 32 }}>
          <h2>Invoice status</h2>
          <p style={{ color: 'green' }}>✅ Invoice sent.</p>
          {jobId && (
            <p style={{ fontSize: '0.9rem' }}>
              Job ID: <code>{jobId}</code>
            </p>
          )}
        </div>
      )}
    </section>
  )
}
