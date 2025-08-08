// app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => cookieStore.get(name)?.value,
          set: (name: string, value: string, options: any) => cookieStore.set(name, value, options),
          remove: (name: string, options: any) => cookieStore.delete(name, options),
        },
      }
    );

    // Exchange the one-time code for a session and set auth cookies on this domain
    try {
      await supabase.auth.exchangeCodeForSession(code);
    } catch {
      // fall through to redirect; UI can show an error if needed
    }
  }

  // Always bounce to the app (defaults to /account)
  const dest = new URL(next, url.origin);
  return NextResponse.redirect(dest);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
