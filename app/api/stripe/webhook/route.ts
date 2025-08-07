import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Use account default API version to avoid type churn
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Server-side Supabase client (service role)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,               // NOTE: server URL (not NEXT_PUBLIC_)
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // NOTE: service role key
);

// Map Stripe Price IDs -> tiers
const PRICE_TO_TIER: Record<string, "standard" | "pro"> = {
  [process.env.STRIPE_STANDARD_PRICE_ID!]: "standard",
  [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
};

async function setUserTierById(
  userId: string,
  tier: "free" | "standard" | "pro",
  stripeCustomerId?: string
) {
  const appMeta: Record<string, any> = { tier };
  if (stripeCustomerId) appMeta.stripe_customer_id = stripeCustomerId;

  await supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: appMeta });

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    stripe_customer_id: stripeCustomerId ?? null,
    tier,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(req: Request) {
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
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerEmail =
          session.customer_details?.email || session.customer_email || "";
        const customerId = (session.customer as string) || undefined;

        // Identify price used
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
          console.warn("[stripe:webhook] session without email");
          return NextResponse.json({ ok: true });
        }

        // Find Supabase user by email (fast path)
        let userId: string | undefined;
        const { data: idx, error: idxErr } = await supabaseAdmin
          .from("user_index")
          .select("id")
          .eq("email", customerEmail)
          .maybeSingle();
        if (idxErr) console.error("[stripe:webhook] user_index lookup:", idxErr);
        userId = idx?.id;

        // Fallback: admin list scan
        if (!userId) {
          try {
            const { data } = await supabaseAdmin.auth.admin.listUsers();
            const u = data.users.find(
              (u) => u.email?.toLowerCase() === customerEmail.toLowerCase()
            );
            userId = u?.id;
          } catch (e) {
            console.error("[stripe:webhook] listUsers fallback failed:", e);
          }
        }

        if (userId && tier) {
          await setUserTierById(userId, tier, customerId);
        } else if (!tier) {
          console.warn(
            "[stripe:webhook] Unknown priceId; set STRIPE_*_PRICE_ID envs. priceId:",
            priceId
          );
        } else {
          console.warn("[stripe:webhook] No user match for email:", customerEmail);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Try profiles first
        const { data: prof, error: profErr } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();
        if (profErr) console.error("[stripe:webhook] profiles lookup:", profErr);

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
            console.error("[stripe:webhook] listUsers fallback failed:", e);
          }
        }

        if (userId) {
          await setUserTierById(userId, "free", customerId);
        } else {
          console.warn("[stripe:webhook] No user for canceled customer:", customerId);
        }
        break;
      }

      default:
        // Ignore everything else
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
