// lib/tiers.ts
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export type Tier = 'free' | 'standard' | 'pro'

export async function getTierForUser(userId: string): Promise<Tier> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('tier')
    .eq('id', userId)
    .single()

  if (error || !data?.tier) {
    console.error('Could not fetch tier, defaulting to free:', error)
    return 'free'
  }

  return data.tier as Tier
}
