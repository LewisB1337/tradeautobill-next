import UpgradeButton from "@/components/UpgradeButton";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Pricing</h1>

      <div className="grid sm:grid-cols-2 gap-6">
        <Plan
          name="Standard"
          price="£9/mo"
          features={[
            "50 invoices/month",
            "No watermark, your logo",
            "Saved business & clients",
            "6-month storage",
          ]}
          plan="standard"
        />
        <Plan
          name="Pro"
          price="£29/mo"
          features={[
            "Up to 500 invoices/month",
            "Hosted links & webhooks",
            "Custom footer/colours",
            "12-month storage",
          ]}
          plan="pro"
        />
      </div>

      <p className="text-sm text-gray-500 mt-6">
        Checkout opens in Stripe. After payment you’ll be redirected back and your plan upgrades automatically.
      </p>
    </main>
  );
}

function Plan({
  name, price, features, plan,
}: { name: string; price: string; features: string[]; plan: "standard" | "pro" }) {
  return (
    <div className="border rounded-xl p-6">
      <h2 className="text-xl font-semibold">{name}</h2>
      <div className="text-3xl font-bold mt-2">{price}</div>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => <li key={f}>• {f}</li>)}
      </ul>
      <UpgradeButton plan={plan} />
    </div>
  );
}
