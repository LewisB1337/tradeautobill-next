import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    // No code in URL → nothing to exchange
    return NextResponse.redirect(`${origin}/auth/error?reason=missing_code`);
  }

  try {
    const supabase = createRouteHandlerClient({ cookies });
    await supabase.auth.exchangeCodeForSession(code);
    // Session cookie is now set; send user somewhere useful
    return NextResponse.redirect(`${origin}/`);
  } catch (err) {
    console.error("exchangeCodeForSession failed", err);
    return NextResponse.redirect(`${origin}/auth/error?reason=exchange_failed`);
  }
}
