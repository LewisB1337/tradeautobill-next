import { NextResponse } from "next/server";
export const runtime = "nodejs";
export async function GET() {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "N8N_WEBHOOK_URL",
    "N8N_SIGNING_SECRET",
  ] as const;
  const present = Object.fromEntries(keys.map(k => [k, !!process.env[k]]));
  return NextResponse.json({ ok: true, present });
}
