// User types
export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  subscription_tier: 'free' | 'standard' | 'proff' | 'extrem' | 'family';
  subscription_expires_at?: string;
  trial_used: boolean;
  trial_expires_at?: string;
}

// Wallet types
export interface Wallet {
  id: string;
  user_id: string;
  balance_usdt: number;
  total_deposited: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

// Portfolio types
export interface PortfolioItem {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  avg_buy_price: number;
  total_invested: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  current_price: number;
  current_value: number;
  last_updated: string;
}

// Trade types
export type TradeType = 'buy' | 'sell';
export type TradeStatus = 'pending' | 'completed' | 'failed';

export interface Trade {
  id: string;
  user_id: string;
  symbol: string;
  type: TradeType;
  side: 'market' | 'limit';
  quantity: number;
  price: number;
  total_amount: number;
  fee: number;
  fee_percent: number;
  pnl: number | null;
  pnl_percent: number | null;
  status: TradeStatus;
  created_at: string;
  executed_at: string | null;
}

// Coin types
export interface Coin {
  symbol: string;
  name: string;
  price: number;
  price_change_24h: number;
  price_change_percent_24h: number;
  volume_24h: number;
  market_cap?: number;
  high_24h: number;
  low_24h: number;
  last_updated: string;
}

// Trading stats
export interface TradingStats {
  id: string;
  user_id: string;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_percent: number;
  initial_balance: number;
  total_profit_loss: number;
  best_trade_pnl: number | null;
  worst_trade_pnl: number | null;
  avg_trade_pnl: number;
  avg_trade_duration: number | null;
  max_drawdown: number;
  sharpe_ratio: number | null;
  updated_at: string;
}


// WebSocket message types
export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
}

// Subscription plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  name_no: string;
  price_monthly: number;
  price_yearly: number;
  description: string;
  features: string[];
  features_no: string[];
  max_backtest_days: number;
  ai_coach: boolean;
  risk_level: 'low' | 'medium' | 'high';
  max_team_members?: number;
}

// Strategy types
export interface Strategy {
  id: string;
  name: string;
  description: string;
  type: 'trend' | 'momentum' | 'mean_reversion' | 'breakout' | 'scalping';
  risk_level: 'low' | 'medium' | 'high';
  min_capital: number;
  avg_return: number;
  win_rate: number;
  created_by: string;
  is_public: boolean;
  created_at: string;
}

// Alert types
export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  condition: 'above' | 'below' | 'percent_change';
  target_price?: number;
  percent_threshold?: number;
  is_active: boolean;
  triggered_at?: string;
  created_at: string;
}

// Panic button log
export interface PanicButtonLog {
  id: string;
  user_id: string;
  triggered_at: string;
  action_taken: string;
  positions_closed: number;
  total_value_closed: number;
  reason?: string;
}

// Paper trading types
export interface PaperAccount {
  id: string;
  user_id: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
  created_at: string;
  updated_at: string;
}

export interface PaperTrade {
  id: string;
  user_id: string;
  symbol: string;
  type: 'buy' | 'sell';
  side: 'market' | 'limit';
  quantity: number;
  price: number;
  total_amount: number;
  pnl: number | null;
  pnl_percent: number | null;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  executed_at: string | null;
}

// Webflow integration types
export const WEBFLOW_ROOTS: { [key: string]: string } = {
  HEADER: 'klarpakke-header-root',
  FOOTER: 'klarpakke-footer-root',
  HERO: 'klarpakke-hero-root',
  FEATURES: 'klarpakke-features-root',
  PRICING: 'klarpakke-pricing-root',
  CALCULATOR: 'klarpakke-calculator-root',
  SIGNALS: 'klarpakke-signals-root',
  DASHBOARD: 'klarpakke-dashboard-root',
};

export interface PaperTradingStats {
  id: string;
  user_id: string;
  initial_balance: number;
  total_profit_loss: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  total_pnl_percent: number;
  best_trade_pnl: number | null;
  worst_trade_pnl: number | null;
  updated_at: string;
}
