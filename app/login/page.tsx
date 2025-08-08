// app/login/page.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setError(null);

    try {
      const supabase = createClientComponentClient();

      const redirectTo =
        `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`;

      const { error: err } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
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
      <h1 style={{ marginTop: 0 }}>Sign in with your email</h1>
      <p className="muted small">No passwords. We’ll send a one-time link.</p>

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

          {status === 'sent' && (
            <div style={{ color: 'green' }}>
              Check your email for the sign-in link.
            </div>
          )}
          {status === 'error' && error && (
            <div style={{ color: 'crimson' }}>{error}</div>
          )}
        </div>
      </form>
    </main>
  );
}
