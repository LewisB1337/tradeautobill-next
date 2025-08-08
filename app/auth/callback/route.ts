// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";

  if (code) {
    const cookieStore = cookies();

    // NEW cookie API: getAll / setAll
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            for (const { name, value, options } of cookiesToSet) {
              // next/headers cookies().set(name, value, options)
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    try {
      // Exchange Supabase "code" for a session; sets auth cookies via setAll above
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      // ignore; we still redirect below
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
