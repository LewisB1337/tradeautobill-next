'use client';
import { useEffect } from 'react';

export default function EnvLogger() {
  useEffect(() => {
    console.log('PUBLIC URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('PUBLIC KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }, []);
  return null;
}
