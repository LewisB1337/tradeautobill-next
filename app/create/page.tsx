// app/create/page.tsx

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import CreateForm from './_client';

// Force this route to render on every request
export const dynamic = 'force-dynamic';
// Explicitly disable ISR
export const revalidate = 0;

export default async function CreatePage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?from=/create');
  }

  // Fetch live usage data at request time
  const usageRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/usage`,
    { cache: 'no-store' }
  );
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
