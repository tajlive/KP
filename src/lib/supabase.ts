/**
 * Central Supabase exports — backward-compatible re-exports.
 *
 * NOTE: The legacy @supabase/supabase-js proxy client has been removed
 * to prevent token refresh race conditions. All browser code should use
 * the @supabase/ssr singleton from client.ts.
 */

// Re-export SSR clients for convenience
export { getSupabaseClient, createClient } from "@/lib/supabase/client";
export {
  createClient as createServerClient,
  createServerClient as createSSRServerClient,
} from "@/lib/supabase/server";

// Re-export database types from central location
export type { Database } from "@/types/database.types";
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
} from "@/types/database";
