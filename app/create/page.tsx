// app/create/page.tsx
// ───────────────────
// This is the route entry-point that Next.js renders for /create.
// It just delegates to the real (client-side) form component.

'use client';

import CreateForm from './_client';

export default function CreatePage() {
  return <CreateForm />;
}
