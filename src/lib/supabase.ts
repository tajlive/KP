import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Lazy initialization to prevent build-time errors
let supabaseInstance: SupabaseClient<Database> | null = null

function getSupabaseInstance(): SupabaseClient<Database> {
  if (supabaseInstance) {
    return supabaseInstance
  }
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  
  supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey)
  return supabaseInstance
}

// Export a properly typed proxy that initializes on first use
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(target, prop) {
    const instance = getSupabaseInstance()
    return (instance as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Re-export database types from central location
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
