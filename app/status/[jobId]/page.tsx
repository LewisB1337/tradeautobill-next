'use client';
import { useEffect, useState } from 'react';

export default function Page({ params }:{ params:{ jobId:string } }){
  const { jobId } = params;
  const [state, setState] = useState('queued');
  const [pdfUrl, setPdfUrl] = useState<string|undefined>();

  useEffect(()=>{
    let timer: any;
    async function poll(){
      const r = await fetch('/api/status/'+jobId);
      if(r.ok){
        const data = await r.json();
        setState(data.status);
        if(data.pdfUrl) setPdfUrl(data.pdfUrl);
        if(data.status!=='sent' && data.status!=='failed'){
          timer = setTimeout(poll, 3000);
        }
      }
    }
    poll();
    return ()=> clearTimeout(timer);
  }, [jobId]);

  return (
    <section className="container py-12">
      <h1>Invoice on its way</h1>
      <p className="muted">We’ll email your customer as soon as the PDF is ready.</p>
      <div className="card">
        <div>Status: <span>{state}</span></div>
        {pdfUrl && <div>PDF: <a href={pdfUrl} target="_blank" rel="noopener">Download</a></div>}
      </div>
      <div className="row" style={{marginTop:12}}>
        <a href="/create" className="btn btn-secondary">Create another</a>
        <button className="btn btn-primary" onClick={async ()=>{ await fetch('/api/invoices/'+jobId+'/resend',{method:'POST'}); alert('Resent (if possible).'); }}>Resend email</button>
      </div>
      <div className="card" style={{marginTop:16}}>
        <strong>Want hosted links & history?</strong>
        <p className="muted">Upgrade to Pro for hosted invoice links and 12-month storage.</p>
        <a href="/pricing" className="btn btn-secondary">See plans</a>
      </div>
    </section>
  );
}
