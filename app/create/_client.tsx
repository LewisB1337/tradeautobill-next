'use client'
import React from 'react'

export default function CreateForm() {
  // … your existing state hooks for business, customer, items, vatRate, subTotal, vatAmount, grandTotal, currency

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // 1) Build the exact payload shape your API expects
    const invoiceData = {
      business,       // { name, email, address, vatNumber }
      customer,       // { name, email, address }
      items,          // Array<{ id, description, quantity, unitPrice }>
      vatRate,        // number
      totals: {       // { subTotal, vatAmount, grandTotal, currency }
        subTotal,
        vatAmount,
        grandTotal,
        currency,
      },
    }

    // 2) Log it so you can inspect in the browser console
    console.log('>>> Sending invoice payload:', invoiceData)

    try {
      const res = await fetch('/api/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(invoiceData),
      })

      if (res.status === 401) {
        // your existing redirect or auth logic
        return
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      alert('Invoice submitted')
    } catch (err) {
      console.error('Failed to submit invoice:', err)
      alert('Failed to submit invoice')
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* … your existing form inputs and “Submit Invoice” button … */}
      <button type="submit">Submit Invoice</button>
    </form>
  )
}
