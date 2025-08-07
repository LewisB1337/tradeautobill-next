// app/create/page.tsx

import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import CreateForm from './_client';

// Force this route to render on every request
export const dynamic = 'force-dynamic';
// (Optional) explicitly disable ISR
export const revalidate = 0;

export default async function CreatePage() {
  // Build a Supabase client bound to the server component's cookies
  const supabase = createServerComponentClient({ cookies });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?from=/create');
  }

  return <CreateForm />;
}
