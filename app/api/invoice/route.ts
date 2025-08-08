import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import crypto from "crypto";

function bad(stage: string, msg: string, extra: any = {}, code = 400) {
  return NextResponse.json({ ok: false, stage, error: msg, ...extra }, { status: code });
}
function ok(body: any = {}) {
  return NextResponse.json({ ok: true, ...body });
}

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

function signBody(secret: string, ts: string, raw: string) {
  return crypto.createHmac("sha256", secret).update(`${ts}.${raw}`).digest("hex");
}

export async function POST(req: Request) {
  // read raw first so we can reuse the exact body for HMAC
  const raw = await req.text();
  let payload: any;
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    return bad("parse", "invalid JSON body", { raw }, 400);
  }

  // sanity: envs
  const missing = ["N8N_WEBHOOK_URL", "N8N_SIGNING_SECRET"].filter((k) => !process.env[k]);
  if (missing.length) {
    return bad("env", "missing required envs", { missing }, 500);
  }

  // auth
  const supabase = supaFromCookies();
  const { data: userRes, error: userErr } = await supabase.auth.getUser();
  if (userErr) return bad("auth", "supabase.auth.getUser failed", { userErr: userErr.message }, 401);
  const user = userRes.user;
  if (!user) return bad("auth", "not signed in", {}, 401);

  // resolve tier (cheap): app_metadata.tier | 'free'
  let tier = String((user.app_metadata as any)?.tier || "").toLowerCase();
  if (!tier) tier = "free";

  // write a row first so we have a stable id for callbacks
  // requires RLS policy: insert WITH CHECK (auth.uid() = user_id)
  const insert = {
    user_id: user.id,
    status: "queued",
    payload, // optional: remove if you don't store raw payloads
    created_at: new Date().toISOString(),
  };

  const { data: insRows, error: insErr } = await supabase
    .from("invoices")
    .insert(insert)
    .select("id")
    .limit(1);
  if (insErr) return bad("persist", "failed to insert invoice", { dbError: insErr.message }, 500);

  const id = insRows?.[0]?.id;
  if (!id) return bad("persist", "insert returned no id", {}, 500);

  // call n8n webhook with signed body
  const bodyForN8N = JSON.stringify({
    id,
    userId: user.id,
    email: user.email,
    tier,
    invoice: payload, // whatever your builder expects
  });

  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = signBody(process.env.N8N_SIGNING_SECRET!, ts, bodyForN8N);

  let upstreamStatus = 0;
  let upstreamText = "";
  try {
    const res = await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-tab-timestamp": ts,
        "x-tab-signature": sig,
      },
      body: bodyForN8N,
      // no-cache; keepalive false
    });
    upstreamStatus = res.status;
    upstreamText = await res.text();
    if (!res.ok) {
      return bad("queue", "n8n rejected request", { upstreamStatus, upstreamText }, 502);
    }
  } catch (e: any) {
    return bad("queue", "fetch to n8n failed", { message: e?.message }, 502);
  }

  return ok({ id, status: "queued" });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
