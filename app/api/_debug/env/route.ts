// app/api/_debug/env/route.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  const vars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'N8N_WEBHOOK_URL',
    'N8N_SIGNING_SECRET',
  ] as const;

  const present = Object.fromEntries(
    vars.map(k => [k, Boolean(process.env[k] && String(process.env[k]).length > 0)])
  );

  return NextResponse.json({
    envVisibleToFunction: present,
    note: 'All should be true. If any false → set env with Scope: Functions (and Build), then clear cache & redeploy.',
  });
}
