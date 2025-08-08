import { NextResponse } from "next/server";

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/api/billing-portal", req.url));
}

export async function POST(req: Request) {
  return GET(req);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
