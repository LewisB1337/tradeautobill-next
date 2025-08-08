"use client";
import { useState } from "react";

export default function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const open = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Failed to open billing portal");
      window.location.href = data.url;
    } catch (e: any) {
      alert(e.message || "Failed");
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
