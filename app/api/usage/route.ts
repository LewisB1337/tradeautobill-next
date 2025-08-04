import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({ dailyUsed: 2, dailyLimit: 3, monthlyUsed: 6, monthlyLimit: 10 });
}
export async function POST(request: Request) {
  return NextResponse.json({ dailyUsed: 2, dailyLimit: 3, monthlyUsed: 6, monthlyLimit: 10 });
}
