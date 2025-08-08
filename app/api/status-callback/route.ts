// app/api/status-callback/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

function bad(msg: string, code = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status: code });
}
function ok(body: any = {}) {
  return NextResponse.json({ ok: true, ...body });
}

function verifyHmac(req: Request, rawBody: string): boolean {
  const ts = req.headers.get("x-tab-timestamp") || "";
  const sig = req.headers.get("x-tab-signature") || "";
  const secret = process.env.N8N_SIGNING_SECRET;

  if (!secret) throw new Error("Missing N8N_SIGNING_SECRET");

  // 5 min freshness window
  const now = Math.floor(Date.now() / 1000);
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(now - tsNum) > 300) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${ts}.${rawBody}`)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  // IMPORTANT: read raw text for HMAC, then parse JSON
  const raw = await req.text();
  if (!verifyHmac(req, raw)) return bad("bad signature", 401);

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return bad("invalid json");
  }

  const id = payload.id || payload.invoiceId;
  const status = String(payload.status || "").toLowerCase(); // e.g. "queued" | "processing" | "sent" | "done" | "failed"
  const pdfUrl: string | null = payload.pdfUrl ?? null;

  if (!id) return bad("missing id");
  if (!status) return bad("missing status");

  // Update invoice row (idempotent)
  const supaUrl = process.env.SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supaUrl || !serviceRole) return bad("server misconfigured", 500);

  const admin = createClient(supaUrl, serviceRole);
  const { error } = await admin
    .from("invoices")
    .update({ status, pdf_url: pdfUrl, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return bad(error.message, 500);
  return ok({ id, status });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
