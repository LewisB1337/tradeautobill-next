// app/account/page.tsx
'use client';

import UsageMeter from '../components/UsageMeter';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '../../lib/supabaseBrowser';

export default function AccountPage() {
  const router = useRouter();

  const [daily, setDaily]     = useState({ used: 0, limit: 3 });
  const [monthly, setMonthly] = useState({ used: 0, limit: 10 });

  // 1) Load usage stats
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/usage');
        if (!r.ok) return;
        const u = await r.json();
        setDaily({ used: u.dailyUsed,    limit: u.dailyLimit });
        setMonthly({ used: u.monthlyUsed, limit: u.monthlyLimit });
      } catch (e) {
        console.error('Error fetching usage', e);
      }
    })();
  }, []);

  // 2) Open Stripe portal
  async function openBillingPortal() {
    const r = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
    if (!r.ok) return alert('Could not open billing portal');
    const { url } = await r.json();
    window.location.href = url;
  }

  // 3) Log out
  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    router.replace('/login');
  }

  return (
    <section className="container py-10">
      <h1>Account</h1>
      <div className="grid-2">
        <div className="card">
          <h2>Your plan</h2>
          <p>Tier: <strong>Free</strong></p>
          <p>Renews: <span>—</span></p>
          <button onClick={openBillingPortal} className="btn btn-secondary">
            Manage subscription
          </button>
        </div>
        <div className="card">
          <h2>Usage</h2>
          <UsageMeter daily={daily} monthly={monthly} />
        </div>
      </div>

      <form className="card" style={{ marginTop: 16 }}>
        <h2>Business profile</h2>
        <div className="grid-2">
          <input name="businessName" placeholder="Business name" required />
          <input name="businessEmail" type="email" placeholder="you@business.co.uk" required />
          <input name="businessAddress" placeholder="Address" />
          <input name="vatNumber" placeholder="VAT number" />
        </div>
        <label>
          Logo <input type="file" name="logo" accept="image/*" />
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-primary" type="button">Save</button>
        </div>
      </form>

      <form className="card" style={{ marginTop: 16 }}>
        <h2>Email preferences</h2>
        <label>
          <input type="checkbox" name="marketing_opt_in" /> Receive product updates
        </label>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn btn-secondary" type="button">Save</button>
        </div>
      </form>

      <button
        onClick={handleLogout}
        className="btn btn-link"
        style={{ marginTop: 12 }}
      >
        Log out
      </button>
    </section>
  );
}
