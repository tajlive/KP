import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

// Lazy initialization to prevent build-time errors
let supabaseInstance: SupabaseClient<Database> | null = null

function getSupabaseInstance(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  
  supabaseInstance = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Export a properly typed proxy that initializes on first use
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    const instance = getSupabaseInstance()
    return (instance as any as Record<string | symbol, unknown>)[prop]
  },
})

// Export typed admin client factory
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

// Re-export SSR clients for convenience
export { getSupabaseClient, createClient } from '@/lib/supabase/client'
export { createClient as createServerClient, createServerClient as createSSRServerClient } from '@/lib/supabase/server'

// Re-export database types from central location
export type { Database }
export type { 
  Profile, 
  Trade, 
  Portfolio,
  Visit,
  SystemLog,
  Simulation,
  AIPrediction,
  Balance,
  Subscription,
  FunnelEvent,
  WaitlistEntry,
  Course,
  UserCourse,
  BetaApplication,
  LeaderboardEntry,
  Notification,
  MarketData,
  BinanceTicker,
  BinanceKline,
} from '@/types/database'
