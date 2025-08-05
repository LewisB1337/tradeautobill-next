'use client';
export const dynamic = 'error';


// app/confirm/page.tsx

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function ConfirmClient() {
  const router   = useRouter();
  const params   = useSearchParams();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<'working' | 'error'>('working');

  const code = params.get('code');          // ?code=... from magic-link

  useEffect(() => {
    async function finishSignIn() {
      if (!code) {
        setStatus('error');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setStatus('error');
      } else {
        router.replace('/create');          // ✅ cookies set, redirect
      }
    }
    finishSignIn();
  }, [code, supabase, router]);

  if (status === 'error') {
    return <p style={{ color: 'red' }}>Sign-in failed. Try the link again.</p>;
  }
  return <p>Signing you in…</p>;
}
