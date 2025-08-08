"use client";

export default function ManageSubscriptionButton() {
  return (
    <a
      href="/api/billing-portal"
      className="rounded-lg border px-4 py-2 inline-flex items-center justify-center"
    >
      Manage subscription
    </a>
  );
}
