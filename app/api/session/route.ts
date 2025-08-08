import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

function supaFromCookies() {
  const jar = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return jar.getAll(); },
        setAll(list: { name: string; value: string; options: CookieOptions }[]) {
          for (const { name, value, options } of list) jar.set(name, value, options);
        },
      },
    }
  );
}

export async function GET() {
  try {
    const supabase = supaFromCookies();
    const { data: { user } } = await supabase.auth.getUser();
    return NextResponse.json({
      ok: true,
      signedIn: !!user,
      email: user?.email ?? null,
      app_metadata: user?.app_metadata ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
