// app/create/page.tsx

import { cookies } from 'next/headers';
import { createClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import CreateForm from './_client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function CreatePage() {
  const supabase = createClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // Not signed in → redirect to login, preserving return path
    redirect('/login?from=/create');
  }

  // Signed in → render the client-side form
  return <CreateForm />;
}
