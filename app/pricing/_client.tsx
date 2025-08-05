// app/pricing/_client.tsx
'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

type PlanKey = 'free' | 'standard' | 'pro';

function PlanCard({
  title,
  priceText,
  features,
  borderColor,
  cta,
}: {
  title: string;
  priceText: string;             // e.g. "£9/mo"
  features: string[];
  borderColor?: string;          // e.g. "#cfe3ff" for Standard (legacy)
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
      <p className="muted" style={{ marginTop: -6 }}>{priceText}</p>

      <ul style={{ paddingLeft: 18, margin: '12px 0' }}>
        {features.map((f, i) => <li key={i}>{f}</li>)}
      </ul>

      <div style={{ marginTop: 12 }}>{cta}</div>
    </article>
  );
}

export default function PricingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const coupon = params.get('coupon');

  async function handleUpgrade(plan: PlanKey) {
    try {
      const res = await fetch('/api/session', { credentials: 'include' });
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      // Legacy behavior: send them to Account to manage upgrade
      router.push(`/account?plan=${plan}`);
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

      <div
        className="grid-2"
        // Legacy had 3 equal columns:
        style={{ gridTemplateColumns: '1fr 1fr 1fr' }}
      >
        <PlanCard
          title="Free"
          priceText="£0"
          features={[
            '3 invoices/day, 10/month',
            'PDF email delivery',
            'Watermark',
            '7-day storage',
          ]}
          cta={
            <Link href="/login" className="btn btn-secondary">
              Start free
            </Link>
          }
        />

        <PlanCard
          title="Standard"
          priceText="£9/mo"
          borderColor="#cfe3ff"
          features={[
            '50 invoices/month',
            'No watermark, your logo',
            'Saved business & clients',
            '6-month storage',
          ]}
          cta={
            <button className="btn btn-primary" onClick={() => handleUpgrade('standard')}>
              Upgrade
            </button>
          }
        />

        <PlanCard
          title="Pro"
          priceText="£29/mo"
          features={[
            'Up to 500 invoices/month',
            'Hosted links & webhooks',
            'Custom footer/colours',
            '12-month storage',
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
