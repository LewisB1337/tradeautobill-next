import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function getSignedInUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: n => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function ensureStripeCustomerId(user: any): Promise<string> {
  let customerId = (user.app_metadata as any)?.stripe_customer_id as string | undefined;

  // If we already have it, done.
  if (customerId) return customerId;

  // 1) Try to find an existing customer by email
  if (user.email) {
    try {
      const search = await stripe.customers.search({
        // Stripe search syntax
        query: `email:"${user.email.replace(/"/g, '\\"')}"`,
        limit: 1,
      });
      if (search.data[0]?.id) {
        customerId = search.data[0].id;
      }
    } catch (e) {
      console.error("[billing-portal] customers.search failed", e);
    }
  }

  // 2) If still none, create a fresh customer
  if (!customerId) {
    const created = await stripe.customers.create({
      email: user.email || undefined,
      name: (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = created.id;
  }

  // Persist to Supabase app_metadata + profiles
  const admin = await (async () => {
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  })();

  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata || {}),
      stripe_customer_id: customerId,
    },
  });

  await admin.from("profiles").upsert({
    id: user.id,
    email: user.email,
    stripe_customer_id: customerId,
    // keep current tier if set; otherwise default ‘free’
  });

  return customerId;
}

async function handleOpen() {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const customerId = await ensureStripeCustomerId(user);

  const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://tradeautobill.com"}/account`;
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}

export async function POST() {
  return handleOpen();
}

// Handy for manual testing in the browser (signed-in only)
export async function GET() {
  const res = await handleOpen();
  try {
    const data = await res.json();
    if ((res as any).status === 200 && data?.url) return NextResponse.redirect(data.url);
  } catch {}
  return res;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
