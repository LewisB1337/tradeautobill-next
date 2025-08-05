// app/layout.tsx
import './globals.css';
import { Suspense } from 'react';
import Header from './components/Header';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
