// app/api/invoice/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

// ── Env vars ───────────────────────────────────────────────────────────────────
const SUPABASE_URL    = process.env.SUPABASE_URL    || '';
const SERVICE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const N8N_URL         = process.env.N8N_WEBHOOK_URL || '';
const SIGN_SECRET     = process.env.N8N_SIGNING_SECRET || '';

// ── Helpers ───────────────────────────────────────────────────────────────────
type AnySupabase = SupabaseClient<any, any, any>;

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function hmacHex(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

function normalizePayload(raw: any) {
  const business      = raw.business  || {};
  const customer      = raw.customer  || {};
  const customerEmail = raw.customerEmail
    || customer.email
    || '';
  const itemsIn       = Array.isArray(raw.items) ? raw.items : [];
  const items         = itemsIn.map((it: any) => ({
    description: String(it.description ?? ''),
    quantity:    Number(it.quantity ?? it.qty ?? 0),
    unitPrice:   Number(it.unitPrice ?? it.price ?? 0),
    vatRate:     it.vatRate !== undefined
                    ? Number(it.vatRate)
                    : undefined,
  }));
  const totals        = raw.totals || {};
  const meta          = raw.meta   || {};
  const vatRate       = raw.vatRate !== undefined
                    ? Number(raw.vatRate)
                    : undefined;

  return { business, customer, customerEmail, items, vatRate, totals, meta };
}

async function countUsage(admin: AnySupabase, userId: string, sinceISO: string) {
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
  const now      = Date.now();
  const dayAgo   = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const daily    = await countUsage(admin, userId, dayAgo);
  const monthly  = await countUsage(admin, userId, monthAgo);
  return { daily, monthly };
}

function limitsForTier(tier: string) {
  if (tier === 'standard') return { daily: 25,  monthly: 200  };
  if (tier === 'pro')      return { daily: 100, monthly: 1000 };
  return { daily: 3, monthly: 10 };
}

// ── Whoami (optional) ───────────────────────────────────────────────────────────
export async function GET() {
  try {
    const userClient = createRouteHandlerClient({ cookies });
    const { data:{ user } } = await userClient.auth.getUser();
    if (!user) return json({ ok: false, error: 'Unauthorized' }, 401);
    const tier = (user.app_metadata?.tier as string) || 'free';
    return json({ ok: true, user: { id: user.id, tier } });
  } catch (e: any) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

// ── Send Invoice ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  let stage = 'start';
  try {
    // 1) Env
    stage = 'env';
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ ok: false, stage, error: 'Supabase not configured' }, 500);
    if (!N8N_URL     || !SIGN_SECRET) return json({ ok: false, stage, error: 'n8n not configured' }, 500);

    // 2) Auth
    stage = 'auth.getUser';
    const userClient = createRouteHandlerClient({ cookies });
    const { data:{ user }, error: authErr } = await userClient.auth.getUser();
    if (authErr) return json({ ok: false, stage, error: authErr.message }, 500);
    if (!user)   return json({ ok: false, stage, error: 'Unauthorized' }, 401);

    // 3) Supabase admin client
    stage = 'admin.connect';
    const admin: AnySupabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // 4) Parse & normalize
    stage = 'parse.json';
    let body: any;
    try { body = await req.json(); } catch {
      return json({ ok: false, stage, error: 'Invalid JSON' }, 400);
    }
    stage = 'normalize';
    const norm = normalizePayload(body);
    if (!norm.customerEmail.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) {
      return json({ ok: false, stage, error: 'Invalid customerEmail' }, 400);
    }
    if (!norm.items.length) {
      return json({ ok: false, stage, error: 'No items provided' }, 400);
    }

    // 5) Quota
    stage = 'quota.fetch';
    const { daily, monthly } = await getUsage(admin, user.id);
    const tier = (user.app_metadata?.tier as string) || 'free';
    const lim  = limitsForTier(tier);
    if (daily   >= lim.daily)   return json({ ok: false, stage, error: 'Daily limit reached' }, 429);
    if (monthly >= lim.monthly) return json({ ok: false, stage, error: 'Monthly limit reached' }, 429);

    // 6) Record usage (drop `kind` since your table has no such column)
    stage = 'usage.insert';
    let insErr = (await admin.from('usage').insert({ user: user.id })).error;
    if (insErr) {
      insErr = (await admin.from('usage').insert({ user_id: user.id })).error;
    }
    if (insErr) {
      return json({ ok: false, stage, error: `usage insert failed: ${JSON.stringify(insErr)}` }, 500);
    }

    // 7) Prepare n8n payload & sign
    stage = 'n8n.prepare';
    const invoice = { ...norm, userId: user.id, tier };
    const outBody   = JSON.stringify({ invoice });
    const signature = hmacHex(SIGN_SECRET, outBody);

    // 8) Fire off to n8n
    stage = 'n8n.fetch';
    const n8nRes = await fetch(N8N_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hmac-signature': signature,
      },
      body: outBody,
    });
    const text = await n8nRes.text().catch(() => '');
    let n8nJson: any = null;
    try { n8nJson = text ? JSON.parse(text) : null; } catch {}
    if (!n8nRes.ok) {
      return json({ ok: false, stage, error: `n8n ${n8nRes.status}`, detail: text }, 502);
    }

    // 9) Persist invoice record for history
    stage = 'db.insertInvoice';
    await admin.from('invoices').insert({
      user_id:     user.id,
      invoice_num: norm.meta.invoiceNumber || '',
      customer:    norm.customer,
      business:    norm.business,
      totals:      norm.totals,
    }).then(({ error: invErr }) => {
      if (invErr) console.error('[invoice] history insert error', invErr);
    });

    // 10) Done
    stage = 'done';
    return json({
      ok:     true,
      stage,
      jobId:  n8nJson?.jobId ?? null,
      n8n:    n8nJson ?? text,
    }, 200);

  } catch (e: any) {
    const err = typeof e === 'object' ? JSON.stringify(e) : String(e);
    return json({ ok: false, stage, error: err }, 500);
  }
}
