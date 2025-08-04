import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ items: [], nextPage: null });
}
export async function POST(request: Request) {
  return NextResponse.json({ items: [], nextPage: null });
}
