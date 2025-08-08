import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Map Stripe Price IDs -> your app tiers
const PRICE_TO_TIER: Record<string, "free" | "standard" | "pro"> = {
  [process.env.STRIPE_STANDARD_PRICE_ID!]: "standard",
  [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
};

type Tier = "free" | "standard" | "pro";

const LIMITS: Record<Tier, { today: number | null; month: number | null }> = {
  free: { today: 3, month: 10 },
  standard: { today: 50, month: 1000 },
  pro: { today: null, month: null }, // unlimited
};

async function getUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: n => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return { user, supabase };
}

async function getActiveSubscription(customerId: string | undefined) {
  if (!customerId) return null;
  try {
    const subs = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      expand: ["data.items.data.price"],
      limit: 1,
    });
    return subs.data[0] ?? null;
  } catch {
    return null;
  }
}

function currentPriceIdFromSubscription(sub: Stripe.Subscription | null): string | undefined {
  if (!sub) return;
  const item = sub.items?.data?.[0];
  const price = item?.price as Stripe.Price | undefined;
  return price?.id;
}

async function getUsageCounts(supabase: ReturnType<typeof createServerClient> extends infer T ? any : never, userId: string) {
  // Defaults if you don’t have an invoices table or RLS blocks counts
  const today = { count: 0 };
  const month = { count: 0 };

  try {
    // If your invoices table is named differently, change here
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    // Count today
    const { count: cToday, error: e1 } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStart.toISOString());
    if (!e1 && typeof cToday === "number") today.count = cToday;

    // Count this month
    const { count: cMonth, error: e2 } = await supabase
      .from("invoices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", monthStart.toISOString());
    if (!e2 && typeof cMonth === "number") month.count = cMonth;
  } catch {
    // swallow — keep defaults
  }

  return { today, month };
}

export async function GET() {
  try {
    const { user, supabase } = await getUser();
    if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

    // Base tier from app metadata
    let tier: Tier = ((user.app_metadata as any)?.tier as Tier) || "free";
    const stripeCustomerId = (user.app_metadata as any)?.stripe_customer_id as string | undefined;

    // Pull subscription (for renewal date + authoritative tier if present)
    const sub = await getActiveSubscription(stripeCustomerId);
    const priceId = currentPriceIdFromSubscription(sub);
    const mapped = priceId ? PRICE_TO_TIER[priceId] : undefined;

    if (mapped && mapped !== "free") tier = mapped;

    const renewsAt = sub?.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null;

    // Usage (best effort)
    const usage = await getUsageCounts(supabase, user.id);
    const limits = LIMITS[tier];

    return NextResponse.json({
      ok: true,
      plan: {
        tier: tier.charAt(0).toUpperCase() + tier.slice(1), // "Pro" for UI
        renewsAt,
      },
      usage: {
        today: { count: usage.today.count, limit: limits.today },
        month: { count: usage.month.count, limit: limits.month },
      },
    });
  } catch (err: any) {
    console.error("[/api/account] error:", err?.message || err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
