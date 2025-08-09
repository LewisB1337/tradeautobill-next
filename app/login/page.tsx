'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useSearchParams();

  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  // If already logged in, bounce to dashboard
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) router.replace('/dashboard');
    })();
  }, [supabase, router]);

  // If a magic link lands here with ?code=..., middleware-less flow still works
  useEffect(() => {
    if (params.get('code')) {
      const t = setTimeout(() => router.replace('/dashboard'), 300);
      return () => clearTimeout(t);
    }
  }, [params, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    try {
      const redirect = `${location.origin}/auth/callback`; // server-side exchange
      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirect },
      });
      if (err) throw err;
      setStatus('sent');
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to send magic link');
      setStatus('error');
    }
  }

  return (
    <main className="container py-10 max-w-md">
      <h1 style={{ marginTop: 0 }}>Sign in</h1>
      <p className="muted small">No passwords. We’ll email you a one-time link.</p>

      <form onSubmit={onSubmit} className="card" style={{ marginTop: 12 }}>
        <div style={{ display: 'grid', gap: 12 }}>
          <label htmlFor="email" className="tiny muted">Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'sending' || !email}
          >
            {status === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>

          {status === 'sent' && <div style={{ color: 'green' }}>Check your email for the sign-in link.</div>}
          {status === 'error' && error && <div style={{ color: 'crimson' }}>{error}</div>}
        </div>
      </form>
    </main>
  );
}
