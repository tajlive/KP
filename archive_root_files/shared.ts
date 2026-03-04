// ============================================================================
// src/lib/supabase/server.ts
// Server-side Supabase client (for API routes)
// ============================================================================
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

let _client: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createClient() {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase environment variables');
  }

  _client = createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return _client;
}

// ============================================================================
// src/lib/types.ts
// Core domain types
// ============================================================================
export type SubscriptionTier = 'free' | 'bachelor' | 'master' | 'phd' | 'professor';
export type TradingMode = 'paper' | 'live';
export type SessionStatus = 'active' | 'paused' | 'crashed' | 'stopped';
export type TradeSide = 'buy' | 'sell';
export type TradeStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'failed';
export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';

export interface TradingSession {
  id: string;
  user_id: string;
  mode: TradingMode;
  status: SessionStatus;
  strategy_id: string;
  strategy_config: Record<string, unknown>;
  trading_pair: string;
  current_capital: number;
  initial_capital: number;
  open_position: OpenPosition | null;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  last_heartbeat: string;
  last_tick_at: string | null;
  crash_count: number;
  started_at: string;
  stopped_at: string | null;
}

export interface OpenPosition {
  side: 'long' | 'short';
  quantity: number;
  entry_price: number;
  entry_time: string;
}

export interface Trade {
  id: string;
  session_id: string;
  user_id: string;
  idempotency_key: string;
  mode: TradingMode;
  trading_pair: string;
  side: TradeSide;
  order_type: OrderType;
  quantity: number;
  price: number;
  total_value: number;
  fee: number;
  status: TradeStatus;
  leader_trade_id: string | null;
  is_copy: boolean;
  binance_order_id: string | null;
  realized_pnl: number | null;
  strategy_signal: Record<string, unknown> | null;
  executed_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_trades: number;
  winning_trades: number;
  total_pnl: number;
  win_rate: number;
  roi_percent: number;
  follower_count: number;
  last_trade_at: string;
}

// ============================================================================
// src/lib/schemas.ts
// Zod validation schemas for all API inputs
// ============================================================================
import { z } from 'zod';

export const StartSessionSchema = z.object({
  strategy_id: z.enum(['dca', 'trend_follow', 'multi_signal', 'grid']),
  trading_pair: z.string().regex(/^[A-Z]+\/[A-Z]+$/, 'Format: BTC/USDT'),
  mode: z.enum(['paper', 'live']).default('paper'),
  initial_capital: z.number().positive().max(10_000_000),
  strategy_config: z.record(z.unknown()).default({}),
});

export const StopSessionSchema = z.object({
  session_id: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const ExecuteTradeSchema = z.object({
  session_id: z.string().uuid(),
  side: z.enum(['buy', 'sell']),
  quantity: z.number().positive(),
  price: z.number().positive(),
  order_type: z.enum(['market', 'limit', 'stop_loss', 'take_profit']).default('market'),
  idempotency_key: z.string().min(1).max(200),
  strategy_signal: z.record(z.unknown()).optional(),
});

export const FollowLeaderSchema = z.object({
  leader_id: z.string().uuid(),
  scale_factor: z.number().min(0.01).max(10).default(1),
  max_trade_size: z.number().positive().optional(),
});

export const UnfollowSchema = z.object({
  follow_id: z.string().uuid(),
});

export const ConnectBinanceSchema = z.object({
  api_key: z.string().min(20).max(200),
  api_secret: z.string().min(20).max(200),
});

export const RecoverSessionSchema = z.object({
  session_id: z.string().uuid(),
});

export const LeaderboardQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d']).default('30d'),
  limit: z.number().int().min(1).max(100).default(20),
});

// ============================================================================
// src/lib/auth.ts
// Extract authenticated user from request
// ============================================================================
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getAuthUser() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

// ============================================================================
// src/lib/decimal.ts  
// Safe money math (never use Number for financial calculations)
// ============================================================================
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export function mul(a: number | string, b: number | string): number {
  return new Decimal(a).mul(new Decimal(b)).toDP(8).toNumber();
}

export function div(a: number | string, b: number | string): number {
  return new Decimal(a).div(new Decimal(b)).toDP(8).toNumber();
}

export function sub(a: number | string, b: number | string): number {
  return new Decimal(a).sub(new Decimal(b)).toDP(2).toNumber();
}

export function add(a: number | string, b: number | string): number {
  return new Decimal(a).add(new Decimal(b)).toDP(2).toNumber();
}

export function pnl(entryPrice: number, exitPrice: number, quantity: number): number {
  return new Decimal(exitPrice)
    .sub(entryPrice)
    .mul(quantity)
    .toDP(2)
    .toNumber();
}

// ============================================================================
// src/lib/rate-limit.ts
// In-memory rate limiter for API routes
// ============================================================================
const limitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = limitMap.get(key);

  if (!entry || now > entry.resetAt) {
    limitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limitMap) {
    if (now > entry.resetAt) limitMap.delete(key);
  }
}, 300_000);
