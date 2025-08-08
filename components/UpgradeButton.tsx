'use client';

type Plan = 'standard' | 'pro';

export default function UpgradeButton({ plan }: { plan: Plan }) {
  const href =
    plan === 'pro'
      ? process.env.NEXT_PUBLIC_STRIPE_PRO_LINK
      : process.env.NEXT_PUBLIC_STRIPE_STANDARD_LINK;

  if (!href) {
    return (
      <span className="text-red-600 text-sm">
        Payment link for {plan} not configured
      </span>
    );
  }

  return (
    <a href={href} className="btn btn-primary">
      {plan === 'pro' ? 'Upgrade to Pro' : 'Get Standard'}
    </a>
  );
}
