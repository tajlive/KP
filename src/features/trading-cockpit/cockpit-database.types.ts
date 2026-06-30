/**
 * @file src/features/trading-cockpit/types/database.types.ts
 * @description Fase 1 isolated types for the Trading Cockpit.
 *
 * WHY THIS FILE EXISTS:
 * The project-wide `src/types/database.types.ts` drifted from the production
 * schema over time. Regenerating it from the live DB introduced 265 type errors
 * across 56 files, most of them outside the Trading Cockpit scope. Rather than
 * leaving the main types broken (or suppressing hundreds of errors), we isolate
 * the cockpit's source-of-truth types here.
 *
 * SCOPE:
 * - Tables: trading_sessions, trades, user_profiles
 * - RPCs: get_dashboard_metrics, get_trades_pagnated, get_trading_analytics,
 *         calculate_effective_pnl
 * - Enums: trading_mode, session_status, trade_status, trade_side, order_type,
 *          risk_level
 *
 * MIGRATION PATH:
 * When `src/types/database.types.ts` is regenerated and reconciled codebase-wide,
 * this file should be deleted and its consumers should switch back to the main
 * `Database` type.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CockpitDatabase = {
  public: {
    Tables: {
      trading_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: "paper" | "live";
          status: "active" | "paused" | "crashed" | "stopped";
          strategy_id: string;
          strategy_config: Json;
          trading_pair: string;
          risk_level: "conservative" | "balanced" | "aggressive" | null;
          current_capital: number;
          initial_capital: number;
          open_position: Json | null;
          total_trades: number;
          winning_trades: number;
          losing_trades: number;
          total_pnl: number;
          max_drawdown_pct: number | null;
          phase: string | null;
          phase_started_at: string | null;
          last_heartbeat: string;
          last_tick_at: string | null;
          crash_count: number;
          started_at: string;
          stopped_at: string | null;
          created_at: string;
          updated_at: string;
          current_capital_nok: number | null;
          starting_capital_nok: number | null;
          last_analysis_details: Json | null;
          next_expected_action_at: string | null;
          last_status_message: string | null;
          copied_from_listing_id: string | null;
          copy_source_session_id: string | null;
          archived: boolean | null;
          archived_at: string | null;
          backtest_expected_pnl: number | null;
          is_leaderboard_visible: boolean;
          autopilot_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode?: "paper" | "live";
          status?: "active" | "paused" | "crashed" | "stopped";
          strategy_id?: string;
          strategy_config?: Json;
          trading_pair?: string;
          risk_level?: "conservative" | "balanced" | "aggressive" | null;
          current_capital?: number;
          initial_capital?: number;
          open_position?: Json | null;
          total_trades?: number;
          winning_trades?: number;
          losing_trades?: number;
          total_pnl?: number;
          max_drawdown_pct?: number | null;
          phase?: string | null;
          phase_started_at?: string | null;
          last_heartbeat?: string;
          last_tick_at?: string | null;
          crash_count?: number;
          started_at?: string;
          stopped_at?: string | null;
          created_at?: string;
          updated_at?: string;
          current_capital_nok?: number | null;
          starting_capital_nok?: number | null;
          last_analysis_details?: Json | null;
          next_expected_action_at?: string | null;
          last_status_message?: string | null;
          copied_from_listing_id?: string | null;
          copy_source_session_id?: string | null;
          archived?: boolean | null;
          archived_at?: string | null;
          backtest_expected_pnl?: number | null;
          is_leaderboard_visible?: boolean;
          autopilot_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: "paper" | "live";
          status?: "active" | "paused" | "crashed" | "stopped";
          strategy_id?: string;
          strategy_config?: Json;
          trading_pair?: string;
          risk_level?: "conservative" | "balanced" | "aggressive" | null;
          current_capital?: number;
          initial_capital?: number;
          open_position?: Json | null;
          total_trades?: number;
          winning_trades?: number;
          losing_trades?: number;
          total_pnl?: number;
          max_drawdown_pct?: number | null;
          phase?: string | null;
          phase_started_at?: string | null;
          last_heartbeat?: string;
          last_tick_at?: string | null;
          crash_count?: number;
          started_at?: string;
          stopped_at?: string | null;
          created_at?: string;
          updated_at?: string;
          current_capital_nok?: number | null;
          starting_capital_nok?: number | null;
          last_analysis_details?: Json | null;
          next_expected_action_at?: string | null;
          last_status_message?: string | null;
          copied_from_listing_id?: string | null;
          copy_source_session_id?: string | null;
          archived?: boolean | null;
          archived_at?: string | null;
          backtest_expected_pnl?: number | null;
          is_leaderboard_visible?: boolean;
          autopilot_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trading_sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      trades: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          idempotency_key: string | null;
          mode: "paper" | "live";
          trading_pair: string;
          side: "buy" | "sell";
          order_type: "market" | "limit" | "stop_loss" | "take_profit";
          quantity: number;
          price: number;
          total_value: number;
          fee: number;
          status: "pending" | "filled" | "partially_filled" | "cancelled" | "failed";
          leader_trade_id: string | null;
          is_copy: boolean;
          binance_order_id: string | null;
          realized_pnl: number | null;
          strategy_signal: Json | null;
          executed_at: string;
          created_at: string;
          metadata: Json | null;
          is_mock: boolean;
          usdt_nok_rate: number | null;
          fill_rate: number | null;
          post_trade_price_1min: number | null;
          post_trade_price_5min: number | null;
          latency_ms: number | null;
          venue: string | null;
          slippage_bps: number | null;
          spread_bps: number | null;
          idempotency_scope: string;
          filled_quantity: number | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          idempotency_key?: string | null;
          mode?: "paper" | "live";
          trading_pair: string;
          side: "buy" | "sell";
          order_type?: "market" | "limit" | "stop_loss" | "take_profit";
          quantity: number;
          price: number;
          total_value: number;
          fee?: number;
          status?: "pending" | "filled" | "partially_filled" | "cancelled" | "failed";
          leader_trade_id?: string | null;
          is_copy?: boolean;
          binance_order_id?: string | null;
          realized_pnl?: number | null;
          strategy_signal?: Json | null;
          executed_at?: string;
          created_at?: string;
          metadata?: Json | null;
          is_mock?: boolean;
          usdt_nok_rate?: number | null;
          fill_rate?: number | null;
          post_trade_price_1min?: number | null;
          post_trade_price_5min?: number | null;
          latency_ms?: number | null;
          venue?: string | null;
          slippage_bps?: number | null;
          spread_bps?: number | null;
          idempotency_scope?: string;
          filled_quantity?: number | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          idempotency_key?: string | null;
          mode?: "paper" | "live";
          trading_pair?: string;
          side?: "buy" | "sell";
          order_type?: "market" | "limit" | "stop_loss" | "take_profit";
          quantity?: number;
          price?: number;
          total_value?: number;
          fee?: number;
          status?: "pending" | "filled" | "partially_filled" | "cancelled" | "failed";
          leader_trade_id?: string | null;
          is_copy?: boolean;
          binance_order_id?: string | null;
          realized_pnl?: number | null;
          strategy_signal?: Json | null;
          executed_at?: string;
          created_at?: string;
          metadata?: Json | null;
          is_mock?: boolean;
          usdt_nok_rate?: number | null;
          fill_rate?: number | null;
          post_trade_price_1min?: number | null;
          post_trade_price_5min?: number | null;
          latency_ms?: number | null;
          venue?: string | null;
          slippage_bps?: number | null;
          spread_bps?: number | null;
          idempotency_scope?: string;
          filled_quantity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "trades_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "trading_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trades_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          tier: string;
          tier_expires_at: string | null;
          paper_balance: number;
          binance_connected: boolean;
          binance_api_key_encrypted: string | null;
          binance_api_secret_encrypted: string | null;
          email_on_trade: boolean;
          email_on_crash: boolean;
          email_daily_digest: boolean;
          default_risk_level: string | null;
          created_at: string;
          updated_at: string;
          dismissed_get_started_card: boolean;
          onboarding_completed_at: string | null;
          onboarding_step: number;
          learning_progress: Json;
          earned_badges: Json;
          full_name: string | null;
          email: string | null;
          status: string | null;
          binance_api_key_id: string | null;
          binance_api_secret_id: string | null;
          setup_completed_at: string | null;
          onboarding_dismissed_at: string | null;
          locale: string | null;
          provider: string | null;
          google_id: string | null;
          microsoft_id: string | null;
          role: string | null;
          trading_experience: string | null;
          preferred_trading_mode: string | null;
          risk_tolerance: string | null;
          onboarding_started_at: string | null;
          onboarding_completed: boolean | null;
          show_on_leaderboard: boolean | null;
          user_id: string;
          subscription_status: string;
          subscription_tier: string;
          paper_trades_count: number;
          ui_theme: string;
          risk_accepted_at: string | null;
          live_phase: string;
          is_priority: boolean | null;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          tier?: string;
          tier_expires_at?: string | null;
          paper_balance?: number;
          binance_connected?: boolean;
          binance_api_key_encrypted?: string | null;
          binance_api_secret_encrypted?: string | null;
          email_on_trade?: boolean;
          email_on_crash?: boolean;
          email_daily_digest?: boolean;
          default_risk_level?: string | null;
          created_at?: string;
          updated_at?: string;
          dismissed_get_started_card?: boolean;
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          learning_progress?: Json;
          earned_badges?: Json;
          full_name?: string | null;
          email?: string | null;
          status?: string | null;
          binance_api_key_id?: string | null;
          binance_api_secret_id?: string | null;
          setup_completed_at?: string | null;
          onboarding_dismissed_at?: string | null;
          locale?: string | null;
          provider?: string | null;
          google_id?: string | null;
          microsoft_id?: string | null;
          role?: string | null;
          trading_experience?: string | null;
          preferred_trading_mode?: string | null;
          risk_tolerance?: string | null;
          onboarding_started_at?: string | null;
          onboarding_completed?: boolean | null;
          show_on_leaderboard?: boolean | null;
          user_id: string;
          subscription_status?: string;
          subscription_tier?: string;
          paper_trades_count?: number;
          ui_theme?: string;
          risk_accepted_at?: string | null;
          live_phase?: string;
          is_priority?: boolean | null;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          tier?: string;
          tier_expires_at?: string | null;
          paper_balance?: number;
          binance_connected?: boolean;
          binance_api_key_encrypted?: string | null;
          binance_api_secret_encrypted?: string | null;
          email_on_trade?: boolean;
          email_on_crash?: boolean;
          email_daily_digest?: boolean;
          default_risk_level?: string | null;
          created_at?: string;
          updated_at?: string;
          dismissed_get_started_card?: boolean;
          onboarding_completed_at?: string | null;
          onboarding_step?: number;
          learning_progress?: Json;
          earned_badges?: Json;
          full_name?: string | null;
          email?: string | null;
          status?: string | null;
          binance_api_key_id?: string | null;
          binance_api_secret_id?: string | null;
          setup_completed_at?: string | null;
          onboarding_dismissed_at?: string | null;
          locale?: string | null;
          provider?: string | null;
          google_id?: string | null;
          microsoft_id?: string | null;
          role?: string | null;
          trading_experience?: string | null;
          preferred_trading_mode?: string | null;
          risk_tolerance?: string | null;
          onboarding_started_at?: string | null;
          onboarding_completed?: boolean | null;
          show_on_leaderboard?: boolean | null;
          user_id?: string;
          subscription_status?: string;
          subscription_tier?: string;
          paper_trades_count?: number;
          ui_theme?: string;
          risk_accepted_at?: string | null;
          live_phase?: string;
          is_priority?: boolean | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard_metrics: {
        Args: {
          p_user_id: string;
          p_mode: string;
          p_statuses: string[];
        };
        Returns: {
          total_pnl: number;
          total_trades: number;
          winning_trades: number;
          losing_trades: number;
          total_deployed_capital: number;
          starting_capital: number;
          session_count: number;
          avg_session_capital: number;
        }[];
      };
      get_trades_paginated: {
        Args: {
          p_user_id: string;
          p_cursor: string;
          p_limit: number;
          p_mode: string;
          p_trade_statuses: string[];
          p_session_statuses: string[];
          p_side: string;
          p_pair: string;
          p_search: string;
          p_from: string;
          p_to: string;
        };
        Returns: {
          id: string;
          session_id: string;
          trading_pair: string;
          side: string;
          status: string;
          price: number;
          quantity: number;
          fee: number;
          total_value: number;
          realized_pnl: number;
          effective_pnl: number;
          executed_at: string;
          created_at: string;
          next_cursor: string;
        }[];
      };
      get_trading_analytics: {
        Args: {
          p_user_id: string;
          p_mode: string;
          p_trade_statuses: string[];
          p_session_statuses: string[];
          p_side: string;
          p_pair: string;
          p_search: string;
          p_from: string;
          p_to: string;
        };
        Returns: {
          total_trades: number;
          winning_trades: number;
          losing_trades: number;
          win_rate: number;
          total_pnl: number;
          total_fees: number;
          starting_capital: number;
          max_drawdown_pct: number;
          profit_factor: number;
          best_pair: string;
          best_pair_pnl: number;
          worst_pair: string;
          worst_pair_pnl: number;
          best_session_id: string;
          best_session_pnl: number;
          worst_session_id: string;
          worst_session_pnl: number;
          trades_by_day: Json;
          trades_by_symbol: Json;
        }[];
      };
      calculate_effective_pnl: {
        Args: {
          p_realized_pnl: number;
          p_total_value: number;
          p_side: string;
        };
        Returns: number;
      };
    };
    Enums: {
      trading_mode: "paper" | "live";
      session_status: "active" | "paused" | "crashed" | "stopped";
      trade_status: "pending" | "filled" | "partially_filled" | "cancelled" | "failed";
      trade_side: "buy" | "sell";
      order_type: "market" | "limit" | "stop_loss" | "take_profit";
      risk_level: "conservative" | "balanced" | "aggressive";
    };
  };
};
