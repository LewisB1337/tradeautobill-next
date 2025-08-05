'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [message, setMessage] = useState<string>('Confirming your sign-in…');

  useEffect(() => {
    const run = async () => {
      try {
        const supabase = createClientComponentClient();

        // New PKCE flow (magic link / oauth) sends ?code=...&type=...
        const code = searchParams.get('code');
        const type = (searchParams.get('type') || '').toLowerCase();

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession({ code });
          if (error) throw error;
          setStatus('ok');
          setMessage('Signed in. Redirecting…');
          router.replace('/dashboard');
          return;
        }

        // Fallback for older emails: ?token_hash=...&type=magiclink|recovery|signup
        const token_hash = searchParams.get('token_hash');
        if (token_hash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash, type: type as any });
          if (error) throw error;
          setStatus('ok');
          setMessage('Signed in. Redirecting…');
          router.replace('/dashboard');
          return;
        }

        setStatus('error');
        setMessage('Missing verification code in the URL.');
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setMessage(err?.message || 'Failed to confirm sign-in.');
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container py-10 max-w-md">
      <h1 style={{ marginTop: 0 }}>Confirming…</h1>
      <p className={status === 'error' ? 'muted small' : 'small'}>
        {message}
      </p>
      {status === 'error' && (
        <p className="small">
          <a className="btn btn-secondary" href="/login">Back to login</a>
        </p>
      )}
    </main>
  );
}
