'use client';
export default function Page(){
  async function upgrade(){
    const s = await fetch('/api/session');
    if(s.status===401) return location.href='/login';
    location.href='/account';
  }
  return (
    <section className="container py-10">
      <h1>Simple pricing</h1>
      <div className="grid-2" style={{gridTemplateColumns:'1fr 1fr 1fr'}}>
        <article className="card">
          <h2>Free</h2><p className="muted">£0</p>
          <ul><li>3 invoices/day, 10/month</li><li>PDF email delivery</li><li>Watermark</li><li>7-day storage</li></ul>
          <a href="/login" className="btn btn-secondary">Start free</a>
        </article>
        <article className="card" style={{borderColor:'#cfe3ff'}}>
          <h2>Standard</h2><p className="muted">£9/mo</p>
          <ul><li>50 invoices/month</li><li>No watermark, your logo</li><li>Saved business & clients</li><li>6-month storage</li></ul>
          <button className="btn btn-primary" onClick={upgrade}>Upgrade</button>
        </article>
        <article className="card">
          <h2>Pro</h2><p className="muted">£29/mo</p>
          <ul><li>Up to 500 invoices/month</li><li>Hosted links & webhooks</li><li>Custom footer/colours</li><li>12-month storage</li></ul>
          <button className="btn btn-secondary" onClick={upgrade}>Go Pro</button>
        </article>
      </div>
    </section>
  );
}
