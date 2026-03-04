// =============================================================================
// Database Types - Comprehensive type definitions for Supabase tables
// =============================================================================

export interface Profile {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role?: 'user' | 'admin' | 'superadmin' | string;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  beta_limits?: {
    max_trade_size_nok?: number;
    max_daily_trades?: number;
    max_daily_loss_nok?: number;
  } | null;
  onboarding_step?: string | null;
  exchange_connected?: boolean | null;
  binance_clicked?: boolean | null;
  student_nummer?: string | null;
  risk_preference?: 'conservative' | 'aggressive' | 'moderate' | string | null;
  telegram_connected?: boolean | null;
  telegram_username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
  last_sign_in_at?: string | null;
  phone?: string | null;
  preferred_language?: string | null;
  push_notifications_enabled?: boolean | null;
}

export interface Trade {
  id: string;
  user_id: string;
  portfolio_id?: string | null;
  symbol: string;
  side: 'BUY' | 'SELL' | 'LONG' | 'SHORT' | string;
  status?: 'OPEN' | 'CLOSED' | 'CANCELLED' | string;
  quantity?: number | null;
  price?: number | null;
  pnl?: number | null;
  pnl_nok?: number | null;
  pnl_pct?: number | null;
  profit_loss?: number | null;
  realized_pnl?: number | null;
  unrealized_pnl?: number | null;
  position_value?: number | null;
  opened_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  stop_loss?: number | null;
  take_profit?: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface Simulation {
  id: string;
  user_id: string;
  current_balance?: number | null;
  initial_balance?: number | null;
  status?: string | null;
  phase?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Visit {
  id: string;
  path?: string | null;
  referrer?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  profiles?: Profile | null;
  ip_address?: string | null;
  user_agent?: string | null;
  country?: string | null;
}

export interface SystemLog {
  id: string;
  type: 'error' | 'warning' | 'info' | 'debug' | string;
  message: string;
  time?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AIPrediction {
  id: string;
  symbol?: string | null;
  prediction_action?: string | null;
  prediction_confidence?: number | null;
  target_price?: number | null;
  stop_loss?: number | null;
  reason?: string | null;
  sentiment_score?: number | null;
  fear_greed_index?: number | null;
  rsi?: number | null;
  timestamp?: string | null;
  created_at?: string | null;
}

export interface Portfolio {
  id: string;
  user_id: string;
  name?: string | null;
  balance?: number | null;
  currency?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Balance {
  asset: string;
  free: string;
  locked: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status?: string | null;
  tier?: string | null;
  stripe_subscription_id?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FunnelEvent {
  id: string;
  user_id?: string | null;
  event_type: string;
  step?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface WaitlistEntry {
  id: string;
  email: string;
  name?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Course {
  id: string;
  title: string;
  description?: string | null;
  slug: string;
  price?: number | null;
  currency?: string | null;
  status?: 'draft' | 'published' | 'archived' | string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserCourse {
  id: string;
  user_id: string;
  course_id: string;
  status?: 'not_started' | 'in_progress' | 'completed' | string;
  progress?: number | null;
  purchased_at?: string | null;
  completed_at?: string | null;
}

export interface BetaApplication {
  id: string;
  user_id?: string | null;
  email: string;
  name?: string | null;
  phone?: string | null;
  status?: 'pending' | 'approved' | 'rejected' | string;
  risk_preference?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  full_name?: string | null;
  email?: string | null;
  total_pnl?: number | null;
  win_rate?: number | null;
  trade_count?: number | null;
  rank?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type?: string | null;
  title: string;
  message?: string | null;
  read?: boolean | null;
  action_url?: string | null;
  created_at?: string | null;
}

export interface MarketData {
  symbol: string;
  price: number;
  change_24h?: number | null;
  volume_24h?: number | null;
  high_24h?: number | null;
  low_24h?: number | null;
  timestamp?: string | null;
}

export interface BinanceTicker {
  e: string; // Event type
  E: number; // Event time
  s: string; // Symbol
  c: string; // Close price
  p: string; // Price change
  P: string; // Price change percent
  h: string; // High price
  l: string; // Low price
  v: string; // Volume
}

export interface BinanceKline {
  e: string;
  E: number;
  s: string;
  k: {
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
  };
}
