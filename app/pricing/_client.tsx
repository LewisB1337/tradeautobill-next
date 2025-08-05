// app/pricing/_client.tsx
'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* ------------------------------------------------------------- */
/*  data                                                         */
/* ------------------------------------------------------------- */

const LIMITS = {
  free:     { daily: 3,  monthly: 10 },
  standard: { daily: 50, monthly: 200 },
  pro:      { daily: null, monthly: null },
};

/* ------------------------------------------------------------- */
/*  helper component                                             */
/* ------------------------------------------------------------- */

interface CardProps {
  title:    string;
  price:    string;
  limits:   { daily: number | null; monthly: number | null };
  bullet?:  string;
  ctaText:  string;
  ctaHref:  string;
  featured?: boolean;
}

function PlanCard({
  title,
  price,
  limits,
  bullet,
  ctaText,
  ctaHref,
  featured,
}: CardProps) {
  const daily   = limits.daily   ? `${limits.daily}/day`     : 'Unlimited';
  const monthly = limits.monthly ? `${limits.monthly}/month` : 'Unlimited';

  return (
    <article
      className="card"
      style={{
        flex: '1 1 320px',
        maxWidth: 360,
        border: featured ? '2px solid royalblue' : '1px solid #e5e7eb',
        transform: featured ? 'scale(1.03)' : undefined,
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      <p
        style={{ fontSize: '1.5rem', margin: '0.25rem 0 1rem' }}
        dangerouslySetInnerHTML={{ __html: price }}
      />

      <ul style={{ listStyle: 'none', padding: 0, lineHeight: '1.6', marginBottom: '1rem' }}>
        <li>{daily} invoices&nbsp;/&nbsp;day</li>
        <li>{monthly} invoices&nbsp;/&nbsp;month</li>
        {bullet && <li>{bullet}</li>}
      </ul>

      <Link
        href={ctaHref}
        className="btn btn-primary"
        style={{ marginTop: 'auto', width: '100%' }}
      >
        {ctaText}
      </Link>
    </article>
  );
}

/* ------------------------------------------------------------- */
/*  exported client page body                                    */
/* ------------------------------------------------------------- */

export default function PricingClient() {
  const params  = useSearchParams();           // ← safe in client only
  const coupon  = params.get('coupon');

  return (
    <>
      {coupon && (
        <p style={{ color: 'green', textAlign: 'center' }}>
          Coupon <strong>{coupon}</strong> applied!
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <PlanCard
          title="Free"
          price="£0"
          limits={LIMITS.free}
          ctaText="Start free"
          ctaHref="/create"
        />
        <PlanCard
          title="Standard"
          price="£12&nbsp;/&nbsp;month"
          limits={LIMITS.standard}
          bullet="No watermark  •  Hosted PDF"
          ctaText="Upgrade"
          ctaHref="/api/stripe/checkout?plan=standard"
          featured
        />
        <PlanCard
          title="Pro"
          price="£29&nbsp;/&nbsp;month"
          limits={LIMITS.pro}
          bullet="Priority support  •  Unlimited invoices"
          ctaText="Upgrade"
          ctaHref="/api/stripe/checkout?plan=pro"
        />
      </div>
    </>
  );
}
