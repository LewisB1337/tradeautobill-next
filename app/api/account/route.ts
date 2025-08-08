import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

type Tier = "free" | "standard" | "pro";

const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_STANDARD_PRICE_ID!]: "standard",
  [process.env.STRIPE_PRO_PRICE_ID!]: "pro",
};

const LIMITS: Record<Tier, { today: number | null; month: number | null }> = {
  free: { today: 3, month: 10 },
  standard: { today: 50, month: 1000 },
  pro: { today: null, month: null },
};

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
  return new Stripe(key);
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
    },
  );
}

function renewalIso(sub: any): string | null {
  const ts = sub?.current_period_end ?? sub?.current_period?.end ?? null;
  return ts ? new Date(ts * 1000).toISOString() : null;
}
function currentPriceId(sub: any): string | undefined {
  const item = sub?.items?.data?.[0];
  const price = item?.price as Stripe.Price | undefined;
  return price?.id;
}

export async function GET(req: Request) {
  const debug = new URL(req.url).searchParams.get("debug") === "1";
  const notes: string[] = [];

  try {
    // 1) Auth
    let user: any;
    try {
      const supabase = supaFromCookies();
      const { data, error } = await supabase.auth.getUser();
      if (error) return json(401, { ok: false, step: "auth", error: error.message });
      user = data.user;
      if (!user) return json(401, { ok: false, step: "auth", error: "Not signed in" });
    } catch (e: any) {
      return json(500, { ok: false, step: "auth", error: e?.message || String(e) });
    }

    // 2) Tier base
    let tier: Tier = ((user.app_metadata as any)?.tier as Tier) || "free";
    const customerId = (user.app_metadata as any)?.stripe_customer_id as string | undefined;

    // 3) Subscription (soft-fail)
    let sub: any = null;
    try {
      if (customerId) {
        const stripe = getStripe();
        const list = await stripe.subscriptions.list({
          customer: customerId, status: "all", expand: ["data.items.data.price"], limit: 1,
        });
        sub = list.data[0] ?? null;
      } else {
        notes.push("no_stripe_customer_id");
      }
    } catch (e: any) {
      notes.push(`stripe_error:${e?.message || e}`);
    }

    const priceId = currentPriceId(sub);
    const mapped = priceId ? PRICE_TO_TIER[priceId] : undefined;
    if (mapped && mapped !== "free") tier = mapped;

    const renewsAt = renewalIso(sub);

    // 4) Usage (soft-fail)
    const supabase = supaFromCookies();
    const usage = { today: { count: 0 }, month: { count: 0 } };
    try {
      const todayStart = new Date(); todayStart.setHours(0,0,0,0);
      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
      const { count: cToday } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStart.toISOString());
      if (typeof cToday === "number") usage.today.count = cToday;

      const { count: cMonth } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", monthStart.toISOString());
      if (typeof cMonth === "number") usage.month.count = cMonth;
    } catch (e:any) {
      notes.push(`usage_error:${e?.message || e}`);
    }

    const limits = LIMITS[tier];
    const body: any = {
      ok: true,
      plan: { tier: tier[0].toUpperCase() + tier.slice(1), renewsAt },
      usage: {
        today: { count: usage.today.count, limit: limits.today },
        month: { count: usage.month.count, limit: limits.month },
      },
    };
    if (debug || notes.length) body.notes = notes;

    return json(200, body);
  } catch (e: any) {
    return json(500, { ok: false, step: "outer", error: e?.message || String(e) });
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
