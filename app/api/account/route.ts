import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) return NextResponse.json({ ok: false, error: 'Auth error' }, { status: 401 });
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

    // Pull tier from app_metadata if you’re storing it there; default to Standard
    // You can later replace this with a DB lookup if needed.
    const tier =
      (user as any)?.app_metadata?.tier ||
      (user as any)?.user_metadata?.tier ||
      'Standard';

    return NextResponse.json({ ok: true, plan: { tier } }, { status: 200 });
  } catch (e: any) {
    console.error('GET /api/account fatal', e);
    return NextResponse.json({ ok: false, error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
