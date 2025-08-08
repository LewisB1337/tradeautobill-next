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

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok:false, error:"Email required" }, { status:400 });

    const supabase = supaFromCookies();
    const origin = new URL(req.url).origin;
    const site = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
    const emailRedirectTo = `${site}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo },
    });
    if (error) return NextResponse.json({ ok:false, error:error.message }, { status:400 });

    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:e?.message || "Server error" }, { status:500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
