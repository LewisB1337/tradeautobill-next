import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import type { User } from "@supabase/supabase-js";

function ok(step: string, extra: Record<string, any> = {}) {
  return NextResponse.json({ ok: true, step, ...extra });
}
function fail(step: string, error: unknown, extra: Record<string, any> = {}) {
  const msg = error instanceof Error ? error.message : String(error);
  return NextResponse.json({ ok: false, step, error: msg, ...extra }, { status: 500 });
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

async function getUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: n => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user as User | null;
}

async function persistCustomer(userId: string, email: string | null, customerId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, key);
  await admin.auth.admin.updateUserById(userId, { app_metadata: { stripe_customer_id: customerId } });
  await admin.from("profiles").upsert({
    id: userId,
    email: email ?? undefined,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });
}

async function ensureCustomer(user: User, stripe: Stripe): Promise<string> {
  // 1) validate existing id
  let cid = (user.app_metadata as any)?.stripe_customer_id as string | undefined;
  if (cid) {
    try { await stripe.customers.retrieve(cid); return cid; } catch { cid = undefined; }
  }
  // 2) search by email
  if (!cid && user.email) {
    try {
      const search = await stripe.customers.search({ query: `email:"${user.email.replace(/"/g,'\\"')}"`, limit: 1 });
      cid = search.data[0]?.id;
    } catch (e) {
      throw new Error(`Stripe search failed: ${(e as any)?.message || e}`);
    }
  }
  // 3) create if none
  if (!cid) {
    const created = await stripe.customers.create({
      email: user.email || undefined,
      name: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || undefined,
      metadata: { supabase_user_id: user.id },
    });
    cid = created.id;
  }
  await persistCustomer(user.id, user.email ?? null, cid);
  return cid;
}

async function handle(req: Request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

    let stripe: Stripe;
    try { stripe = getStripe(); } catch (e) { return fail("stripe_init", e); }

    let customerId: string;
    try { customerId = await ensureCustomer(user, stripe); }
    catch (e) { return fail("ensure_customer", e); }

    const origin = new URL(req.url).origin;
    const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || origin}/account`;

    try {
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
      return NextResponse.json({ ok: true, url: session.url });
    } catch (e) {
      return fail("create_portal_session", e, { customerId });
    }
  } catch (e) {
    return fail("outer", e);
  }
}

export async function POST(req: Request) { return handle(req); }
export async function GET(req: Request) {
  const res = await handle(req);
  try {
    const data = await res.json();
    if (data?.ok && data?.url) return NextResponse.redirect(data.url);
  } catch {}
  return res;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
