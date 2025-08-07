// app/create/page.tsx

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import CreateForm from './_client';

// Force per-request rendering, no ISR
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CreatePage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?from=/create');
  }

  // ← relative fetch; no env var needed
  const usageRes = await fetch('/api/usage', { cache: 'no-store' });
  if (!usageRes.ok) {
    throw new Error('Failed to load usage');
  }
  const u = await usageRes.json();

  const initialUsage = {
    daily: { used: u.daily_count, limit: u.daily_limit },
    monthly: { used: u.monthly_count, limit: u.monthly_limit },
  };

  return <CreateForm initialUsage={initialUsage} />;
}
