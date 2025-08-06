// app/api/invoice/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const N8N_URL      = process.env.N8N_WEBHOOK_URL || '';
const SIGN_SECRET  = process.env.N8N_SIGNING_SECRET || '';

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

function hmacHex(secret: string, body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

type NormalItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
};

function normalizePayload(raw: any) {
  const customerEmail =
    raw?.customerEmail ||
    raw?.customer?.email ||
    '';

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
    business,
    customer,
    customerEmail,
    items,
    vatRate,
    totals,
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

async function getUsage(admin: ReturnType<typeof createClient>, userId: string) {
  const now = Date.now();
  const dayAgo   = new Date(now - 24*60*60*1000).toISOString();
  const monthAgo = new Date(now - 30*24*60*60*1000).toISOString();

  const { count: dCount, error: dErr } = await admin
    .from('usage').select('id', { head: true, count: 'exact' })
    .eq('user', userId).gte('created_at', dayAgo);
  if (dErr) throw dErr;

  const { count: mCount, error: mErr } = await admin
    .from('usage').select('id', { head: true, count: 'exact' })
    .eq('user', userId).gte('created_at', monthAgo);
  if (mErr) throw mErr;

  return { daily: dCount ?? 0, monthly: mCount ?? 0 };
}

function limitsForTier(tier: string) {
  if (tier === 'standard') return { daily: 25,  monthly: 200  };
  if (tier === 'pro')      return { daily: 100, monthly: 1000 };
  return { daily: 3, monthly: 10 }; // free
}

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server not configured (supabase)' }, 500);
    if (!N8N_URL || !SIGN_SECRET)      return json({ error: 'Server not configured (n8n)' }, 500);

    // Auth (user context)
    const userClient = createRouteHandlerClient({ cookies });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // Read raw body for signing + parse JSON
    const rawBody = await req.text();
    let body: any;
    try { body = JSON.parse(rawBody); } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    // Normalize and validate soft requirements
    const norm = normalizePayload(body);
    if (!norm.customerEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(norm.customerEmail)) {
      return json({ error: 'Invalid or missing customerEmail' }, 400);
    }
    if (!Array.isArray(norm.items) || norm.items.length === 0) {
      return json({ error: 'At least one item is required' }, 400);
    }

    // Quota check
    const { daily, monthly } = await getUsage(admin, user.id);
    const tier = (user.app_metadata?.tier as string) || 'free';
    const lim  = limitsForTier(tier);
    if (daily >= lim.daily)     return json({ error: 'Daily limit reached' }, 429);
    if (monthly >= lim.monthly) return json({ error: 'Monthly limit reached' }, 429);

    // Insert usage row
    const { error: insErr } = await admin.from('usage').insert({
      user: user.id,
      kind: 'invoice_send',
    });
    if (insErr) return json({ error: insErr.message }, 500);

    // Outbound payload to n8n
    const invoice = {
      business: norm.business,
      customer: norm.customer,
      customerEmail: norm.customerEmail,
      items: norm.items,
      vatRate: norm.vatRate,
      totals: norm.totals,
      meta: norm.meta,
      userId: user.id,
      tier,
    };
    const outBody = JSON.stringify({ invoice });

    // Sign + send to n8n
    const signature = hmacHex(SIGN_SECRET, outBody);
    const n8nRes = await fetch(N8N_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hmac-signature': signature,
      },
      body: outBody,
    });

    const n8nText = await n8nRes.text().catch(() => '');
    let n8nJson: any = null;
    try { n8nJson = n8nText ? JSON.parse(n8nText) : null; } catch {}

    if (!n8nRes.ok) {
      return json({ error: `n8n error ${n8nRes.status}`, detail: n8nText }, 502);
    }

    // Always return JSON with something useful
    return json({
      ok: true,
      jobId: n8nJson?.jobId ?? null,
      n8n: n8nJson ?? n8nText ?? null,
    });
  } catch (e: any) {
    console.error('/api/invoice error:', e);
    return json({ error: e?.message || 'Internal error' }, 500);
  }
}
