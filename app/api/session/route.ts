import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ user: null }, {{ status: 401 }});
}
export async function POST(request: Request) {
  return NextResponse.json({ user: null }, {{ status: 401 }});
}
