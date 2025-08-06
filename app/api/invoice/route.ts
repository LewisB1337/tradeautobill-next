// app/api/invoice/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const N8N_URL      = process.env.N8N_WEBHOOK_URL || '';
const SIGN_SECRET  = process.env.N8N_SIGNING_SECRET || '';

function json(data: any, status = 200) { return NextResponse.json(data, { status }); }
function hmacHex(secret: string, body: string) { return crypto.createHmac('sha256', secret).update(body).digest('hex'); }

type NormalItem = { description: string; quantity: number; unitPrice: number; vatRate?: number; };

function normalizePayload(raw: any) {
  const customerEmail = raw?.customerEmail || raw?.customer?.email || '';
  const business = raw?.business || {};
  const customer = raw?.customer || {};
  const itemsIn  = Array.isArray(raw?.items) ? raw.items : [];
  const items: NormalItem[] = itemsIn.map((it: any) => ({
    description: String(it.description ?? ''),
    quantity: Number(it.quantity ?? it.qty ?? 0),
    unitPrice: Number(it.unitPrice ?? it.price ?? 0),
    vatRate: it.vatRate !== undefined ? Number(it.vatRate) : undefined,
  }));
  const totals = raw?.totals || {};
  const vatRate = raw?.vatRate !== undefined ? Number(raw.vatRate) : undefined;
  return {
    business, customer, customerEmail, items, vatRate, totals,
    meta: {
      invoiceNumber: raw?.invoiceNumber || '',
      invoiceDate:   raw?.invoiceDate   || '',
      dueDate:       raw?.dueDate       || '',
      poNumber:      raw?.poNumber      || '',
      notes:         raw?.notes         || '',
      currency:      raw?.totals?.currency || 'GBP',
    }
  };
}

type AnySupabase = SupabaseClient<any, any, any>;

async function countUsage(
  admin: AnySupabase,
  userId: string,
  sinceISO: string
) {
  let { count, error } = await admin
    .from('usage')
    .select('id', { head: true, count: 'exact' })
    .eq('user', userId)
    .gte('created_at', sinceISO);

  if (error) {
    const r2 = await admin
      .from('usage')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', sinceISO);
    if (r2.error) {
      throw new Error(
        `countUsage failed: ${JSON.stringify({ err1: error, err2: r2.error })}`
      );
    }
    count = r2.count!;
  }

  return count ?? 0;
}

async function getUsage(admin: AnySupabase, userId: string) {
  const now = Date.now();
  const dayAgo   = new Date(now - 24*60*60*1000).toISOString();
  const monthAgo = new Date(now - 30*24*60*60*1000).toISOString();

  const daily   = await countUsage(admin, userId, dayAgo);
  const monthly = await countUsage(admin, userId, monthAgo);
  return { daily, monthly };
}

function limitsForTier(tier: string) {
  if (tier === 'standard') return { daily: 25,  monthly: 200  };
  if (tier === 'pro')      return { daily: 100, monthly: 1000 };
  return { daily: 3, monthly: 10 };
}

// Quick whoami
export async function GET() {
  let stage = 'start';
  try {
    stage = 'auth.getUser';
    const userClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return json({ ok: false, stage, error: 'Unauthorized' }, 401);
    const tier = (user.app_metadata?.tier as string) || 'free';
    return json({ ok: true, stage: 'done', user: { id: user.id, tier } });
  } catch (e: any) {
    const err = typeof e === 'object' ? JSON.stringify(e) : String(e);
    return json({ ok: false, stage, error: err }, 500);
  }
}

export async function POST(req: Request) {
  let stage = 'start';
  try {
    stage = 'env';
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, stage, error: 'Server not configured (supabase)' }, 500);
    if (!N8N_URL || !SIGN_SECRET)      return json({ ok: false, stage, error: 'Server not configured (n8n)' }, 500);

    stage = 'auth.getUser';
    const userClient = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr) return json({ ok: false, stage, error: authErr.message }, 500);
    if (!user)   return json({ ok: false, stage, error: 'Unauthorized' }, 401);

    stage = 'admin.connect';
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    stage = 'parse.json';
    let body: any;
    try { body = await req.json(); } catch { return json({ ok: false, stage, error: 'Invalid JSON body' }, 400); }

    stage = 'normalize.validate';
    const norm = normalizePayload(body);
    if (!norm.customerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(norm.customerEmail)) {
      return json({ ok: false, stage, error: 'Invalid or missing customerEmail' }, 400);
    }
    if (!Array.isArray(norm.items) || norm.items.length === 0) {
      return json({ ok: false, stage, error: 'At least one item is required' }, 400);
    }

    stage = 'quota.fetch';
    const { daily, monthly } = await getUsage(admin, user.id);
    const tier = (user.app_metadata?.tier as string) || 'free';
    const lim  = limitsForTier(tier);
    if (daily >= lim.daily)     return json({ ok: false, stage, error: 'Daily limit reached' }, 429);
    if (monthly >= lim.monthly) return json({ ok: false, stage, error: 'Monthly limit reached' }, 429);

    stage = 'usage.insert';
    // Insert row; tolerate either column name
    let insErr = (await admin.from('usage').insert({ user: user.id, kind: 'invoice_send' })).error;
    if (insErr) {
      insErr = (await admin.from('usage').insert({ user_id: user.id, kind: 'invoice_send' })).error;
    }
    if (insErr) return json({ ok: false, stage, error: `usage insert failed: ${JSON.stringify(insErr)}` }, 500);

    stage = 'n8n.prepare';
    const invoice = {
      business: norm.business, customer: norm.customer, customerEmail: norm.customerEmail,
      items: norm.items, vatRate: norm.vatRate, totals: norm.totals, meta: norm.meta,
      userId: user.id, tier,
    };
    const outBody = JSON.stringify({ invoice });

    stage = 'n8n.hmac';
    const signature = hmacHex(SIGN_SECRET, outBody);

    stage = 'n8n.fetch';
    const n8nRes = await fetch(N8N_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-hmac-signature': signature },
      body: outBody,
    });
    const n8nText = await n8nRes.text().catch(() => '');
    let n8nJson: any = null; try { n8nJson = n8nText ? JSON.parse(n8nText) : null; } catch {}

    if (!n8nRes.ok) return json({ ok: false, stage, error: `n8n error ${n8nRes.status}`, detail: n8nText }, 502);

    stage = 'done';
    return json({ ok: true, stage, jobId: n8nJson?.jobId ?? null, n8n: n8nJson ?? n8nText ?? null });
  } catch (e: any) {
    const err = typeof e === 'object' ? JSON.stringify(e) : String(e);
    return json({ ok: false, stage, error: err }, 500);
  }
}
