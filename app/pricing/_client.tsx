// app/pricing/_client.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

type PlanKey = 'free' | 'standard' | 'pro';

// Public env for client-side use
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPA_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const STANDARD_LINK = process.env.NEXT_PUBLIC_STRIPE_STANDARD_LINK!;
const PRO_LINK = process.env.NEXT_PUBLIC_STRIPE_PRO_LINK!;

function PlanCard({
  title,
  subtitle,
  priceText,
  features,
  borderColor,
  cta,
}: {
  title: string;
  subtitle?: string;
  priceText: string;
  features: string[];
  borderColor?: string;
  cta: React.ReactNode;
}) {
  return (
    <article
      className="card"
      style={{
        maxWidth: 360,
        flex: '1 1 320px',
        borderColor: borderColor ?? 'var(--color-border)',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {subtitle && <div className="muted" style={{ marginTop: -6 }}>{subtitle}</div>}
      <p className="muted" style={{ marginTop: 6 }}>{priceText}</p>

      <ul style={{ paddingLeft: 18, margin: '12px 0' }}>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>

      <div style={{ marginTop: 12 }}>{cta}</div>
    </article>
  );
}

async function getUserEmail(): Promise<string | null> {
  try {
    const supa = createClient(SUPA_URL, SUPA_ANON);
    const { data } = await supa.auth.getUser();
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

export default function PricingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const coupon = params.get('coupon');

  async function handleUpgrade(plan: PlanKey) {
    if (plan === 'free') {
      router.push('/login');
      return;
    }

    try {
      // Require sign-in before buying
      const res = await fetch('/api/session', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const base =
        plan === 'standard' ? STANDARD_LINK :
        plan === 'pro' ? PRO_LINK : '';

      if (!base) {
        alert('Payment link not configured.');
        return;
      }

      const email = await getUserEmail();
      const url = email
        ? `${base}?prefilled_email=${encodeURIComponent(email)}`
        : base;

      // Hard redirect to Stripe checkout
      window.location.assign(url);
    } catch {
      router.push('/login');
    }
  }

  return (
    <>
      {coupon && (
        <p style={{ color: 'green', textAlign: 'center' }}>
          Coupon <strong>{coupon}</strong> applied!
        </p>
      )}

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        <PlanCard
          title="Free"
          subtitle="Start Sending"
          priceText="£0"
          features={[
            '5 invoices/month',
            'PDF + email delivery',
            'Basic template only (no logo)',
            'Auto-numbering + tax fields',
            'Watermarked',
            '14-day invoice history',
          ]}
          cta={<Link href="/login" className="btn btn-secondary">Start free</Link>}
        />

        <PlanCard
          title="Standard"
          subtitle="Run the Business"
          priceText="£9/mo"
          borderColor="#cfe3ff"
          features={[
            '100 invoices/month',
            'Custom logo + footer',
            'Saved clients + products/services',
            'Auto-numbering + tax',
            'Invoice duplication & templates',
            '6-month storage',
            'Download CSV reports (basic bookkeeping)',
          ]}
          cta={
            <button className="btn btn-primary" onClick={() => handleUpgrade('standard')}>
              Upgrade
            </button>
          }
        />

        <PlanCard
          title="Pro"
          subtitle="Scale & Automate"
          priceText="£29/mo"
          features={[
            'Unlimited invoices/month',
            'Hosted invoice links (public/private)',
            'Webhook/API access',
            'Custom colours, branding, footer',
            'Saved notes/templates per client',
            '12-month storage',
            'Auto-send schedules (e.g. Fridays)',
            'Audit log of sent/delivered invoices',
          ]}
          cta={
            <button className="btn btn-secondary" onClick={() => handleUpgrade('pro')}>
              Go Pro
            </button>
          }
        />
      </div>
    </>
  );
}
