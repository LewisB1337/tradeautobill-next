import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const keys = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'N8N_WEBHOOK_URL',
      'N8N_SIGNING_SECRET',
    ] as const;

    const present = Object.fromEntries(keys.map(k => [k, Boolean(process.env[k])]));
    return NextResponse.json({ ok: true, present });
  } catch (e: any) {
    // Should never happen, but return the error if it does
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
