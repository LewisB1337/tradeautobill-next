"use client";
import { useState } from "react";

const PORTAL_LOGIN = process.env.NEXT_PUBLIC_STRIPE_PORTAL_LOGIN_URL!;

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  const open = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.url) {
        window.location.href = data.url;           // seamless portal session
      } else {
        window.location.href = PORTAL_LOGIN;       // fallback: email-based login
      }
    } catch {
      window.location.href = PORTAL_LOGIN;         // network/env issues → fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={open} disabled={loading} className="rounded-lg border px-4 py-2">
      {loading ? "Opening…" : "Manage subscription"}
    </button>
  );
}
