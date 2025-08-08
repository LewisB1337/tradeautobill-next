import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import type { User } from "@supabase/supabase-js";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
}

async function getSignedInUser(): Promise<User | null> {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: n => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

async function persistStripeCustomer(userId: string, email: string | null, customerId: string) {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
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
  let customerId = (user.app_metadata as any)?.stripe_customer_id as string | undefined;

  // Verify stored ID works with this Stripe key (handles live/test mismatch)
  if (customerId) {
    try { await stripe.customers.retrieve(customerId); return customerId; }
    catch { customerId = undefined; }
  }

  // Find by email
  if (!customerId && user.email) {
    try {
      const search = await stripe.customers.search({
        query: `email:"${user.email.replace(/"/g, '\\"')}"`, limit: 1,
      });
      if (search.data[0]?.id) customerId = search.data[0].id;
    } catch {}
  }

  // Create if none
  if (!customerId) {
    const created = await stripe.customers.create({
      email: user.email || undefined,
      name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = created.id;
  }

  await persistStripeCustomer(user.id, user.email, customerId);
  return customerId;
}

async function handle(req: Request) {
  try {
    const user = await getSignedInUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const stripe = getStripe();
    const customerId = await ensureStripeCustomerId(user, stripe);

    const origin = new URL(req.url).origin;
    const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || origin}/account`;

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Portal failed" }, { status: 500 });
  }
}

export async function POST(req: Request) { return handle(req); }
export async function GET(req: Request) {
  const res = await handle(req);
  try {
    const data = await res.json();
    if (res.status === 200 && data?.url) return NextResponse.redirect(data.url);
  } catch {}
  return res;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
