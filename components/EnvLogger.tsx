// components/EnvLogger.tsx
'use client';
import { useEffect } from 'react';

export default function EnvLogger() {
  useEffect(() => {
    console.log('🔑 NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('🔑 NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);
  return null;
}
