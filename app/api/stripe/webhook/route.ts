import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Use Stripe account default API version (avoids type churn)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Supabase admin client (server-side secrets)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,               // NOTE: server URL (not NEXT_PUBLIC_*)
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // NOTE: service role key
);

// Map Stripe Price IDs -> your app tiers
const PRICE_TO_TIER: Record<string, "standard" | "pro"> = {
  [process.env.STRIPE_STANDARD_PRICE_ID!]: "standard",
  [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
};

async function setUserTierById(
  userId: string,
  tier: "free" | "standard" | "pro",
  stripeCustomerId?: string
) {
  // update auth app_metadata
  const appMeta: Record<string, any> = { tier };
  if (stripeCustomerId) appMeta.stripe_customer_id = stripeCustomerId;
  await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMeta });

  // mirror into profiles table
  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    stripe_customer_id: stripeCustomerId ?? null,
    tier,
    updated_at: new Date().toISOString(),
  });
}

function currentPriceIdFromSubscription(sub: Stripe.Subscription): string | undefined {
  const item = sub.items?.data?.[0];
  const price = item?.price as Stripe.Price | undefined;
  return price?.id;
}

export async function POST(req: Request) {
  // Stripe signature verification requires the raw body
  const sig = headers().get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("[stripe:webhook] Bad signature:", err?.message);
    return new Response("Bad signature", { status: 400 });
  }

  try {
    switch (event.type) {
      // Upgrade after successful checkout
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerEmail =
          session.customer_details?.email || session.customer_email || "";
        const customerId = (session.customer as string) || undefined;

        // identify price used in the session (first line item)
        let priceId: string | undefined;
        try {
          const li = await stripe.checkout.sessions.listLineItems(session.id, {
            limit: 1,
            expand: ["data.price"],
          });
          priceId = (li.data[0]?.price as Stripe.Price | undefined)?.id;
        } catch (e) {
          console.error("[stripe:webhook] listLineItems failed:", e);
        }
        const tier = priceId ? PRICE_TO_TIER[priceId] : undefined;

        if (!customerEmail) {
          console.warn("[stripe:webhook] session completed without customerEmail");
          return NextResponse.json({ ok: true });
        }

        // Find user by email (fast path: user_index), fallback to admin list
        let userId: string | undefined;

        const { data: idx, error: idxErr } = await supabaseAdmin
          .from("user_index")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();
        if (idxErr) console.error("[stripe:webhook] user_index lookup error:", idxErr);
        userId = idx?.id;

        if (!userId) {
          try {
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const u = data.users.find(
              (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
            );
            userId = u?.id;
          } catch (e) {
            console.error("[stripe:webhook] admin.listUsers fallback failed:", e);
          }
        }

        if (userId && tier) {
          await setUserTierById(userId, tier, customerId);
        } else if (!tier) {
          console.warn("[stripe:webhook] Unknown priceId; check STRIPE_*_PRICE_ID envs. priceId:", priceId);
        } else {
          console.warn("[stripe:webhook] No user match for email:", customerEmail);
        }
        break;
      }

      // Plan switch (e.g., Pro ↔ Standard) without cancel
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const priceId = currentPriceIdFromSubscription(sub);
        const tier = priceId ? PRICE_TO_TIER[priceId] : undefined;

        // Prefer profiles lookup by stripe_customer_id
        const { data: prof, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (profErr) console.error("[stripe:webhook] profiles lookup error:", profErr);

        let userId = prof?.id;

        // Fallback: scan app_metadata
        if (!userId) {
          try {
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const u = data.users.find(
              (u) => (u.app_metadata as any)?.stripe_customer_id === customerId
            );
            userId = u?.id;
          } catch (e) {
            console.error("[stripe:webhook] admin.listUsers fallback failed:", e);
          }
        }

        if (userId && tier) {
          await setUserTierById(userId, tier, customerId);
        } else if (userId && !tier) {
          console.warn("[stripe:webhook] subscription.updated unknown priceId:", priceId);
        } else {
          console.warn("[stripe:webhook] subscription.updated no user for customer:", customerId);
        }
        break;
      }

      // Downgrade to free on cancel
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Try profiles first
        const { data: prof, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (profErr) console.error("[stripe:webhook] profiles lookup error:", profErr);

        let userId = prof?.id;

        // Fallback: scan users' app_metadata
        if (!userId) {
          try {
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const u = data.users.find(
              (u) => (u.app_metadata as any)?.stripe_customer_id === customerId
            );
            userId = u?.id;
          } catch (e) {
            console.error("[stripe:webhook] admin.listUsers fallback failed:", e);
          }
        }

        if (userId) {
          await setUserTierById(userId, "free", customerId);
        } else {
          console.warn("[stripe:webhook] No user found for canceled customer:", customerId);
        }
        break;
      }

      default:
        // ignore the rest
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe:webhook] Handler error:", err);
    return new Response("Webhook error", { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
