import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ url: 'https://billing.example.com/portal' });
}
export async function POST(request: Request) {
  return NextResponse.json({ url: 'https://billing.example.com/portal' });
}
