'use client';
export const dynamic = 'force-dynamic';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export default function ConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = useSupabaseClient();
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const code = params.get('code');

  useEffect(() => {
    (async () => {
      if (!code) {
        setStatus('error');
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) setStatus('error');
      else router.replace('/create');
    })();
  }, [code, supabase, router]);

  return status === 'error' ? (
    <p style={{ color: 'red' }}>Sign-in failed. Try the link again.</p>
  ) : (
    <p>Signing you in…</p>
  );
}
