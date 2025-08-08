import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import type { User } from "@supabase/supabase-js";

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

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

async function persistStripeCustomer(userId: string, email: string | null, customerId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(url, key);

  // Store on auth user (app_metadata) and in profiles table (if you have it)
  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { stripe_customer_id: customerId },
  });

  await admin.from("profiles").upsert({
    id: userId,
    email: email ?? undefined,
    stripe_customer_id: customerId,
    updated_at: new Date().toISOString(),
  });
}

async function ensureStripeCustomerId(user: User, stripe: Stripe): Promise<string> {
  let cid = (user.app_metadata as any)?.stripe_customer_id as string | undefined;

  // If one is stored, verify it works with this key (handles live/test mismatches)
  if (cid) {
    try {
      await stripe.customers.retrieve(cid);
      return cid;
    } catch {
      cid = undefined; // will re-find or recreate below
    }
  }

  // Try to find by email
  if (!cid && user.email) {
    const search = await stripe.customers.search({
      query: `email:"${user.email.replace(/"/g, '\\"')}"`,
      limit: 1,
    });
    cid = search.data[0]?.id;
  }

  // Create if none
  if (!cid) {
    const created = await stripe.customers.create({
      email: user.email || undefined,
      name:
        (user.user_metadata && (user.user_metadata.full_name || (user.user_metadata as any).name)) ||
        undefined,
      metadata: { supabase_user_id: user.id },
    });
    cid = created.id;
  }

  await persistStripeCustomer(user.id, user.email ?? null, cid);
  return cid;
}

function getReturnUrl(req: Request) {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (!site) {
    // Fallback to current origin if env missing, but you *should* set NEXT_PUBLIC_SITE_URL
    const origin = new URL(req.url).origin;
    return `${origin}/account`;
  }
  return `${site}/account`;
}

async function handle(req: Request) {
  try {
    const supabase = supaFromCookies();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

    const stripe = getStripe();
    const customerId = await ensureStripeCustomerId(user, stripe);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: getReturnUrl(req),
    });

    return NextResponse.json({ ok: true, url: session.url });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Portal failed" }, { status: 500 });
  }
}

export async function POST(req: Request) { return handle(req); }

export async function GET(req: Request) {
  const res = await handle(req);
  try {
    const data = await res.json();
    if (data?.ok && data?.url) return NextResponse.redirect(data.url);
  } catch {
    // ignore; fall through with JSON response
  }
  return res;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
