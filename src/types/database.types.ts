export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      _session_migration_map: {
        Row: {
          migrated_at: string | null
          new_session_id: string
          old_session_id: string
          source_table: string
        }
        Insert: {
          migrated_at?: string | null
          new_session_id: string
          old_session_id: string
          source_table: string
        }
        Update: {
          migrated_at?: string | null
          new_session_id?: string
          old_session_id?: string
          source_table?: string
        }
        Relationships: []
      }
      _trade_migration_map: {
        Row: {
          migrated_at: string | null
          new_trade_id: string
          old_trade_id: string
          source_table: string
        }
        Insert: {
          migrated_at?: string | null
          new_trade_id: string
          old_trade_id: string
          source_table: string
        }
        Update: {
          migrated_at?: string | null
          new_trade_id?: string
          old_trade_id?: string
          source_table?: string
        }
        Relationships: []
      }
      ab_experiments: {
        Row: {
          anonymous_id: string | null
          converted: boolean
          created_at: string
          id: string
          name: string
          user_id: string | null
          variant: string
        }
        Insert: {
          anonymous_id?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
          variant: string
        }
        Update: {
          anonymous_id?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
          variant?: string
        }
        Relationships: []
      }
      admin_actions: {
        Row: {
          action: string
          admin_email: string
          admin_id: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_email: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_actions_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alerts: {
        Row: {
          acknowledged: boolean | null
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string | null
          id: string
          message: string
          severity: string
          type: string
        }
        Insert: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: string
          message: string
          severity: string
          type: string
        }
        Update: {
          acknowledged?: boolean | null
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string | null
          id?: string
          message?: string
          severity?: string
          type?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          payload: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          payload?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          payload?: Json
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          action_url: string | null
          admin_id: string | null
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          priority: string | null
          read: boolean | null
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          admin_id?: string | null
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          priority?: string | null
          read?: boolean | null
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "admin_notifications_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_sync: {
        Row: {
          created_at: string
          id: string
          payload: Json
          source: string
          status: string
          summary: Json
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          source?: string
          status?: string
          summary?: Json
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          source?: string
          status?: string
          summary?: Json
        }
        Relationships: []
      }
      ai_agent_stats: {
        Row: {
          agent_id: string
          avg_r_multiple: number | null
          id: string
          last_updated_at: string
          max_drawdown: number | null
          sharpe_like_score: number | null
          symbol: string
          timeframe: string
          trades_count: number
          win_rate: number | null
        }
        Insert: {
          agent_id: string
          avg_r_multiple?: number | null
          id?: string
          last_updated_at?: string
          max_drawdown?: number | null
          sharpe_like_score?: number | null
          symbol: string
          timeframe?: string
          trades_count?: number
          win_rate?: number | null
        }
        Update: {
          agent_id?: string
          avg_r_multiple?: number | null
          id?: string
          last_updated_at?: string
          max_drawdown?: number | null
          sharpe_like_score?: number | null
          symbol?: string
          timeframe?: string
          trades_count?: number
          win_rate?: number | null
        }
        Relationships: []
      }
      ai_analysis_logs: {
        Row: {
          executed: boolean | null
          fear_greed_index: number | null
          id: string
          prediction_action: string
          prediction_confidence: number
          reason: string | null
          rsi: number | null
          sentiment_score: number
          stop_loss: number | null
          symbol: string
          target_price: number | null
          timestamp: string | null
          trade_id: string | null
          user_id: string
        }
        Insert: {
          executed?: boolean | null
          fear_greed_index?: number | null
          id?: string
          prediction_action: string
          prediction_confidence: number
          reason?: string | null
          rsi?: number | null
          sentiment_score: number
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
          timestamp?: string | null
          trade_id?: string | null
          user_id: string
        }
        Update: {
          executed?: boolean | null
          fear_greed_index?: number | null
          id?: string
          prediction_action?: string
          prediction_confidence?: number
          reason?: string | null
          rsi?: number | null
          sentiment_score?: number
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
          timestamp?: string | null
          trade_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_analysis_logs_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "paper_trades"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_autopilot_configs: {
        Row: {
          avg_loss_nok: number | null
          avg_win_nok: number | null
          capital_per_pair: Json | null
          consecutive_losses: number | null
          created_at: string | null
          detected_regime: string | null
          expectancy: number | null
          id: string
          last_rebalance_at: string | null
          max_drawdown_pct: number | null
          max_pairs: number
          negative_expectancy_since: string | null
          profit_factor: number | null
          risk_appetite: string
          selected_pairs: Json | null
          selected_strategy: string | null
          sharpe_ratio: number | null
          started_at: string | null
          status: string
          total_capital_nok: number
          total_pnl_nok: number | null
          total_pnl_pct: number | null
          total_trades_count: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avg_loss_nok?: number | null
          avg_win_nok?: number | null
          capital_per_pair?: Json | null
          consecutive_losses?: number | null
          created_at?: string | null
          detected_regime?: string | null
          expectancy?: number | null
          id?: string
          last_rebalance_at?: string | null
          max_drawdown_pct?: number | null
          max_pairs?: number
          negative_expectancy_since?: string | null
          profit_factor?: number | null
          risk_appetite: string
          selected_pairs?: Json | null
          selected_strategy?: string | null
          sharpe_ratio?: number | null
          started_at?: string | null
          status?: string
          total_capital_nok?: number
          total_pnl_nok?: number | null
          total_pnl_pct?: number | null
          total_trades_count?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avg_loss_nok?: number | null
          avg_win_nok?: number | null
          capital_per_pair?: Json | null
          consecutive_losses?: number | null
          created_at?: string | null
          detected_regime?: string | null
          expectancy?: number | null
          id?: string
          last_rebalance_at?: string | null
          max_drawdown_pct?: number | null
          max_pairs?: number
          negative_expectancy_since?: string | null
          profit_factor?: number | null
          risk_appetite?: string
          selected_pairs?: Json | null
          selected_strategy?: string | null
          sharpe_ratio?: number | null
          started_at?: string | null
          status?: string
          total_capital_nok?: number
          total_pnl_nok?: number | null
          total_pnl_pct?: number | null
          total_trades_count?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          cache_key: string
          created_at: string | null
          expires_at: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          cache_key: string
          created_at?: string | null
          expires_at: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          cache_key?: string
          created_at?: string | null
          expires_at?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      ai_decision_log: {
        Row: {
          adjustments: Json
          created_at: string
          explanation: string
          id: string
          idempotency_key: string | null
          idempotency_scope: string
          opik_trace_id: string | null
          performance_drawdown: number | null
          performance_last_30_days: number | null
          performance_last_7_days: number | null
          performance_sharpe_ratio: number | null
          performance_total_return: number | null
          performance_volatility: number | null
          performance_win_rate: number | null
          sentiment_classification: string
          sentiment_confidence: number
          sentiment_reasoning: string | null
          sentiment_recommendation: string
          sentiment_value: number
          strategy_id: string
          timestamp: string
          user_id: string
        }
        Insert: {
          adjustments?: Json
          created_at?: string
          explanation: string
          id?: string
          idempotency_key?: string | null
          idempotency_scope?: string
          opik_trace_id?: string | null
          performance_drawdown?: number | null
          performance_last_30_days?: number | null
          performance_last_7_days?: number | null
          performance_sharpe_ratio?: number | null
          performance_total_return?: number | null
          performance_volatility?: number | null
          performance_win_rate?: number | null
          sentiment_classification: string
          sentiment_confidence: number
          sentiment_reasoning?: string | null
          sentiment_recommendation: string
          sentiment_value: number
          strategy_id: string
          timestamp?: string
          user_id: string
        }
        Update: {
          adjustments?: Json
          created_at?: string
          explanation?: string
          id?: string
          idempotency_key?: string | null
          idempotency_scope?: string
          opik_trace_id?: string | null
          performance_drawdown?: number | null
          performance_last_30_days?: number | null
          performance_last_7_days?: number | null
          performance_sharpe_ratio?: number | null
          performance_total_return?: number | null
          performance_volatility?: number | null
          performance_win_rate?: number | null
          sentiment_classification?: string
          sentiment_confidence?: number
          sentiment_reasoning?: string | null
          sentiment_recommendation?: string
          sentiment_value?: number
          strategy_id?: string
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_feature_store: {
        Row: {
          as_of: string
          checksum: string | null
          created_at: string
          features: Json
          id: string
          source: string | null
          symbol: string
          timeframe: string
        }
        Insert: {
          as_of?: string
          checksum?: string | null
          created_at?: string
          features?: Json
          id?: string
          source?: string | null
          symbol: string
          timeframe?: string
        }
        Update: {
          as_of?: string
          checksum?: string | null
          created_at?: string
          features?: Json
          id?: string
          source?: string | null
          symbol?: string
          timeframe?: string
        }
        Relationships: []
      }
      ai_signal_outcomes: {
        Row: {
          created_at: string
          holding_time_seconds: number | null
          id: string
          pnl: number | null
          r_multiple: number | null
          signal_id: string | null
          sl_hit: boolean | null
          tp_hit: boolean | null
          trade_id: string | null
        }
        Insert: {
          created_at?: string
          holding_time_seconds?: number | null
          id?: string
          pnl?: number | null
          r_multiple?: number | null
          signal_id?: string | null
          sl_hit?: boolean | null
          tp_hit?: boolean | null
          trade_id?: string | null
        }
        Update: {
          created_at?: string
          holding_time_seconds?: number | null
          id?: string
          pnl?: number | null
          r_multiple?: number | null
          signal_id?: string | null
          sl_hit?: boolean | null
          tp_hit?: boolean | null
          trade_id?: string | null
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          event_type: string
          id: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name?: string
          event_type?: string
          id?: never
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          event_type?: string
          id?: never
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          created_at: string | null
          endpoint: string
          error_message: string | null
          id: string
          method: string
          response_time_ms: number | null
          status_code: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          error_message?: string | null
          id?: string
          method: string
          response_time_ms?: number | null
          status_code?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          error_message?: string | null
          id?: string
          method?: string
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      app_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          ip_address: unknown
          page_path: string | null
          props: Json | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          ip_address?: unknown
          page_path?: string | null
          props?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          ip_address?: unknown
          page_path?: string | null
          props?: Json | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      archived_trade_summaries: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          session_id: string
          total_pnl: number
          total_trades: number
          trade_data: Json
          user_id: string
          win_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          session_id: string
          total_pnl: number
          total_trades: number
          trade_data: Json
          user_id: string
          win_rate: number
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          session_id?: string
          total_pnl?: number
          total_trades?: number
          trade_data?: Json
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string
          after_state: Json | null
          before_state: Json | null
          id: string
          ip_address: unknown
          metadata: Json | null
          occurred_at: string
          resource_id: string | null
          resource_type: string
          sequence: number
          session_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: string
          after_state?: Json | null
          before_state?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string
          resource_id?: string | null
          resource_type: string
          sequence?: number
          session_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string
          after_state?: Json | null
          before_state?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          occurred_at?: string
          resource_id?: string | null
          resource_type?: string
          sequence?: number
          session_id?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          created_at: string | null
          evidence_hash: string
          evidence_id: string
          id: string
          order_id: string
          payload: Json
          s3_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          evidence_hash: string
          evidence_id: string
          id?: string
          order_id: string
          payload: Json
          s3_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          evidence_hash?: string
          evidence_id?: string
          id?: string
          order_id?: string
          payload?: Json
          s3_path?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          id: string
          metadata: Json | null
          signal_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          id?: string
          metadata?: Json | null
          signal_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          id?: string
          metadata?: Json | null
          signal_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trade_daily_stats: {
        Row: {
          created_at: string | null
          date: string | null
          failed_trades: number | null
          id: string
          largest_loss: number | null
          largest_win: number | null
          successful_trades: number | null
          total_profit_loss: number | null
          total_profit_loss_percent: number | null
          total_trades: number | null
          trade_date: string
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          failed_trades?: number | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          successful_trades?: number | null
          total_profit_loss?: number | null
          total_profit_loss_percent?: number | null
          total_trades?: number | null
          trade_date?: string
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          created_at?: string | null
          date?: string | null
          failed_trades?: number | null
          id?: string
          largest_loss?: number | null
          largest_win?: number | null
          successful_trades?: number | null
          total_profit_loss?: number | null
          total_profit_loss_percent?: number | null
          total_trades?: number | null
          trade_date?: string
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      auto_trade_log: {
        Row: {
          action: string
          amount_nok: number | null
          bot_config_id: string | null
          created_at: string | null
          error_message: string | null
          exchange_order_id: string | null
          executed_at: string | null
          id: string
          is_paper: boolean | null
          price_at_action: number | null
          reason: string | null
          sentiment_score: number | null
          status: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          action: string
          amount_nok?: number | null
          bot_config_id?: string | null
          created_at?: string | null
          error_message?: string | null
          exchange_order_id?: string | null
          executed_at?: string | null
          id?: string
          is_paper?: boolean | null
          price_at_action?: number | null
          reason?: string | null
          sentiment_score?: number | null
          status?: string | null
          symbol?: string
          user_id: string
        }
        Update: {
          action?: string
          amount_nok?: number | null
          bot_config_id?: string | null
          created_at?: string | null
          error_message?: string | null
          exchange_order_id?: string | null
          executed_at?: string | null
          id?: string
          is_paper?: boolean | null
          price_at_action?: number | null
          reason?: string | null
          sentiment_score?: number | null
          status?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trade_log_bot_config_id_fkey"
            columns: ["bot_config_id"]
            isOneToOne: false
            referencedRelation: "bot_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trade_settings: {
        Row: {
          allowed_symbols: string[] | null
          auto_trading_enabled: boolean | null
          created_at: string | null
          daily_loss_limit_percent: number | null
          daily_trade_limit: number | null
          id: string
          max_concurrent_positions: number | null
          max_position_percent: number | null
          min_confidence: number | null
          min_order_size_usdt: number | null
          notify_on_daily_limit: boolean | null
          notify_on_sl_tp: boolean | null
          notify_on_trade: boolean | null
          risk_profile: string | null
          stop_loss_percent: number | null
          take_profit_percent: number | null
          updated_at: string | null
          use_dynamic_stop_loss: boolean | null
          user_id: string
        }
        Insert: {
          allowed_symbols?: string[] | null
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          daily_loss_limit_percent?: number | null
          daily_trade_limit?: number | null
          id?: string
          max_concurrent_positions?: number | null
          max_position_percent?: number | null
          min_confidence?: number | null
          min_order_size_usdt?: number | null
          notify_on_daily_limit?: boolean | null
          notify_on_sl_tp?: boolean | null
          notify_on_trade?: boolean | null
          risk_profile?: string | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          updated_at?: string | null
          use_dynamic_stop_loss?: boolean | null
          user_id: string
        }
        Update: {
          allowed_symbols?: string[] | null
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          daily_loss_limit_percent?: number | null
          daily_trade_limit?: number | null
          id?: string
          max_concurrent_positions?: number | null
          max_position_percent?: number | null
          min_confidence?: number | null
          min_order_size_usdt?: number | null
          notify_on_daily_limit?: boolean | null
          notify_on_sl_tp?: boolean | null
          notify_on_trade?: boolean | null
          risk_profile?: string | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          updated_at?: string | null
          use_dynamic_stop_loss?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      auto_trading_backtests: {
        Row: {
          confidence_score: number
          created_at: string | null
          end_date: string
          id: string
          initial_capital: number
          is_valid: boolean
          recommendation: string
          result: Json
          start_date: string
          strategy_id: string
          symbols: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string | null
          end_date: string
          id?: string
          initial_capital?: number
          is_valid?: boolean
          recommendation?: string
          result: Json
          start_date: string
          strategy_id: string
          symbols?: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string | null
          end_date?: string
          id?: string
          initial_capital?: number
          is_valid?: boolean
          recommendation?: string
          result?: Json
          start_date?: string
          strategy_id?: string
          symbols?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_backtests_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "auto_trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_circuit_breaker_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          is_resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          resume_at: string | null
          session_id: string
          trigger_type: string
          trigger_value: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          resume_at?: string | null
          session_id: string
          trigger_type: string
          trigger_value?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          is_resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          resume_at?: string | null
          session_id?: string
          trigger_type?: string
          trigger_value?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_circuit_breaker_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "auto_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_configs: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          last_executed_at: string | null
          risk_profile_id: string | null
          strategy: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_executed_at?: string | null
          risk_profile_id?: string | null
          strategy: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          last_executed_at?: string | null
          risk_profile_id?: string | null
          strategy?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_configs_risk_profile_id_fkey"
            columns: ["risk_profile_id"]
            isOneToOne: false
            referencedRelation: "risk_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_daily_metrics: {
        Row: {
          circuit_breaker_triggered: boolean | null
          created_at: string | null
          cumulative_pnl_nok: number | null
          cumulative_pnl_pct: number | null
          daily_loss_limit_reached: boolean | null
          daily_pnl_nok: number | null
          daily_pnl_pct: number | null
          date: string
          ending_capital_nok: number
          id: string
          losing_trades: number | null
          max_drawdown_pct: number | null
          profit_factor: number | null
          session_id: string
          starting_capital_nok: number
          trades_count: number | null
          user_id: string
          win_rate_pct: number | null
          winning_trades: number | null
        }
        Insert: {
          circuit_breaker_triggered?: boolean | null
          created_at?: string | null
          cumulative_pnl_nok?: number | null
          cumulative_pnl_pct?: number | null
          daily_loss_limit_reached?: boolean | null
          daily_pnl_nok?: number | null
          daily_pnl_pct?: number | null
          date: string
          ending_capital_nok: number
          id?: string
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          profit_factor?: number | null
          session_id: string
          starting_capital_nok: number
          trades_count?: number | null
          user_id: string
          win_rate_pct?: number | null
          winning_trades?: number | null
        }
        Update: {
          circuit_breaker_triggered?: boolean | null
          created_at?: string | null
          cumulative_pnl_nok?: number | null
          cumulative_pnl_pct?: number | null
          daily_loss_limit_reached?: boolean | null
          daily_pnl_nok?: number | null
          daily_pnl_pct?: number | null
          date?: string
          ending_capital_nok?: number
          id?: string
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          profit_factor?: number | null
          session_id?: string
          starting_capital_nok?: number
          trades_count?: number | null
          user_id?: string
          win_rate_pct?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_daily_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "auto_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_markets: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_trading_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_trading_markets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_profit_extractions: {
        Row: {
          capital_after_nok: number
          capital_before_nok: number
          created_at: string | null
          extracted_amount_nok: number
          extracted_pct: number
          extraction_method: string | null
          id: string
          remaining_profit_nok: number
          session_id: string
          total_profit_nok: number
          total_profit_pct: number
          user_id: string
        }
        Insert: {
          capital_after_nok: number
          capital_before_nok: number
          created_at?: string | null
          extracted_amount_nok: number
          extracted_pct: number
          extraction_method?: string | null
          id?: string
          remaining_profit_nok: number
          session_id: string
          total_profit_nok: number
          total_profit_pct: number
          user_id: string
        }
        Update: {
          capital_after_nok?: number
          capital_before_nok?: number
          created_at?: string | null
          extracted_amount_nok?: number
          extracted_pct?: number
          extraction_method?: string | null
          id?: string
          remaining_profit_nok?: number
          session_id?: string
          total_profit_nok?: number
          total_profit_pct?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_profit_extractions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "auto_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_runs: {
        Row: {
          allocated_in_open_trades_nok: number | null
          available_auto_budget_nok: number | null
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          max_auto_budget_nok: number | null
          run_timestamp: string | null
          signals_evaluated: number | null
          status: string
          total_order_value_nok: number | null
          trades_bought: number | null
          trades_placed: number | null
          trades_sold: number | null
          user_id: string
        }
        Insert: {
          allocated_in_open_trades_nok?: number | null
          available_auto_budget_nok?: number | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          max_auto_budget_nok?: number | null
          run_timestamp?: string | null
          signals_evaluated?: number | null
          status?: string
          total_order_value_nok?: number | null
          trades_bought?: number | null
          trades_placed?: number | null
          trades_sold?: number | null
          user_id: string
        }
        Update: {
          allocated_in_open_trades_nok?: number | null
          available_auto_budget_nok?: number | null
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          max_auto_budget_nok?: number | null
          run_timestamp?: string | null
          signals_evaluated?: number | null
          status?: string
          total_order_value_nok?: number | null
          trades_bought?: number | null
          trades_placed?: number | null
          trades_sold?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_trading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_trading_runs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_sessions: {
        Row: {
          created_at: string | null
          id: string
          losing_trades: number | null
          max_drawdown_pct: number | null
          name: string
          status: string | null
          strategy_type: string
          total_pnl_nok: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          name: string
          status?: string | null
          strategy_type: string
          total_pnl_nok?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          name?: string
          status?: string | null
          strategy_type?: string
          total_pnl_nok?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_onboarding_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_settings: {
        Row: {
          auto_trading_enabled: boolean | null
          created_at: string | null
          fixed_order_amount_nok: number | null
          id: string
          ma_long: number | null
          ma_short: number | null
          max_auto_allocation_percent: number
          max_trades_per_day_per_coin: number | null
          min_time_between_trades_minutes: number | null
          order_mode: string
          order_percent_of_auto_budget: number | null
          risk_level: string
          rsi_overbought: number | null
          rsi_oversold: number | null
          stop_loss_percent: number | null
          take_profit_percent: number | null
          updated_at: string | null
          use_compounding: boolean | null
          user_id: string
        }
        Insert: {
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          fixed_order_amount_nok?: number | null
          id?: string
          ma_long?: number | null
          ma_short?: number | null
          max_auto_allocation_percent?: number
          max_trades_per_day_per_coin?: number | null
          min_time_between_trades_minutes?: number | null
          order_mode?: string
          order_percent_of_auto_budget?: number | null
          risk_level?: string
          rsi_overbought?: number | null
          rsi_oversold?: number | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          updated_at?: string | null
          use_compounding?: boolean | null
          user_id: string
        }
        Update: {
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          fixed_order_amount_nok?: number | null
          id?: string
          ma_long?: number | null
          ma_short?: number | null
          max_auto_allocation_percent?: number
          max_trades_per_day_per_coin?: number | null
          min_time_between_trades_minutes?: number | null
          order_mode?: string
          order_percent_of_auto_budget?: number | null
          risk_level?: string
          rsi_overbought?: number | null
          rsi_oversold?: number | null
          stop_loss_percent?: number | null
          take_profit_percent?: number | null
          updated_at?: string | null
          use_compounding?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_trading_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auto_trading_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "auto_trading_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_strategies: {
        Row: {
          allow_long: boolean | null
          allow_short: boolean | null
          allowed_symbols: string[] | null
          capital_nok: number
          capital_usdt: number
          created_at: string | null
          daily_loss_limit_pct: number | null
          description: string | null
          expected_annual_return_pct: number | null
          id: string
          is_active: boolean | null
          max_leverage: number | null
          max_position_size_pct: number | null
          max_trades_per_day: number | null
          name: string | null
          risk_level: string | null
          stop_loss_pct: number | null
          strategy_id: string | null
          take_profit_pct: number | null
          trading_mode: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          allow_long?: boolean | null
          allow_short?: boolean | null
          allowed_symbols?: string[] | null
          capital_nok?: number
          capital_usdt?: number
          created_at?: string | null
          daily_loss_limit_pct?: number | null
          description?: string | null
          expected_annual_return_pct?: number | null
          id?: string
          is_active?: boolean | null
          max_leverage?: number | null
          max_position_size_pct?: number | null
          max_trades_per_day?: number | null
          name?: string | null
          risk_level?: string | null
          stop_loss_pct?: number | null
          strategy_id?: string | null
          take_profit_pct?: number | null
          trading_mode?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          allow_long?: boolean | null
          allow_short?: boolean | null
          allowed_symbols?: string[] | null
          capital_nok?: number
          capital_usdt?: number
          created_at?: string | null
          daily_loss_limit_pct?: number | null
          description?: string | null
          expected_annual_return_pct?: number | null
          id?: string
          is_active?: boolean | null
          max_leverage?: number | null
          max_position_size_pct?: number | null
          max_trades_per_day?: number | null
          name?: string | null
          risk_level?: string | null
          stop_loss_pct?: number | null
          strategy_id?: string | null
          take_profit_pct?: number | null
          trading_mode?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      autopilot_state: {
        Row: {
          activated: boolean
          created_at: string
          current_equity_usdc: number
          drawdown_kill: boolean
          five_pair_activated: boolean
          grid_levels: Json
          initial_equity_usdc: number
          last_fill_at: string | null
          last_run: string | null
          realized_profit_usdc: number
          total_fills: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activated?: boolean
          created_at?: string
          current_equity_usdc?: number
          drawdown_kill?: boolean
          five_pair_activated?: boolean
          grid_levels?: Json
          initial_equity_usdc?: number
          last_fill_at?: string | null
          last_run?: string | null
          realized_profit_usdc?: number
          total_fills?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activated?: boolean
          created_at?: string
          current_equity_usdc?: number
          drawdown_kill?: boolean
          five_pair_activated?: boolean
          grid_levels?: Json
          initial_equity_usdc?: number
          last_fill_at?: string | null
          last_run?: string | null
          realized_profit_usdc?: number
          total_fills?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backtest_results: {
        Row: {
          created_at: string | null
          equity_curve: Json | null
          id: string
          initial_capital: number
          interval: string
          max_drawdown_pct: number
          metrics: Json | null
          profit_factor: number | null
          sharpe_ratio: number | null
          strategy: string
          strategy_id: string | null
          symbol: string
          total_return_pct: number
          total_trades: number
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
        }
        Insert: {
          created_at?: string | null
          equity_curve?: Json | null
          id?: string
          initial_capital: number
          interval: string
          max_drawdown_pct: number
          metrics?: Json | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          strategy: string
          strategy_id?: string | null
          symbol: string
          total_return_pct: number
          total_trades?: number
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Update: {
          created_at?: string | null
          equity_curve?: Json | null
          id?: string
          initial_capital?: number
          interval?: string
          max_drawdown_pct?: number
          metrics?: Json | null
          profit_factor?: number | null
          sharpe_ratio?: number | null
          strategy?: string
          strategy_id?: string | null
          symbol?: string
          total_return_pct?: number
          total_trades?: number
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      backup_capital_20260803: {
        Row: {
          backed_up_at: string | null
          balance: number | null
          capital_nok: number | null
          pair: string | null
          row_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          user_id: string | null
        }
        Insert: {
          backed_up_at?: string | null
          balance?: number | null
          capital_nok?: number | null
          pair?: string | null
          row_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          user_id?: string | null
        }
        Update: {
          backed_up_at?: string | null
          balance?: number | null
          capital_nok?: number | null
          pair?: string | null
          row_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      backup_capital_20260804: {
        Row: {
          backed_up_at: string | null
          balance: number | null
          capital_nok: number | null
          pair: string | null
          row_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          user_id: string | null
        }
        Insert: {
          backed_up_at?: string | null
          balance?: number | null
          capital_nok?: number | null
          pair?: string | null
          row_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          user_id?: string | null
        }
        Update: {
          backed_up_at?: string | null
          balance?: number | null
          capital_nok?: number | null
          pair?: string | null
          row_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          condition_type: string
          condition_value: Json | null
          created_at: string | null
          description_en: string | null
          description_no: string | null
          icon: string
          id: string
          name_en: string
          name_no: string
          xp_reward: number | null
        }
        Insert: {
          condition_type: string
          condition_value?: Json | null
          created_at?: string | null
          description_en?: string | null
          description_no?: string | null
          icon: string
          id: string
          name_en: string
          name_no: string
          xp_reward?: number | null
        }
        Update: {
          condition_type?: string
          condition_value?: Json | null
          created_at?: string | null
          description_en?: string | null
          description_no?: string | null
          icon?: string
          id?: string
          name_en?: string
          name_no?: string
          xp_reward?: number | null
        }
        Relationships: []
      }
      balance_sync_audit: {
        Row: {
          check_type: string
          created_at: string | null
          details: Json | null
          id: string
          resolved_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          check_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resolved_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          check_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resolved_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          content: string
          created_at: string | null
          id: string
          status: string | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          status?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          status?: string | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_signups: {
        Row: {
          created_at: string | null
          email: string
          erfaring: string
          handle: string | null
          id: string
          laeringsmaal: string[]
          student_nummer: number
          tokens_credited: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          erfaring: string
          handle?: string | null
          id?: string
          laeringsmaal: string[]
          student_nummer: number
          tokens_credited?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          erfaring?: string
          handle?: string | null
          id?: string
          laeringsmaal?: string[]
          student_nummer?: number
          tokens_credited?: boolean | null
        }
        Relationships: []
      }
      beta_user_metrics: {
        Row: {
          created_at: string | null
          daily_pnl: number | null
          date: string
          ending_balance: number | null
          id: string
          initial_capital: number | null
          kill_switch_count: number | null
          losing_trades: number | null
          total_trades: number | null
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          daily_pnl?: number | null
          date: string
          ending_balance?: number | null
          id?: string
          initial_capital?: number | null
          kill_switch_count?: number | null
          losing_trades?: number | null
          total_trades?: number | null
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          daily_pnl?: number | null
          date?: string
          ending_balance?: number | null
          id?: string
          initial_capital?: number | null
          kill_switch_count?: number | null
          losing_trades?: number | null
          total_trades?: number | null
          user_id?: string
          winning_trades?: number | null
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          amount_nok: number | null
          created_at: string | null
          event_type: string
          from_tier: string | null
          id: string
          metadata: Json | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          to_tier: string | null
          user_id: string
        }
        Insert: {
          amount_nok?: number | null
          created_at?: string | null
          event_type: string
          from_tier?: string | null
          id?: string
          metadata?: Json | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          to_tier?: string | null
          user_id: string
        }
        Update: {
          amount_nok?: number | null
          created_at?: string | null
          event_type?: string
          from_tier?: string | null
          id?: string
          metadata?: Json | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          to_tier?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bot_configs: {
        Row: {
          ai_adaptive_enabled: boolean | null
          bot_name: string
          created_at: string | null
          dca_amount_nok: number | null
          dca_interval_minutes: number | null
          id: string
          is_active: boolean | null
          is_paper_trade: boolean | null
          last_ai_adjustment_at: string | null
          max_position_size_percent: number | null
          status: string
          stop_loss_percent: number | null
          strategy_type: string
          take_profit_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_adaptive_enabled?: boolean | null
          bot_name?: string
          created_at?: string | null
          dca_amount_nok?: number | null
          dca_interval_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_paper_trade?: boolean | null
          last_ai_adjustment_at?: string | null
          max_position_size_percent?: number | null
          status?: string
          stop_loss_percent?: number | null
          strategy_type?: string
          take_profit_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_adaptive_enabled?: boolean | null
          bot_name?: string
          created_at?: string | null
          dca_amount_nok?: number | null
          dca_interval_minutes?: number | null
          id?: string
          is_active?: boolean | null
          is_paper_trade?: boolean | null
          last_ai_adjustment_at?: string | null
          max_position_size_percent?: number | null
          status?: string
          stop_loss_percent?: number | null
          strategy_type?: string
          take_profit_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bot_health: {
        Row: {
          bot_name: string | null
          consecutive_errors: number | null
          created_at: string | null
          error_count: number | null
          id: string
          last_error: string | null
          last_heartbeat: string | null
          max_consecutive_errors: number | null
          metadata: Json | null
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          bot_name?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_error?: string | null
          last_heartbeat?: string | null
          max_consecutive_errors?: number | null
          metadata?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          bot_name?: string | null
          consecutive_errors?: number | null
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_error?: string | null
          last_heartbeat?: string | null
          max_consecutive_errors?: number | null
          metadata?: Json | null
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          browser: string | null
          component_name: string | null
          created_at: string | null
          device_type: string | null
          error_message: string
          error_stack: string | null
          error_type: string
          id: string
          metadata: Json | null
          notes: string | null
          os: string | null
          page_url: string
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          screen_size: string | null
          severity: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          browser?: string | null
          component_name?: string | null
          created_at?: string | null
          device_type?: string | null
          error_message: string
          error_stack?: string | null
          error_type: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          os?: string | null
          page_url: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          screen_size?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          browser?: string | null
          component_name?: string | null
          created_at?: string | null
          device_type?: string | null
          error_message?: string
          error_stack?: string | null
          error_type?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          os?: string | null
          page_url?: string
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          screen_size?: string | null
          severity?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cockpit_report_jobs: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string | null
          id: string
          signed_url: string | null
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          signed_url?: string | null
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          signed_url?: string | null
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_prices: {
        Row: {
          created_at: string
          high_24h: number | null
          id: string
          last_updated: string | null
          low_24h: number | null
          market_cap: number | null
          name: string
          price: number
          price_change_24h: number | null
          price_change_percent_24h: number | null
          symbol: string
          volume_24h: number | null
        }
        Insert: {
          created_at?: string
          high_24h?: number | null
          id?: string
          last_updated?: string | null
          low_24h?: number | null
          market_cap?: number | null
          name: string
          price?: number
          price_change_24h?: number | null
          price_change_percent_24h?: number | null
          symbol: string
          volume_24h?: number | null
        }
        Update: {
          created_at?: string
          high_24h?: number | null
          id?: string
          last_updated?: string | null
          low_24h?: number | null
          market_cap?: number | null
          name?: string
          price?: number
          price_change_24h?: number | null
          price_change_percent_24h?: number | null
          symbol?: string
          volume_24h?: number | null
        }
        Relationships: []
      }
      competition_entries: {
        Row: {
          competition_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          competition_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          competition_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conditional_orders: {
        Row: {
          created_at: string | null
          current_price_at_creation: number | null
          executed_at: string | null
          id: string
          limit_price: number
          mode: string
          quantity: number
          session_id: string
          side: string
          status: string
          symbol: string
          trailing_percent: number | null
          trigger_price: number
          triggered_at: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_price_at_creation?: number | null
          executed_at?: string | null
          id?: string
          limit_price: number
          mode: string
          quantity: number
          session_id: string
          side: string
          status?: string
          symbol: string
          trailing_percent?: number | null
          trigger_price: number
          triggered_at?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_price_at_creation?: number | null
          executed_at?: string | null
          id?: string
          limit_price?: number
          mode?: string
          quantity?: number
          session_id?: string
          side?: string
          status?: string
          symbol?: string
          trailing_percent?: number | null
          trigger_price?: number
          triggered_at?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conditional_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conditional_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conditional_orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_trade_queue: {
        Row: {
          allocation_percent: number
          created_at: string
          error_message: string | null
          follower_id: string
          id: string
          leader_id: string
          original_trade_id: string
          processed_at: string | null
          status: string
        }
        Insert: {
          allocation_percent?: number
          created_at?: string
          error_message?: string | null
          follower_id: string
          id?: string
          leader_id: string
          original_trade_id: string
          processed_at?: string | null
          status?: string
        }
        Update: {
          allocation_percent?: number
          created_at?: string
          error_message?: string | null
          follower_id?: string
          id?: string
          leader_id?: string
          original_trade_id?: string
          processed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_trade_queue_original_trade_id_fkey"
            columns: ["original_trade_id"]
            isOneToOne: false
            referencedRelation: "paper_trades_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_trade_queue_original_trade_id_fkey"
            columns: ["original_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_trading_external_follows: {
        Row: {
          allocation_percent: number
          created_at: string
          external_leader_id: string
          follower_id: string
          id: string
          is_active: boolean
          leader_source: string
          max_trade_amount: number | null
          scale_factor: number
          updated_at: string
        }
        Insert: {
          allocation_percent?: number
          created_at?: string
          external_leader_id: string
          follower_id: string
          id?: string
          is_active?: boolean
          leader_source?: string
          max_trade_amount?: number | null
          scale_factor?: number
          updated_at?: string
        }
        Update: {
          allocation_percent?: number
          created_at?: string
          external_leader_id?: string
          follower_id?: string
          id?: string
          is_active?: boolean
          leader_source?: string
          max_trade_amount?: number | null
          scale_factor?: number
          updated_at?: string
        }
        Relationships: []
      }
      copy_trading_follows: {
        Row: {
          allocation_percent: number
          created_at: string
          follower_id: string
          id: string
          is_active: boolean
          leader_id: string
          max_trade_amount: number | null
          scale_factor: number
          total_copied_trades: number
          total_pnl: number
          updated_at: string
        }
        Insert: {
          allocation_percent?: number
          created_at?: string
          follower_id: string
          id?: string
          is_active?: boolean
          leader_id: string
          max_trade_amount?: number | null
          scale_factor?: number
          total_copied_trades?: number
          total_pnl?: number
          updated_at?: string
        }
        Update: {
          allocation_percent?: number
          created_at?: string
          follower_id?: string
          id?: string
          is_active?: boolean
          leader_id?: string
          max_trade_amount?: number | null
          scale_factor?: number
          total_copied_trades?: number
          total_pnl?: number
          updated_at?: string
        }
        Relationships: []
      }
      copy_trading_mirror_trades: {
        Row: {
          copied_price: number
          copied_quantity: number
          copied_side: string
          created_at: string
          error_message: string | null
          follow_id: string
          id: string
          original_side: string
          original_symbol: string
          scale_factor: number
          session_id: string | null
          status: string
        }
        Insert: {
          copied_price?: number
          copied_quantity?: number
          copied_side: string
          created_at?: string
          error_message?: string | null
          follow_id: string
          id?: string
          original_side: string
          original_symbol: string
          scale_factor?: number
          session_id?: string | null
          status?: string
        }
        Update: {
          copied_price?: number
          copied_quantity?: number
          copied_side?: string
          created_at?: string
          error_message?: string | null
          follow_id?: string
          id?: string
          original_side?: string
          original_symbol?: string
          scale_factor?: number
          session_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_trading_mirror_trades_follow_id_fkey"
            columns: ["follow_id"]
            isOneToOne: false
            referencedRelation: "copy_trading_external_follows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_trading_mirror_trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_trading_mirror_trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_trading_mirror_trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      course_badges: {
        Row: {
          badge_color: string
          badge_description_en: string | null
          badge_description_no: string | null
          badge_emoji: string
          badge_label_en: string
          badge_label_no: string
          created_at: string | null
          id: string
          module_id: string
        }
        Insert: {
          badge_color?: string
          badge_description_en?: string | null
          badge_description_no?: string | null
          badge_emoji?: string
          badge_label_en: string
          badge_label_no: string
          created_at?: string | null
          id?: string
          module_id: string
        }
        Update: {
          badge_color?: string
          badge_description_en?: string | null
          badge_description_no?: string | null
          badge_emoji?: string
          badge_label_en?: string
          badge_label_no?: string
          created_at?: string | null
          id?: string
          module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_badges_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: true
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          content_en: string | null
          content_no: string | null
          created_at: string | null
          estimated_minutes: number | null
          id: string
          is_published: boolean | null
          module_id: string
          slug: string
          sort_order: number | null
          title_en: string
          title_no: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content_en?: string | null
          content_no?: string | null
          created_at?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id: string
          slug: string
          sort_order?: number | null
          title_en: string
          title_no: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content_en?: string | null
          content_no?: string | null
          created_at?: string | null
          estimated_minutes?: number | null
          id?: string
          is_published?: boolean | null
          module_id?: string
          slug?: string
          sort_order?: number | null
          title_en?: string
          title_no?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          created_at: string | null
          description_en: string | null
          description_no: string | null
          difficulty: string | null
          estimated_minutes: number | null
          icon: string | null
          id: string
          is_published: boolean | null
          is_required: boolean | null
          slug: string
          sort_order: number | null
          title_en: string
          title_no: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_en?: string | null
          description_no?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          is_required?: boolean | null
          slug: string
          sort_order?: number | null
          title_en: string
          title_no: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_en?: string | null
          description_no?: string | null
          difficulty?: string | null
          estimated_minutes?: number | null
          icon?: string | null
          id?: string
          is_published?: boolean | null
          is_required?: boolean | null
          slug?: string
          sort_order?: number | null
          title_en?: string
          title_no?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          duration_hours: number | null
          id: string
          image_url: string | null
          is_published: boolean | null
          level: string | null
          order_index: number | null
          price_nok: number | null
          short_description: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          level?: string | null
          order_index?: number | null
          price_nok?: number | null
          short_description?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          level?: string | null
          order_index?: number | null
          price_nok?: number | null
          short_description?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cron_execution_logs: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          job_name: string
          response_body: string | null
          status: string | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name: string
          response_body?: string | null
          status?: string | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          job_name?: string
          response_body?: string | null
          status?: string | null
        }
        Relationships: []
      }
      cron_health_events: {
        Row: {
          created: string | null
          detected_at: string
          error_detail: string | null
          id: number
          job_name: string | null
          response_id: number | null
          source: string
          status_code: number | null
          timed_out: boolean | null
        }
        Insert: {
          created?: string | null
          detected_at?: string
          error_detail?: string | null
          id?: never
          job_name?: string | null
          response_id?: number | null
          source: string
          status_code?: number | null
          timed_out?: boolean | null
        }
        Update: {
          created?: string | null
          detected_at?: string
          error_detail?: string | null
          id?: never
          job_name?: string | null
          response_id?: number | null
          source?: string
          status_code?: number | null
          timed_out?: boolean | null
        }
        Relationships: []
      }
      cron_job_runs: {
        Row: {
          created_at: string
          error_summary: string | null
          finished_at: string | null
          id: string
          job_name: string
          started_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          job_name: string
          started_at?: string | null
          status: string
        }
        Update: {
          created_at?: string
          error_summary?: string | null
          finished_at?: string | null
          id?: string
          job_name?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      dca_bots: {
        Row: {
          amount_per_month: number
          created_at: string | null
          crypto: string
          frequency: string
          id: string
          is_active: boolean | null
          next_purchase_at: string
          total_invested: number | null
          total_purchases: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_per_month: number
          created_at?: string | null
          crypto: string
          frequency: string
          id?: string
          is_active?: boolean | null
          next_purchase_at: string
          total_invested?: number | null
          total_purchases?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_per_month?: number
          created_at?: string | null
          crypto?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          next_purchase_at?: string
          total_invested?: number | null
          total_purchases?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      email_events: {
        Row: {
          created_at: string
          email_log_id: string | null
          event_type: string
          id: string
          raw_payload: Json | null
          recipient_email: string
          resend_email_id: string
          timestamp: string
        }
        Insert: {
          created_at?: string
          email_log_id?: string | null
          event_type: string
          id?: string
          raw_payload?: Json | null
          recipient_email: string
          resend_email_id: string
          timestamp?: string
        }
        Update: {
          created_at?: string
          email_log_id?: string | null
          event_type?: string
          id?: string
          raw_payload?: Json | null
          recipient_email?: string
          resend_email_id?: string
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_log_id_fkey"
            columns: ["email_log_id"]
            isOneToOne: false
            referencedRelation: "email_log"
            referencedColumns: ["id"]
          },
        ]
      }
      email_log: {
        Row: {
          bounce_count: number | null
          clicked_at: string | null
          complaint_count: number | null
          created_at: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          opened_at: string | null
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          bounce_count?: number | null
          clicked_at?: string | null
          complaint_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          user_id: string
        }
        Update: {
          bounce_count?: number | null
          clicked_at?: string | null
          complaint_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      email_preferences: {
        Row: {
          created_at: string | null
          digest_emails: string | null
          gamification_emails: boolean | null
          id: string
          marketing_emails: boolean | null
          trading_alerts: boolean | null
          transaction_emails: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          digest_emails?: string | null
          gamification_emails?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          trading_alerts?: boolean | null
          transaction_emails?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          digest_emails?: string | null
          gamification_emails?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          trading_alerts?: boolean | null
          transaction_emails?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emergency_logs: {
        Row: {
          affected_sessions: number | null
          closed_positions: number | null
          id: string
          reason: string
          timestamp: string | null
          triggered_by: string
        }
        Insert: {
          affected_sessions?: number | null
          closed_positions?: number | null
          id?: string
          reason: string
          timestamp?: string | null
          triggered_by: string
        }
        Update: {
          affected_sessions?: number | null
          closed_positions?: number | null
          id?: string
          reason?: string
          timestamp?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_connections: {
        Row: {
          api_key: string
          api_secret_ciphertext: string
          api_secret_nonce: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          last_error: string | null
          last_validated_at: string | null
          permissions: Json | null
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret_ciphertext: string
          api_secret_nonce: string
          created_at?: string | null
          exchange: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_error?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret_ciphertext?: string
          api_secret_nonce?: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_error?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      execution_logs: {
        Row: {
          ask_price: number | null
          bid_price: number | null
          created_at: string | null
          executed_price: number
          execution_time_ms: number
          fees_paid: number
          fill_rate: number
          id: string
          price_deviation_pct: number
          side: string
          slippage_amount: number
          slippage_pct: number
          symbol: string
          total_cost: number
          trading_mode: string
          type: string
          user_id: string | null
        }
        Insert: {
          ask_price?: number | null
          bid_price?: number | null
          created_at?: string | null
          executed_price: number
          execution_time_ms: number
          fees_paid: number
          fill_rate?: number
          id?: string
          price_deviation_pct: number
          side: string
          slippage_amount: number
          slippage_pct: number
          symbol: string
          total_cost: number
          trading_mode: string
          type: string
          user_id?: string | null
        }
        Update: {
          ask_price?: number | null
          bid_price?: number | null
          created_at?: string | null
          executed_price?: number
          execution_time_ms?: number
          fees_paid?: number
          fill_rate?: number
          id?: string
          price_deviation_pct?: number
          side?: string
          slippage_amount?: number
          slippage_pct?: number
          symbol?: string
          total_cost?: number
          trading_mode?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "execution_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      external_auth_identities: {
        Row: {
          created_at: string
          id: string
          provider: string
          provider_email: string | null
          provider_subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          provider_email?: string | null
          provider_subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          provider_email?: string | null
          provider_subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean
          id: string
          key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      global_settings: {
        Row: {
          emergency_reason: string | null
          emergency_resolution: string | null
          emergency_resolved_at: string | null
          emergency_resolved_by: string | null
          emergency_stop: boolean | null
          emergency_triggered_at: string | null
          emergency_triggered_by: string | null
          id: number
          updated_at: string | null
          usdt_nok_rate: number | null
        }
        Insert: {
          emergency_reason?: string | null
          emergency_resolution?: string | null
          emergency_resolved_at?: string | null
          emergency_resolved_by?: string | null
          emergency_stop?: boolean | null
          emergency_triggered_at?: string | null
          emergency_triggered_by?: string | null
          id?: number
          updated_at?: string | null
          usdt_nok_rate?: number | null
        }
        Update: {
          emergency_reason?: string | null
          emergency_resolution?: string | null
          emergency_resolved_at?: string | null
          emergency_resolved_by?: string | null
          emergency_stop?: boolean | null
          emergency_triggered_at?: string | null
          emergency_triggered_by?: string | null
          id?: number
          updated_at?: string | null
          usdt_nok_rate?: number | null
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          request_hash: string
          response: Json | null
          scope: string
          state: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          request_hash: string
          response?: Json | null
          scope: string
          state: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          request_hash?: string
          response?: Json | null
          scope?: string
          state?: string
        }
        Relationships: []
      }
      klt_earning_categories: {
        Row: {
          amount: number
          cooldown_minutes: number | null
          description_en: string | null
          description_no: string | null
          id: string
          is_active: boolean | null
          max_per_day: number | null
          name_en: string
          name_no: string
        }
        Insert: {
          amount?: number
          cooldown_minutes?: number | null
          description_en?: string | null
          description_no?: string | null
          id: string
          is_active?: boolean | null
          max_per_day?: number | null
          name_en: string
          name_no: string
        }
        Update: {
          amount?: number
          cooldown_minutes?: number | null
          description_en?: string | null
          description_no?: string | null
          id?: string
          is_active?: boolean | null
          max_per_day?: number | null
          name_en?: string
          name_no?: string
        }
        Relationships: []
      }
      klt_founder_allocations: {
        Row: {
          amount: number
          claimed: boolean | null
          claimed_at: string | null
          created_at: string | null
          id: string
          student_number: number
          user_id: string
        }
        Insert: {
          amount?: number
          claimed?: boolean | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          student_number: number
          user_id: string
        }
        Update: {
          amount?: number
          claimed?: boolean | null
          claimed_at?: string | null
          created_at?: string | null
          id?: string
          student_number?: number
          user_id?: string
        }
        Relationships: []
      }
      klt_spending_options: {
        Row: {
          cost_klt: number
          created_at: string | null
          description_en: string | null
          description_no: string | null
          duration_hours: number | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          name_en: string
          name_no: string
          sort_order: number | null
        }
        Insert: {
          cost_klt: number
          created_at?: string | null
          description_en?: string | null
          description_no?: string | null
          duration_hours?: number | null
          id: string
          is_active?: boolean | null
          max_uses?: number | null
          name_en: string
          name_no: string
          sort_order?: number | null
        }
        Update: {
          cost_klt?: number
          created_at?: string | null
          description_en?: string | null
          description_no?: string | null
          duration_hours?: number | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          name_en?: string
          name_no?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      klt_spends: {
        Row: {
          amount: number
          created_at: string | null
          expires_at: string | null
          id: string
          option_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          option_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          expires_at?: string | null
          id?: string
          option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "klt_spends_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "klt_spending_options"
            referencedColumns: ["id"]
          },
        ]
      }
      klt_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string
          id: string
          metadata: Json | null
          reason: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      kltbalances_deprecated: {
        Row: {
          balance: number
          created_at: string | null
          total_earned: number
          total_spent: number
          updated_at: string | null
          userid: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
          userid: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
          userid?: string
        }
        Relationships: []
      }
      kraken_conversions: {
        Row: {
          amount: number
          created_at: string | null
          error: string | null
          from_asset: string
          id: string
          order_id: string | null
          received_amount: number | null
          status: string | null
          to_asset: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          error?: string | null
          from_asset: string
          id?: string
          order_id?: string | null
          received_amount?: number | null
          status?: string | null
          to_asset?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          error?: string | null
          from_asset?: string
          id?: string
          order_id?: string | null
          received_amount?: number | null
          status?: string | null
          to_asset?: string
          user_id?: string
        }
        Relationships: []
      }
      kraken_grid_levels: {
        Row: {
          buy_price: number
          level: number
          order_id: string | null
          pair: string
          sell_price: number | null
          status: string
          updated_at: string | null
          user_id: string
          volume: string
        }
        Insert: {
          buy_price: number
          level: number
          order_id?: string | null
          pair: string
          sell_price?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
          volume: string
        }
        Update: {
          buy_price?: number
          level?: number
          order_id?: string | null
          pair?: string
          sell_price?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
          volume?: string
        }
        Relationships: []
      }
      kraken_live_state: {
        Row: {
          base_holdings: Json
          open_buy_orders: number
          open_orders: number
          open_sell_orders: number
          realized_profit_usdc: number
          snapshot: Json
          total_usdc: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_holdings?: Json
          open_buy_orders?: number
          open_orders?: number
          open_sell_orders?: number
          realized_profit_usdc?: number
          snapshot?: Json
          total_usdc?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_holdings?: Json
          open_buy_orders?: number
          open_orders?: number
          open_sell_orders?: number
          realized_profit_usdc?: number
          snapshot?: Json
          total_usdc?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kyc_profiles: {
        Row: {
          created_at: string
          date_of_birth: string | null
          documents: Json
          enhanced_due_diligence: boolean
          full_name: string | null
          nationality: string | null
          pep_status: string
          rejection_reason: string | null
          risk_rating: string
          sanctions_status: string
          status: string
          updated_at: string
          user_id: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          date_of_birth?: string | null
          documents?: Json
          enhanced_due_diligence?: boolean
          full_name?: string | null
          nationality?: string | null
          pep_status?: string
          rejection_reason?: string | null
          risk_rating?: string
          sanctions_status?: string
          status?: string
          updated_at?: string
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          date_of_birth?: string | null
          documents?: Json
          enhanced_due_diligence?: boolean
          full_name?: string | null
          nationality?: string | null
          pep_status?: string
          rejection_reason?: string | null
          risk_rating?: string
          sanctions_status?: string
          status?: string
          updated_at?: string
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      leaderboard_bots: {
        Row: {
          avatar_url: string | null
          display_name: string
          featured: boolean
          follower_count: number | null
          id: string
          is_active: boolean | null
          max_drawdown_30d: number | null
          performance_fee_pct: number | null
          pnl_30d: number | null
          pnl_90d: number | null
          pnl_all_time: number | null
          rank: number | null
          sharpe_ratio: number | null
          sort_order: number
          strategy_type: string | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avatar_url?: string | null
          display_name: string
          featured?: boolean
          follower_count?: number | null
          id?: string
          is_active?: boolean | null
          max_drawdown_30d?: number | null
          performance_fee_pct?: number | null
          pnl_30d?: number | null
          pnl_90d?: number | null
          pnl_all_time?: number | null
          rank?: number | null
          sharpe_ratio?: number | null
          sort_order?: number
          strategy_type?: string | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string
          featured?: boolean
          follower_count?: number | null
          id?: string
          is_active?: boolean | null
          max_drawdown_30d?: number | null
          performance_fee_pct?: number | null
          pnl_30d?: number | null
          pnl_90d?: number | null
          pnl_all_time?: number | null
          rank?: number | null
          sharpe_ratio?: number | null
          sort_order?: number
          strategy_type?: string | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      leaderboard_history: {
        Row: {
          id: string
          rank: number
          recorded_at: string | null
          time_period: string
          user_id: string
        }
        Insert: {
          id?: string
          rank: number
          recorded_at?: string | null
          time_period: string
          user_id: string
        }
        Update: {
          id?: string
          rank?: number
          recorded_at?: string | null
          time_period?: string
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_monthly: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          month: string
          points: number
          rank: number | null
          stats: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          month: string
          points?: number
          rank?: number | null
          stats?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          month?: string
          points?: number
          rank?: number | null
          stats?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_snapshots: {
        Row: {
          id: string
          period: string
          rank: number
          return_pct: number
          snapped_at: string
          total_trades: number
          user_display_name: string | null
          user_id: string
          win_rate: number
        }
        Insert: {
          id?: string
          period: string
          rank: number
          return_pct?: number
          snapped_at?: string
          total_trades?: number
          user_display_name?: string | null
          user_id: string
          win_rate?: number
        }
        Update: {
          id?: string
          period?: string
          rank?: number
          return_pct?: number
          snapped_at?: string
          total_trades?: number
          user_display_name?: string | null
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      league_participants: {
        Row: {
          current_pnl: number | null
          joined_at: string | null
          league_id: string
          rank: number | null
          starting_balance: number | null
          user_id: string
        }
        Insert: {
          current_pnl?: number | null
          joined_at?: string | null
          league_id: string
          rank?: number | null
          starting_balance?: number | null
          user_id: string
        }
        Update: {
          current_pnl?: number | null
          joined_at?: string | null
          league_id?: string
          rank?: number | null
          starting_balance?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_participants_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      leagues: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string
          id: string
          is_active: boolean | null
          prize_pool: string | null
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date: string
          id?: string
          is_active?: boolean | null
          prize_pool?: string | null
          start_date: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string
          id?: string
          is_active?: boolean | null
          prize_pool?: string | null
          start_date?: string
          title?: string
        }
        Relationships: []
      }
      learning_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          points: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          content: string | null
          content_type: string | null
          course_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_free_preview: boolean | null
          is_published: boolean | null
          order_index: number | null
          slug: string
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          content?: string | null
          content_type?: string | null
          course_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          slug: string
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          content?: string | null
          content_type?: string | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_free_preview?: boolean | null
          is_published?: boolean | null
          order_index?: number | null
          slug?: string
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      live_events: {
        Row: {
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          title: string
          type: string
          user_display_name: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          type: string
          user_display_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_display_name?: string | null
        }
        Relationships: []
      }
      market_data: {
        Row: {
          close: number | null
          high: number | null
          low: number | null
          open: number | null
          price: number | null
          symbol: string
          timestamp: string
          volume: number | null
        }
        Insert: {
          close?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          price?: number | null
          symbol: string
          timestamp: string
          volume?: number | null
        }
        Update: {
          close?: number | null
          high?: number | null
          low?: number | null
          open?: number | null
          price?: number | null
          symbol?: string
          timestamp?: string
          volume?: number | null
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          action: string | null
          coins: string[] | null
          confidence: number | null
          content: string | null
          created_at: string | null
          id: string
          sentiment: string | null
          sentiment_score: number | null
          source: string
          title: string | null
        }
        Insert: {
          action?: string | null
          coins?: string[] | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          sentiment?: string | null
          sentiment_score?: number | null
          source: string
          title?: string | null
        }
        Update: {
          action?: string | null
          coins?: string[] | null
          confidence?: number | null
          content?: string | null
          created_at?: string | null
          id?: string
          sentiment?: string | null
          sentiment_score?: number | null
          source?: string
          title?: string | null
        }
        Relationships: []
      }
      market_ohlcv_cache: {
        Row: {
          created_at: string | null
          ohlcv_data: Json | null
          symbol: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ohlcv_data?: Json | null
          symbol: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ohlcv_data?: Json | null
          symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      market_sentiment: {
        Row: {
          btc_dominance: number | null
          fear_greed_index: number | null
          id: string
          market_status: string | null
          recorded_at: string | null
        }
        Insert: {
          btc_dominance?: number | null
          fear_greed_index?: number | null
          id?: string
          market_status?: string | null
          recorded_at?: string | null
        }
        Update: {
          btc_dominance?: number | null
          fear_greed_index?: number | null
          id?: string
          market_status?: string | null
          recorded_at?: string | null
        }
        Relationships: []
      }
      market_volatility: {
        Row: {
          symbol: string
          updated_at: string | null
          volatility_24h: number | null
        }
        Insert: {
          symbol: string
          updated_at?: string | null
          volatility_24h?: number | null
        }
        Update: {
          symbol?: string
          updated_at?: string | null
          volatility_24h?: number | null
        }
        Relationships: []
      }
      marketing_cta_events: {
        Row: {
          created_at: string | null
          experiment_key: string | null
          funnel_stage: string | null
          href: string
          id: string
          ip_address: unknown
          locale: string
          route: string
          session_id: string | null
          tracking_id: string
          user_agent: string | null
          user_id: string | null
          variant: string
          variant_key: string | null
        }
        Insert: {
          created_at?: string | null
          experiment_key?: string | null
          funnel_stage?: string | null
          href: string
          id?: string
          ip_address?: unknown
          locale?: string
          route: string
          session_id?: string | null
          tracking_id: string
          user_agent?: string | null
          user_id?: string | null
          variant?: string
          variant_key?: string | null
        }
        Update: {
          created_at?: string | null
          experiment_key?: string | null
          funnel_stage?: string | null
          href?: string
          id?: string
          ip_address?: unknown
          locale?: string
          route?: string
          session_id?: string | null
          tracking_id?: string
          user_agent?: string | null
          user_id?: string | null
          variant?: string
          variant_key?: string | null
        }
        Relationships: []
      }
      marketplace_listing_stats: {
        Row: {
          listing_id: string
          max_drawdown_pct: number | null
          return_30d_pct: number | null
          return_90d_pct: number | null
          risk_tier: string
          sharpe_ratio: number | null
          updated_at: string
          win_rate_pct: number | null
        }
        Insert: {
          listing_id: string
          max_drawdown_pct?: number | null
          return_30d_pct?: number | null
          return_90d_pct?: number | null
          risk_tier?: string
          sharpe_ratio?: number | null
          updated_at?: string
          win_rate_pct?: number | null
        }
        Update: {
          listing_id?: string
          max_drawdown_pct?: number | null
          return_30d_pct?: number | null
          return_90d_pct?: number | null
          risk_tier?: string
          sharpe_ratio?: number | null
          updated_at?: string
          win_rate_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listing_stats_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          backtest_summary: Json | null
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          price_model: string | null
          price_nok: number | null
          rating: number | null
          review_count: number | null
          seller_id: string
          status: string | null
          strategy_id: string | null
          subscriber_count: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          backtest_summary?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          price_model?: string | null
          price_nok?: number | null
          rating?: number | null
          review_count?: number | null
          seller_id: string
          status?: string | null
          strategy_id?: string | null
          subscriber_count?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          backtest_summary?: Json | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          price_model?: string | null
          price_nok?: number | null
          rating?: number | null
          review_count?: number | null
          seller_id?: string
          status?: string | null
          strategy_id?: string | null
          subscriber_count?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "user_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_subscriptions: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          listing_id: string
          started_at: string | null
          status: string | null
          subscriber_id: string
          updated_at: string | null
          user_strategy_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id: string
          started_at?: string | null
          status?: string | null
          subscriber_id: string
          updated_at?: string | null
          user_strategy_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          listing_id?: string
          started_at?: string | null
          status?: string | null
          subscriber_id?: string
          updated_at?: string | null
          user_strategy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_subscriptions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_subscriptions_user_strategy_id_fkey"
            columns: ["user_strategy_id"]
            isOneToOne: false
            referencedRelation: "user_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      mifid2_reports: {
        Row: {
          created_at: string | null
          generated_at: string
          id: string
          period_end: string
          period_start: string
          record_count: number
          report_id: string
          report_type: string
          status: string
          submission_error: string | null
          submitted_at: string | null
          xml_content: string
        }
        Insert: {
          created_at?: string | null
          generated_at: string
          id?: string
          period_end: string
          period_start: string
          record_count?: number
          report_id: string
          report_type: string
          status?: string
          submission_error?: string | null
          submitted_at?: string | null
          xml_content: string
        }
        Update: {
          created_at?: string | null
          generated_at?: string
          id?: string
          period_end?: string
          period_start?: string
          record_count?: number
          report_id?: string
          report_type?: string
          status?: string
          submission_error?: string | null
          submitted_at?: string | null
          xml_content?: string
        }
        Relationships: []
      }
      migration_history: {
        Row: {
          error_message: string | null
          executed_at: string | null
          id: string
          name: string
          sql_content: string | null
          status: string | null
        }
        Insert: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          name: string
          sql_content?: string | null
          status?: string | null
        }
        Update: {
          error_message?: string | null
          executed_at?: string | null
          id?: string
          name?: string
          sql_content?: string | null
          status?: string | null
        }
        Relationships: []
      }
      module_progress: {
        Row: {
          attempts: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          id: string
          module_id: number
          score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attempts?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_id: number
          score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attempts?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          module_id?: number
          score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      news_events: {
        Row: {
          body: string | null
          category: string | null
          created_at: string | null
          id: string
          impact: string | null
          published_at: string
          sentiment: number | null
          source: string
          symbols: string[] | null
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          impact?: string | null
          published_at: string
          sentiment?: number | null
          source: string
          symbols?: string[] | null
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          category?: string | null
          created_at?: string | null
          id?: string
          impact?: string | null
          published_at?: string
          sentiment?: number | null
          source?: string
          symbols?: string[] | null
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          beta_updates: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          marketing_emails: boolean | null
          product_updates: boolean | null
          push_competition: boolean | null
          push_market_news: boolean | null
          push_notifications: boolean | null
          push_portfolio_updates: boolean | null
          push_price_alerts: boolean | null
          push_stop_loss: boolean | null
          push_trading_signals: boolean | null
          push_transactions: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          telegram_notifications: boolean | null
          trading_alerts: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          beta_updates?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          product_updates?: boolean | null
          push_competition?: boolean | null
          push_market_news?: boolean | null
          push_notifications?: boolean | null
          push_portfolio_updates?: boolean | null
          push_price_alerts?: boolean | null
          push_stop_loss?: boolean | null
          push_trading_signals?: boolean | null
          push_transactions?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          telegram_notifications?: boolean | null
          trading_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          beta_updates?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          marketing_emails?: boolean | null
          product_updates?: boolean | null
          push_competition?: boolean | null
          push_market_news?: boolean | null
          push_notifications?: boolean | null
          push_portfolio_updates?: boolean | null
          push_price_alerts?: boolean | null
          push_stop_loss?: boolean | null
          push_trading_signals?: boolean | null
          push_transactions?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          telegram_notifications?: boolean | null
          trading_alerts?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          resend_id: string | null
          sent_at: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          type: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          resend_id?: string | null
          sent_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string
        }
        Relationships: []
      }
      onboarding_events: {
        Row: {
          completed_at: string | null
          id: string
          metadata: Json | null
          step: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          id?: string
          metadata?: Json | null
          step: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          id?: string
          metadata?: Json | null
          step?: string
          user_id?: string | null
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          onboarding_complete: boolean | null
          paper_bot_id: string | null
          step_1_completed_at: string | null
          step_1_started: boolean | null
          step_2_completed_at: string | null
          step_3_completed_at: string | null
          step_4_completed_at: string | null
          step_5_completed_at: string | null
          step1_completed: boolean | null
          step2_completed: boolean | null
          step2_started_at: string | null
          step3_completed: boolean | null
          step4_completed: boolean | null
          step5_completed: boolean | null
          strategy_id: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          onboarding_complete?: boolean | null
          paper_bot_id?: string | null
          step_1_completed_at?: string | null
          step_1_started?: boolean | null
          step_2_completed_at?: string | null
          step_3_completed_at?: string | null
          step_4_completed_at?: string | null
          step_5_completed_at?: string | null
          step1_completed?: boolean | null
          step2_completed?: boolean | null
          step2_started_at?: string | null
          step3_completed?: boolean | null
          step4_completed?: boolean | null
          step5_completed?: boolean | null
          strategy_id?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          onboarding_complete?: boolean | null
          paper_bot_id?: string | null
          step_1_completed_at?: string | null
          step_1_started?: boolean | null
          step_2_completed_at?: string | null
          step_3_completed_at?: string | null
          step_4_completed_at?: string | null
          step_5_completed_at?: string | null
          step1_completed?: boolean | null
          step2_completed?: boolean | null
          step2_started_at?: string | null
          step3_completed?: boolean | null
          step4_completed?: boolean | null
          step5_completed?: boolean | null
          strategy_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      outbox_recovery: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          last_attempt: string | null
          next_attempt: string | null
          payload: Json
          requires_manual_intervention: boolean
          status: string
          type: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          last_attempt?: string | null
          next_attempt?: string | null
          payload: Json
          requires_manual_intervention?: boolean
          status?: string
          type: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          last_attempt?: string | null
          next_attempt?: string | null
          payload?: Json
          requires_manual_intervention?: boolean
          status?: string
          type?: string
        }
        Relationships: []
      }
      paper_accounts: {
        Row: {
          created_at: string | null
          current_balance: number
          id: string
          initial_balance: number
          loss_count: number | null
          total_profit_loss: number | null
          updated_at: string | null
          user_id: string
          win_count: number | null
        }
        Insert: {
          created_at?: string | null
          current_balance: number
          id?: string
          initial_balance: number
          loss_count?: number | null
          total_profit_loss?: number | null
          updated_at?: string | null
          user_id: string
          win_count?: number | null
        }
        Update: {
          created_at?: string | null
          current_balance?: number
          id?: string
          initial_balance?: number
          loss_count?: number | null
          total_profit_loss?: number | null
          updated_at?: string | null
          user_id?: string
          win_count?: number | null
        }
        Relationships: []
      }
      paper_positions: {
        Row: {
          account_id: string
          close_reason: string | null
          closed_at: string | null
          closing_price: number | null
          current_price: number | null
          entry_amount: number
          entry_price: number
          id: string
          opened_at: string | null
          position_type: string
          profit_loss: number | null
          profit_loss_percent: number | null
          quantity: number
          status: string | null
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          close_reason?: string | null
          closed_at?: string | null
          closing_price?: number | null
          current_price?: number | null
          entry_amount: number
          entry_price: number
          id?: string
          opened_at?: string | null
          position_type: string
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity: number
          status?: string | null
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          close_reason?: string | null
          closed_at?: string | null
          closing_price?: number | null
          current_price?: number | null
          entry_amount?: number
          entry_price?: number
          id?: string
          opened_at?: string | null
          position_type?: string
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity?: number
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paper_positions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "paper_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_trades: {
        Row: {
          account_id: string
          created_at: string | null
          duration_hours: number | null
          entry_amount: number
          entry_price: number
          entry_time: string
          exit_amount: number
          exit_price: number
          exit_time: string
          id: string
          position_id: string | null
          position_type: string
          profit_loss: number
          profit_loss_percent: number
          quantity: number
          symbol: string
        }
        Insert: {
          account_id: string
          created_at?: string | null
          duration_hours?: number | null
          entry_amount: number
          entry_price: number
          entry_time: string
          exit_amount: number
          exit_price: number
          exit_time: string
          id?: string
          position_id?: string | null
          position_type: string
          profit_loss: number
          profit_loss_percent: number
          quantity: number
          symbol: string
        }
        Update: {
          account_id?: string
          created_at?: string | null
          duration_hours?: number | null
          entry_amount?: number
          entry_price?: number
          entry_time?: string
          exit_amount?: number
          exit_price?: number
          exit_time?: string
          id?: string
          position_id?: string | null
          position_type?: string
          profit_loss?: number
          profit_loss_percent?: number
          quantity?: number
          symbol?: string
        }
        Relationships: [
          {
            foreignKeyName: "paper_trades_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "paper_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_trading_sessions: {
        Row: {
          created_at: string | null
          current_balance: number | null
          id: string
          losing_trades: number | null
          starting_balance: number | null
          status: string | null
          total_pnl: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          current_balance?: number | null
          id?: string
          losing_trades?: number | null
          starting_balance?: number | null
          status?: string | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          current_balance?: number | null
          id?: string
          losing_trades?: number | null
          starting_balance?: number | null
          status?: string | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          winning_trades?: number | null
        }
        Relationships: []
      }
      pending_orders: {
        Row: {
          binance_order_id: string | null
          created_at: string | null
          error_message: string | null
          filled_at: string | null
          filled_quantity: number | null
          id: string
          order_type: string
          price: number | null
          quantity: number
          side: string
          status: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          binance_order_id?: string | null
          created_at?: string | null
          error_message?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          id?: string
          order_type: string
          price?: number | null
          quantity: number
          side: string
          status?: string | null
          symbol: string
          user_id: string
        }
        Update: {
          binance_order_id?: string | null
          created_at?: string | null
          error_message?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          id?: string
          order_type?: string
          price?: number | null
          quantity?: number
          side?: string
          status?: string | null
          symbol?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "pending_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_fees: {
        Row: {
          amount: number
          created_at: string | null
          creator_id: string | null
          currency: string | null
          follower_id: string | null
          id: string
          paid_at: string | null
          pnl_snapshot: number
          status: string | null
          strategy_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          creator_id?: string | null
          currency?: string | null
          follower_id?: string | null
          id?: string
          paid_at?: string | null
          pnl_snapshot: number
          status?: string | null
          strategy_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          creator_id?: string | null
          currency?: string | null
          follower_id?: string | null
          id?: string
          paid_at?: string | null
          pnl_snapshot?: number
          status?: string | null
          strategy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_fees_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "user_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_guard_log: {
        Row: {
          action_taken: string | null
          checked_at: string
          details: Json
          id: number
          issue_type: string
          session_id: string | null
          severity: string
          user_id: string | null
        }
        Insert: {
          action_taken?: string | null
          checked_at?: string
          details?: Json
          id?: never
          issue_type: string
          session_id?: string | null
          severity: string
          user_id?: string | null
        }
        Update: {
          action_taken?: string | null
          checked_at?: string
          details?: Json
          id?: never
          issue_type?: string
          session_id?: string | null
          severity?: string
          user_id?: string | null
        }
        Relationships: []
      }
      portfolio_history: {
        Row: {
          best_trade_nok: number | null
          closed_trades_today: number | null
          created_at: string | null
          date: string
          id: string
          open_trades: number | null
          total_profit_nok: number
          total_profit_percent: number
          total_value_nok: number
          user_id: string
          worst_trade_nok: number | null
        }
        Insert: {
          best_trade_nok?: number | null
          closed_trades_today?: number | null
          created_at?: string | null
          date: string
          id?: string
          open_trades?: number | null
          total_profit_nok: number
          total_profit_percent: number
          total_value_nok: number
          user_id: string
          worst_trade_nok?: number | null
        }
        Update: {
          best_trade_nok?: number | null
          closed_trades_today?: number | null
          created_at?: string | null
          date?: string
          id?: string
          open_trades?: number | null
          total_profit_nok?: number
          total_profit_percent?: number
          total_value_nok?: number
          user_id?: string
          worst_trade_nok?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_positions: {
        Row: {
          avg_entry_price: number
          current_unrealized_pnl_nok: number | null
          current_unrealized_pnl_percent: number | null
          current_value_nok: number
          id: string
          last_updated: string | null
          symbol: string
          total_quantity: number
          user_id: string
        }
        Insert: {
          avg_entry_price: number
          current_unrealized_pnl_nok?: number | null
          current_unrealized_pnl_percent?: number | null
          current_value_nok: number
          id?: string
          last_updated?: string | null
          symbol: string
          total_quantity: number
          user_id: string
        }
        Update: {
          avg_entry_price?: number
          current_unrealized_pnl_nok?: number | null
          current_unrealized_pnl_percent?: number | null
          current_value_nok?: number
          id?: string
          last_updated?: string | null
          symbol?: string
          total_quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_positions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_rebalance_configs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          target_allocations: Json
          threshold_percent: number
          twap_duration_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          target_allocations?: Json
          threshold_percent?: number
          twap_duration_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          target_allocations?: Json
          threshold_percent?: number
          twap_duration_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_rebalance_events: {
        Row: {
          completed_at: string | null
          created_at: string
          current_allocations: Json
          id: string
          status: string
          target_allocations: Json
          trigger_reason: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_allocations: Json
          id?: string
          status?: string
          target_allocations: Json
          trigger_reason?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_allocations?: Json
          id?: string
          status?: string
          target_allocations?: Json
          trigger_reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_rebalance_orders: {
        Row: {
          amount_usdt: number
          created_at: string
          event_id: string
          executed_amount_usdt: number
          executed_chunks: number
          id: string
          side: string
          status: string
          symbol: string
          twap_chunks: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_usdt: number
          created_at?: string
          event_id: string
          executed_amount_usdt?: number
          executed_chunks?: number
          id?: string
          side: string
          status?: string
          symbol: string
          twap_chunks: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_usdt?: number
          created_at?: string
          event_id?: string
          executed_amount_usdt?: number
          executed_chunks?: number
          id?: string
          side?: string
          status?: string
          symbol?: string
          twap_chunks?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_rebalance_orders_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "portfolio_rebalance_events"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_summary: {
        Row: {
          closed_trades: number | null
          daily_change_nok: number | null
          daily_change_percent: number | null
          id: string
          last_synced_at: string | null
          open_trades: number | null
          total_profit_nok: number | null
          total_profit_percent: number | null
          total_trades: number | null
          total_value_nok: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          closed_trades?: number | null
          daily_change_nok?: number | null
          daily_change_percent?: number | null
          id?: string
          last_synced_at?: string | null
          open_trades?: number | null
          total_profit_nok?: number | null
          total_profit_percent?: number | null
          total_trades?: number | null
          total_value_nok?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          closed_trades?: number | null
          daily_change_nok?: number | null
          daily_change_percent?: number | null
          id?: string
          last_synced_at?: string | null
          open_trades?: number | null
          total_profit_nok?: number | null
          total_profit_percent?: number | null
          total_trades?: number | null
          total_value_nok?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "portfolio_summary_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          current_balance: number
          description: string | null
          id: string
          initial_balance: number | null
          name: string
          total_invested: number | null
          total_profit: number | null
          total_profit_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: string
          current_balance?: number
          description?: string | null
          id?: string
          initial_balance?: number | null
          name?: string
          total_invested?: number | null
          total_profit?: number | null
          total_profit_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          current_balance?: number
          description?: string | null
          id?: string
          initial_balance?: number | null
          name?: string
          total_invested?: number | null
          total_profit?: number | null
          total_profit_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          avg_entry_price: number
          avg_price: number | null
          created_at: string | null
          current_price: number | null
          id: string
          portfolio_id: string | null
          profit_loss: number | null
          profit_loss_percent: number | null
          quantity: number
          session_id: string | null
          symbol: string
          total_cost_nok: number
          unrealized_pnl: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avg_entry_price?: number
          avg_price?: number | null
          created_at?: string | null
          current_price?: number | null
          id?: string
          portfolio_id?: string | null
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity?: number
          session_id?: string | null
          symbol: string
          total_cost_nok?: number
          unrealized_pnl?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avg_entry_price?: number
          avg_price?: number | null
          created_at?: string | null
          current_price?: number | null
          id?: string
          portfolio_id?: string | null
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity?: number
          session_id?: string | null
          symbol?: string
          total_cost_nok?: number
          unrealized_pnl?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "positions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          condition_type: string
          condition_value: number
          created_at: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          symbol: string
          triggered_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          condition_type: string
          condition_value: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          symbol: string
          triggered_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          condition_type?: string
          condition_value?: number
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          symbol?: string
          triggered_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      price_candles: {
        Row: {
          close: number
          close_time: string
          created_at: string | null
          high: number
          id: string
          low: number
          open: number
          open_time: string
          symbol: string
          volume: number
        }
        Insert: {
          close: number
          close_time: string
          created_at?: string | null
          high: number
          id?: string
          low: number
          open: number
          open_time: string
          symbol: string
          volume: number
        }
        Update: {
          close?: number
          close_time?: string
          created_at?: string | null
          high?: number
          id?: string
          low?: number
          open?: number
          open_time?: string
          symbol?: string
          volume?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bankid_verified: boolean | null
          bankid_verified_at: string | null
          beta_approved: boolean | null
          bio: string | null
          consent_paper_trading_public: boolean | null
          created_at: string
          display_name: string | null
          email: string
          email_notifications: boolean | null
          font_size_preference: string | null
          full_name: string | null
          google_id: string | null
          high_contrast_mode: boolean | null
          id: string
          is_public_creator: boolean | null
          language: string | null
          last_sign_in_at: string | null
          locale: string | null
          microsoft_id: string | null
          notifications_enabled: boolean | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: string | null
          paper_trades_count: number | null
          performance_fee_percent: number | null
          provider: string | null
          push_enabled: boolean | null
          referral_code: string | null
          referred_by: string | null
          role: string
          setup_completed_at: string | null
          sms_notifications: boolean | null
          source: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string | null
          trading_mode: string | null
          trading_suspended: boolean | null
          trading_suspended_at: string | null
          trading_suspension_reason: string | null
          trial_ends_at: string | null
          trial_expires_at: string | null
          trial_started_at: string | null
          updated_at: string
          user_number: number | null
          username: string | null
          view_mode_preference: string | null
        }
        Insert: {
          avatar_url?: string | null
          bankid_verified?: boolean | null
          bankid_verified_at?: string | null
          beta_approved?: boolean | null
          bio?: string | null
          consent_paper_trading_public?: boolean | null
          created_at?: string
          display_name?: string | null
          email: string
          email_notifications?: boolean | null
          font_size_preference?: string | null
          full_name?: string | null
          google_id?: string | null
          high_contrast_mode?: boolean | null
          id: string
          is_public_creator?: boolean | null
          language?: string | null
          last_sign_in_at?: string | null
          locale?: string | null
          microsoft_id?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          paper_trades_count?: number | null
          performance_fee_percent?: number | null
          provider?: string | null
          push_enabled?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          setup_completed_at?: string | null
          sms_notifications?: boolean | null
          source?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trading_mode?: string | null
          trading_suspended?: boolean | null
          trading_suspended_at?: string | null
          trading_suspension_reason?: string | null
          trial_ends_at?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_number?: number | null
          username?: string | null
          view_mode_preference?: string | null
        }
        Update: {
          avatar_url?: string | null
          bankid_verified?: boolean | null
          bankid_verified_at?: string | null
          beta_approved?: boolean | null
          bio?: string | null
          consent_paper_trading_public?: boolean | null
          created_at?: string
          display_name?: string | null
          email?: string
          email_notifications?: boolean | null
          font_size_preference?: string | null
          full_name?: string | null
          google_id?: string | null
          high_contrast_mode?: boolean | null
          id?: string
          is_public_creator?: boolean | null
          language?: string | null
          last_sign_in_at?: string | null
          locale?: string | null
          microsoft_id?: string | null
          notifications_enabled?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: string | null
          paper_trades_count?: number | null
          performance_fee_percent?: number | null
          provider?: string | null
          push_enabled?: boolean | null
          referral_code?: string | null
          referred_by?: string | null
          role?: string
          setup_completed_at?: string | null
          sms_notifications?: boolean | null
          source?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string | null
          trading_mode?: string | null
          trading_suspended?: boolean | null
          trading_suspended_at?: string | null
          trading_suspension_reason?: string | null
          trial_ends_at?: string | null
          trial_expires_at?: string | null
          trial_started_at?: string | null
          updated_at?: string
          user_number?: number | null
          username?: string | null
          view_mode_preference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json | null
          completed_at: string | null
          created_at: string | null
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json | null
          completed_at?: string | null
          created_at?: string | null
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          explanation: string | null
          id: string
          options: Json
          points: number | null
          question_number: number
          question_text: string
          question_type: string | null
          quiz_id: string
        }
        Insert: {
          created_at?: string | null
          explanation?: string | null
          id?: string
          options: Json
          points?: number | null
          question_number: number
          question_text: string
          question_type?: string | null
          quiz_id: string
        }
        Update: {
          created_at?: string | null
          explanation?: string | null
          id?: string
          options?: Json
          points?: number | null
          question_number?: number
          question_text?: string
          question_type?: string | null
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_required_for_futures: boolean | null
          pass_score: number
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required_for_futures?: boolean | null
          pass_score?: number
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_required_for_futures?: boolean | null
          pass_score?: number
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reconciliation_runs: {
        Row: {
          completed_at: string | null
          details: Json | null
          divergences: number
          errors: number
          id: string
          started_at: string
          trades_checked: number
        }
        Insert: {
          completed_at?: string | null
          details?: Json | null
          divergences?: number
          errors?: number
          id?: string
          started_at?: string
          trades_checked?: number
        }
        Update: {
          completed_at?: string | null
          details?: Json | null
          divergences?: number
          errors?: number
          id?: string
          started_at?: string
          trades_checked?: number
        }
        Relationships: []
      }
      referral_tracking: {
        Row: {
          clicked_at: string | null
          converted_at: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          landing_page: string | null
          referral_code: string
          referred_user_id: string | null
          referrer_reward_months: number | null
          referrer_reward_points: number | null
          referrer_user_id: string
          signed_up_at: string | null
          source: string | null
          status: string | null
          updated_at: string | null
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          referral_code: string
          referred_user_id?: string | null
          referrer_reward_months?: number | null
          referrer_reward_points?: number | null
          referrer_user_id: string
          signed_up_at?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          landing_page?: string | null
          referral_code?: string
          referred_user_id?: string | null
          referrer_reward_months?: number | null
          referrer_reward_points?: number | null
          referrer_user_id?: string
          signed_up_at?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      regime_cache: {
        Row: {
          created_at: string | null
          regime_data: Json
          symbol: string
        }
        Insert: {
          created_at?: string | null
          regime_data: Json
          symbol: string
        }
        Update: {
          created_at?: string | null
          regime_data?: Json
          symbol?: string
        }
        Relationships: []
      }
      risk_profiles: {
        Row: {
          allowed_pairs: string[] | null
          created_at: string | null
          id: string
          is_active: boolean | null
          leverage_allowed: boolean | null
          max_daily_loss_pct: number | null
          max_exposure_pct: number | null
          max_position_pct: number | null
          max_position_size_pct: number | null
          max_total_exposure_pct: number | null
          name: string
          stop_loss_pct: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_pairs?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          leverage_allowed?: boolean | null
          max_daily_loss_pct?: number | null
          max_exposure_pct?: number | null
          max_position_pct?: number | null
          max_position_size_pct?: number | null
          max_total_exposure_pct?: number | null
          name: string
          stop_loss_pct?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_pairs?: string[] | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          leverage_allowed?: boolean | null
          max_daily_loss_pct?: number | null
          max_exposure_pct?: number | null
          max_position_pct?: number | null
          max_position_size_pct?: number | null
          max_total_exposure_pct?: number | null
          name?: string
          stop_loss_pct?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      risk_state: {
        Row: {
          state: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          state?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          state?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      risk_violations: {
        Row: {
          action: string
          actual_value: number | null
          created_at: string | null
          expected_value: number | null
          id: string
          rule: string
          severity: string
          user_id: string
        }
        Insert: {
          action: string
          actual_value?: number | null
          created_at?: string | null
          expected_value?: number | null
          id?: string
          rule: string
          severity: string
          user_id: string
        }
        Update: {
          action?: string
          actual_value?: number | null
          created_at?: string | null
          expected_value?: number | null
          id?: string
          rule?: string
          severity?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_strategies: {
        Row: {
          config: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          ip_address: unknown
          occurred_at: string
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          severity: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown
          occurred_at?: string
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      signals: {
        Row: {
          confidence: number
          created_at: string | null
          created_by: string | null
          direction: string
          id: string
          metadata: Json | null
          processed_at: string | null
          processed_by: string | null
          status: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          confidence: number
          created_at?: string | null
          created_by?: string | null
          direction: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          confidence?: number
          created_at?: string | null
          created_by?: string | null
          direction?: string
          id?: string
          metadata?: Json | null
          processed_at?: string | null
          processed_by?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      signup_funnel: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          metadata: Json | null
          referrer: string | null
          session_id: string
          step_number: number | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id: string
          step_number?: number | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          referrer?: string | null
          session_id?: string
          step_number?: number | null
          user_agent?: string | null
        }
        Relationships: []
      }
      smart_trader_log: {
        Row: {
          created_at: string
          details: Json
          event_type: string
          id: string
          metadata: Json | null
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: string
          id?: string
          metadata?: Json | null
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_trader_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_trader_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_trader_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sonar_sentiment_cache: {
        Row: {
          confidence: number
          created_at: string
          recommendation: string
          sentiment_data: Json
          symbol: string
          updated_at: string
        }
        Insert: {
          confidence: number
          created_at?: string
          recommendation: string
          sentiment_data: Json
          symbol: string
          updated_at?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          recommendation?: string
          sentiment_data?: Json
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          avg_trade_duration_hours: number | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_drawdown_percent: number | null
          name: string
          risk_level: string | null
          sharpe_ratio: number | null
          strategy_type: string | null
          subscription_fee_monthly: number | null
          total_return_percent: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avg_trade_duration_hours?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_drawdown_percent?: number | null
          name: string
          risk_level?: string | null
          sharpe_ratio?: number | null
          strategy_type?: string | null
          subscription_fee_monthly?: number | null
          total_return_percent?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avg_trade_duration_hours?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_drawdown_percent?: number | null
          name?: string
          risk_level?: string | null
          sharpe_ratio?: number | null
          strategy_type?: string | null
          subscription_fee_monthly?: number | null
          total_return_percent?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      strategy_followers: {
        Row: {
          allocation_percent: number | null
          created_at: string | null
          end_reason: string | null
          ended_at: string | null
          follower_return_percent: number | null
          follower_return_usd: number | null
          follower_user_id: string
          id: string
          is_active: boolean | null
          max_position_size_usd: number | null
          started_at: string | null
          stop_loss_percent: number | null
          strategy_id: string
          updated_at: string | null
        }
        Insert: {
          allocation_percent?: number | null
          created_at?: string | null
          end_reason?: string | null
          ended_at?: string | null
          follower_return_percent?: number | null
          follower_return_usd?: number | null
          follower_user_id: string
          id?: string
          is_active?: boolean | null
          max_position_size_usd?: number | null
          started_at?: string | null
          stop_loss_percent?: number | null
          strategy_id: string
          updated_at?: string | null
        }
        Update: {
          allocation_percent?: number | null
          created_at?: string | null
          end_reason?: string | null
          ended_at?: string | null
          follower_return_percent?: number | null
          follower_return_usd?: number | null
          follower_user_id?: string
          id?: string
          is_active?: boolean | null
          max_position_size_usd?: number | null
          started_at?: string | null
          stop_loss_percent?: number | null
          strategy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "strategy_followers_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "public_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_followers_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_logs: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          status: string
          strategy_id: string | null
          strategy_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          status: string
          strategy_id?: string | null
          strategy_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          status?: string
          strategy_id?: string | null
          strategy_type?: string
        }
        Relationships: []
      }
      strategy_performance: {
        Row: {
          avg_loss_pct: number
          avg_win_pct: number
          id: string
          kelly_fraction: number
          sample_size: number
          strategy_id: string
          updated_at: string | null
          user_id: string
          win_rate: number
        }
        Insert: {
          avg_loss_pct?: number
          avg_win_pct?: number
          id?: string
          kelly_fraction?: number
          sample_size?: number
          strategy_id: string
          updated_at?: string | null
          user_id: string
          win_rate?: number
        }
        Update: {
          avg_loss_pct?: number
          avg_win_pct?: number
          id?: string
          kelly_fraction?: number
          sample_size?: number
          strategy_id?: string
          updated_at?: string | null
          user_id?: string
          win_rate?: number
        }
        Relationships: []
      }
      strategy_reviews: {
        Row: {
          created_at: string | null
          id: string
          rating: number
          review: string | null
          strategy_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          rating: number
          review?: string | null
          strategy_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          rating?: number
          review?: string | null
          strategy_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategy_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_onboarding_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strategy_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          event_id: string
          id: string
          processed_at: string | null
          type: string
        }
        Insert: {
          event_id: string
          id?: string
          processed_at?: string | null
          type: string
        }
        Update: {
          event_id?: string
          id?: string
          processed_at?: string | null
          type?: string
        }
        Relationships: []
      }
      stripe_products: {
        Row: {
          amount_nok: number
          created_at: string
          currency: string
          description_en: string | null
          description_no: string | null
          id: string
          interval: string
          interval_count: number
          is_active: boolean
          metadata: Json | null
          name_en: string | null
          name_no: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          tier_slug: string
          updated_at: string
        }
        Insert: {
          amount_nok: number
          created_at?: string
          currency?: string
          description_en?: string | null
          description_no?: string | null
          id?: string
          interval?: string
          interval_count?: number
          is_active?: boolean
          metadata?: Json | null
          name_en?: string | null
          name_no: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier_slug: string
          updated_at?: string
        }
        Update: {
          amount_nok?: number
          created_at?: string
          currency?: string
          description_en?: string | null
          description_no?: string | null
          id?: string
          interval?: string
          interval_count?: number
          is_active?: boolean
          metadata?: Json | null
          name_en?: string | null
          name_no?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          tier_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier_slug: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_slug?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier_slug?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged: boolean
          acknowledged_at: string | null
          acknowledged_by: string | null
          component: string
          created_at: string
          details: Json | null
          id: string
          message: string
          severity: string
        }
        Insert: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          component: string
          created_at?: string
          details?: Json | null
          id?: string
          message: string
          severity: string
        }
        Update: {
          acknowledged?: boolean
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          component?: string
          created_at?: string
          details?: Json | null
          id?: string
          message?: string
          severity?: string
        }
        Relationships: []
      }
      system_flags: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          checked_at: string | null
          email_status: string
          id: string
          metadata: Json | null
          response_time_ms: number | null
          supabase_status: string
        }
        Insert: {
          checked_at?: string | null
          email_status: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          supabase_status: string
        }
        Update: {
          checked_at?: string | null
          email_status?: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          supabase_status?: string
        }
        Relationships: []
      }
      terminal_jobs: {
        Row: {
          cmd: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          exit_code: number | null
          id: string
          pid: number | null
          session_id: string | null
          started_at: string | null
          status: string
          stderr: string | null
          stdout: string | null
          validation_result: Json | null
        }
        Insert: {
          cmd: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          pid?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          stderr?: string | null
          stdout?: string | null
          validation_result?: Json | null
        }
        Update: {
          cmd?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          pid?: number | null
          session_id?: string | null
          started_at?: string | null
          status?: string
          stderr?: string | null
          stdout?: string | null
          validation_result?: Json | null
        }
        Relationships: []
      }
      trade_decisions: {
        Row: {
          created_at: string | null
          daily_loss_pct: number | null
          decision_type: string
          executed_price: number | null
          executed_quantity: number | null
          id: string
          post_trade_exposure_pct: number | null
          post_trade_position_pct: number | null
          pre_trade_exposure_pct: number | null
          pre_trade_position_pct: number | null
          rejection_reason: string | null
          requested_price: number
          requested_quantity: number
          risk_profile_id: string | null
          session_id: string | null
          side: string
          symbol: string
          trading_mode: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_loss_pct?: number | null
          decision_type: string
          executed_price?: number | null
          executed_quantity?: number | null
          id?: string
          post_trade_exposure_pct?: number | null
          post_trade_position_pct?: number | null
          pre_trade_exposure_pct?: number | null
          pre_trade_position_pct?: number | null
          rejection_reason?: string | null
          requested_price: number
          requested_quantity: number
          risk_profile_id?: string | null
          session_id?: string | null
          side: string
          symbol: string
          trading_mode: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_loss_pct?: number | null
          decision_type?: string
          executed_price?: number | null
          executed_quantity?: number | null
          id?: string
          post_trade_exposure_pct?: number | null
          post_trade_position_pct?: number | null
          pre_trade_exposure_pct?: number | null
          pre_trade_position_pct?: number | null
          rejection_reason?: string | null
          requested_price?: number
          requested_quantity?: number
          risk_profile_id?: string | null
          session_id?: string | null
          side?: string
          symbol?: string
          trading_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_decisions_risk_profile_id_fkey"
            columns: ["risk_profile_id"]
            isOneToOne: false
            referencedRelation: "risk_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          amount: number
          created_at: string | null
          executed_at: string | null
          id: string
          pnl: number | null
          price: number
          side: string
          symbol: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          executed_at?: string | null
          id?: string
          pnl?: number | null
          price: number
          side: string
          symbol: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          executed_at?: string | null
          id?: string
          pnl?: number | null
          price?: number
          side?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_mistakes: {
        Row: {
          agent_id: string
          category: string
          created_at: string | null
          entry_price: number
          exit_price: number
          exit_reason: string | null
          healing_action: Json | null
          healing_applied: boolean | null
          id: string
          pnl: number
          pnl_pct: number
          regime_at_entry: string | null
          rsi_at_entry: number | null
          symbol: string
          trade_id: string | null
          user_id: string | null
          volatility_at_entry: number | null
        }
        Insert: {
          agent_id: string
          category: string
          created_at?: string | null
          entry_price: number
          exit_price: number
          exit_reason?: string | null
          healing_action?: Json | null
          healing_applied?: boolean | null
          id?: string
          pnl: number
          pnl_pct: number
          regime_at_entry?: string | null
          rsi_at_entry?: number | null
          symbol: string
          trade_id?: string | null
          user_id?: string | null
          volatility_at_entry?: number | null
        }
        Update: {
          agent_id?: string
          category?: string
          created_at?: string | null
          entry_price?: number
          exit_price?: number
          exit_reason?: string | null
          healing_action?: Json | null
          healing_applied?: boolean | null
          id?: string
          pnl?: number
          pnl_pct?: number
          regime_at_entry?: string | null
          rsi_at_entry?: number | null
          symbol?: string
          trade_id?: string | null
          user_id?: string | null
          volatility_at_entry?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trade_mistakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_onboarding_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_mistakes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_notes: {
        Row: {
          created_at: string | null
          id: string
          note: string
          tags: string[] | null
          trade_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          note: string
          tags?: string[] | null
          trade_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string
          tags?: string[] | null
          trade_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_outbox: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          exchange_order_id: string | null
          executed_at: string | null
          executed_price: number | null
          executed_quantity: number | null
          fee: number | null
          id: string
          metadata: Json | null
          mode: string
          next_retry_at: string | null
          order_type: string
          price: number
          quantity: number
          session_id: string
          side: string
          status: string
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          exchange_order_id?: string | null
          executed_at?: string | null
          executed_price?: number | null
          executed_quantity?: number | null
          fee?: number | null
          id: string
          metadata?: Json | null
          mode: string
          next_retry_at?: string | null
          order_type: string
          price: number
          quantity: number
          session_id: string
          side: string
          status?: string
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          exchange_order_id?: string | null
          executed_at?: string | null
          executed_price?: number | null
          executed_quantity?: number | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          mode?: string
          next_retry_at?: string | null
          order_type?: string
          price?: number
          quantity?: number
          session_id?: string
          side?: string
          status?: string
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_rejections: {
        Row: {
          bot_id: string | null
          created_at: string | null
          id: string
          order_type: string
          price: number
          quantity: number
          rejection_details: Json | null
          rejection_reason: string
          risk_profile_id: string | null
          session_id: string | null
          side: string
          symbol: string
          trading_mode: string
          user_id: string
        }
        Insert: {
          bot_id?: string | null
          created_at?: string | null
          id?: string
          order_type: string
          price: number
          quantity: number
          rejection_details?: Json | null
          rejection_reason: string
          risk_profile_id?: string | null
          session_id?: string | null
          side: string
          symbol: string
          trading_mode: string
          user_id: string
        }
        Update: {
          bot_id?: string | null
          created_at?: string | null
          id?: string
          order_type?: string
          price?: number
          quantity?: number
          rejection_details?: Json | null
          rejection_reason?: string
          risk_profile_id?: string | null
          session_id?: string | null
          side?: string
          symbol?: string
          trading_mode?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_rejections_risk_profile_id_fkey"
            columns: ["risk_profile_id"]
            isOneToOne: false
            referencedRelation: "risk_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_rejections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_rejections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_rejections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_sync_log: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          message: string | null
          started_at: string | null
          status: string | null
          trades_fetched: number | null
          trades_saved: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          started_at?: string | null
          status?: string | null
          trades_fetched?: number | null
          trades_saved?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          message?: string | null
          started_at?: string | null
          status?: string | null
          trades_fetched?: number | null
          trades_saved?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "trade_sync_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      trader_profiles: {
        Row: {
          all_time_roi: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          follower_count: number | null
          id: string
          is_public: boolean | null
          performance_fee_pct: number | null
          sharpe_ratio: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          verified: boolean | null
          win_rate: number | null
        }
        Insert: {
          all_time_roi?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          follower_count?: number | null
          id?: string
          is_public?: boolean | null
          performance_fee_pct?: number | null
          sharpe_ratio?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          win_rate?: number | null
        }
        Update: {
          all_time_roi?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          follower_count?: number | null
          id?: string
          is_public?: boolean | null
          performance_fee_pct?: number | null
          sharpe_ratio?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          win_rate?: number | null
        }
        Relationships: []
      }
      trader_verifications: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          status: string
          trader_profile_id: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
          trader_profile_id: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          status?: string
          trader_profile_id?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trader_verifications_trader_profile_id_fkey"
            columns: ["trader_profile_id"]
            isOneToOne: false
            referencedRelation: "trader_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          binance_order_id: string | null
          created_at: string
          executed_at: string
          fee: number
          fill_rate: number | null
          filled_quantity: number | null
          id: string
          idempotency_key: string | null
          idempotency_scope: string
          indicator_snapshot: Json | null
          is_copy: boolean
          is_mock: boolean
          latency_ms: number | null
          leader_trade_id: string | null
          metadata: Json | null
          mode: Database["public"]["Enums"]["trading_mode"]
          order_type: Database["public"]["Enums"]["order_type"]
          pilot_explanation: string | null
          pilot_trade: boolean | null
          post_trade_price_1min: number | null
          post_trade_price_5min: number | null
          price: number
          quantity: number
          realized_pnl: number | null
          reason_code: string | null
          reason_params: Json | null
          session_id: string
          side: Database["public"]["Enums"]["trade_side"]
          slippage_bps: number | null
          spread_bps: number | null
          status: Database["public"]["Enums"]["trade_status"]
          strategy_signal: Json | null
          total_value: number
          trading_pair: string
          usdt_nok_rate: number | null
          user_id: string
          venue: string | null
        }
        Insert: {
          binance_order_id?: string | null
          created_at?: string
          executed_at?: string
          fee?: number
          fill_rate?: number | null
          filled_quantity?: number | null
          id?: string
          idempotency_key?: string | null
          idempotency_scope?: string
          indicator_snapshot?: Json | null
          is_copy?: boolean
          is_mock?: boolean
          latency_ms?: number | null
          leader_trade_id?: string | null
          metadata?: Json | null
          mode: Database["public"]["Enums"]["trading_mode"]
          order_type?: Database["public"]["Enums"]["order_type"]
          pilot_explanation?: string | null
          pilot_trade?: boolean | null
          post_trade_price_1min?: number | null
          post_trade_price_5min?: number | null
          price: number
          quantity: number
          realized_pnl?: number | null
          reason_code?: string | null
          reason_params?: Json | null
          session_id: string
          side: Database["public"]["Enums"]["trade_side"]
          slippage_bps?: number | null
          spread_bps?: number | null
          status?: Database["public"]["Enums"]["trade_status"]
          strategy_signal?: Json | null
          total_value: number
          trading_pair: string
          usdt_nok_rate?: number | null
          user_id: string
          venue?: string | null
        }
        Update: {
          binance_order_id?: string | null
          created_at?: string
          executed_at?: string
          fee?: number
          fill_rate?: number | null
          filled_quantity?: number | null
          id?: string
          idempotency_key?: string | null
          idempotency_scope?: string
          indicator_snapshot?: Json | null
          is_copy?: boolean
          is_mock?: boolean
          latency_ms?: number | null
          leader_trade_id?: string | null
          metadata?: Json | null
          mode?: Database["public"]["Enums"]["trading_mode"]
          order_type?: Database["public"]["Enums"]["order_type"]
          pilot_explanation?: string | null
          pilot_trade?: boolean | null
          post_trade_price_1min?: number | null
          post_trade_price_5min?: number | null
          price?: number
          quantity?: number
          realized_pnl?: number | null
          reason_code?: string | null
          reason_params?: Json | null
          session_id?: string
          side?: Database["public"]["Enums"]["trade_side"]
          slippage_bps?: number | null
          spread_bps?: number | null
          status?: Database["public"]["Enums"]["trade_status"]
          strategy_signal?: Json | null
          total_value?: number
          trading_pair?: string
          usdt_nok_rate?: number | null
          user_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_leader_trade_id_fkey"
            columns: ["leader_trade_id"]
            isOneToOne: false
            referencedRelation: "paper_trades_compat"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_leader_trade_id_fkey"
            columns: ["leader_trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_api_keys: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          last_used_at: string | null
          permissions: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_used_at?: string | null
          permissions?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string | null
          exchange?: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_used_at?: string | null
          permissions?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trading_gap_metrics: {
        Row: {
          alert_details: Json | null
          alert_triggered: boolean
          computed_at: string
          created_at: string
          gap_name: string
          id: string
          metrics: Json
          period_from: string
          period_to: string
        }
        Insert: {
          alert_details?: Json | null
          alert_triggered?: boolean
          computed_at?: string
          created_at?: string
          gap_name: string
          id?: string
          metrics: Json
          period_from: string
          period_to: string
        }
        Update: {
          alert_details?: Json | null
          alert_triggered?: boolean
          computed_at?: string
          created_at?: string
          gap_name?: string
          id?: string
          metrics?: Json
          period_from?: string
          period_to?: string
        }
        Relationships: []
      }
      trading_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          session_id: string
          trade_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          session_id: string
          trade_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          session_id?: string
          trade_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trading_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_onboarding_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_risk_config: {
        Row: {
          created_at: string | null
          id: string
          max_daily_loss: number | null
          max_position_size: number | null
          stop_loss_pct: number | null
          take_profit_pct: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          max_daily_loss?: number | null
          max_position_size?: number | null
          stop_loss_pct?: number | null
          take_profit_pct?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          max_daily_loss?: number | null
          max_position_size?: number | null
          stop_loss_pct?: number | null
          take_profit_pct?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trading_sessions: {
        Row: {
          archived: boolean | null
          archived_at: string | null
          autopilot_id: string | null
          backtest_expected_pnl: number | null
          copied_from_listing_id: string | null
          copy_source_session_id: string | null
          crash_count: number
          created_at: string
          current_capital: number
          current_capital_nok: number | null
          error_message: string | null
          id: string
          initial_capital: number
          is_pilot: boolean
          is_leaderboard_visible: boolean
          last_analysis_details: Json | null
          last_heartbeat: string
          last_status_message: string | null
          last_tick_at: string | null
          losing_trades: number
          max_drawdown_pct: number | null
          max_trades: number | null
          mode: Database["public"]["Enums"]["trading_mode"]
          next_expected_action_at: string | null
          open_position: Json | null
          phase: Database["public"]["Enums"]["trading_phase"] | null
          phase_started_at: string | null
          risk_level: Database["public"]["Enums"]["risk_level"] | null
          smart_trader_config: Json | null
          smart_trader_enabled: boolean
          started_at: string
          starting_capital_nok: number | null
          status: Database["public"]["Enums"]["session_status"]
          stopped_at: string | null
          strategy_config: Json
          strategy_id: string
          total_pnl: number
          total_trades: number
          trading_pair: string
          updated_at: string
          user_id: string
          winning_trades: number
        }
        Insert: {
          archived?: boolean | null
          archived_at?: string | null
          autopilot_id?: string | null
          backtest_expected_pnl?: number | null
          copied_from_listing_id?: string | null
          copy_source_session_id?: string | null
          crash_count?: number
          created_at?: string
          current_capital?: number
          current_capital_nok?: number | null
          error_message?: string | null
          id?: string
          initial_capital?: number
          is_pilot?: boolean
          is_leaderboard_visible?: boolean
          last_analysis_details?: Json | null
          last_heartbeat?: string
          last_status_message?: string | null
          last_tick_at?: string | null
          losing_trades?: number
          max_drawdown_pct?: number | null
          max_trades?: number | null
          mode?: Database["public"]["Enums"]["trading_mode"]
          next_expected_action_at?: string | null
          open_position?: Json | null
          phase?: Database["public"]["Enums"]["trading_phase"] | null
          phase_started_at?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          smart_trader_config?: Json | null
          smart_trader_enabled?: boolean
          started_at?: string
          starting_capital_nok?: number | null
          status?: Database["public"]["Enums"]["session_status"]
          stopped_at?: string | null
          strategy_config?: Json
          strategy_id?: string
          total_pnl?: number
          total_trades?: number
          trading_pair?: string
          updated_at?: string
          user_id: string
          winning_trades?: number
        }
        Update: {
          archived?: boolean | null
          archived_at?: string | null
          autopilot_id?: string | null
          backtest_expected_pnl?: number | null
          copied_from_listing_id?: string | null
          copy_source_session_id?: string | null
          crash_count?: number
          created_at?: string
          current_capital?: number
          current_capital_nok?: number | null
          error_message?: string | null
          id?: string
          initial_capital?: number
          is_pilot?: boolean
          is_leaderboard_visible?: boolean
          last_analysis_details?: Json | null
          last_heartbeat?: string
          last_status_message?: string | null
          last_tick_at?: string | null
          losing_trades?: number
          max_drawdown_pct?: number | null
          max_trades?: number | null
          mode?: Database["public"]["Enums"]["trading_mode"]
          next_expected_action_at?: string | null
          open_position?: Json | null
          phase?: Database["public"]["Enums"]["trading_phase"] | null
          phase_started_at?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"] | null
          smart_trader_config?: Json | null
          smart_trader_enabled?: boolean
          started_at?: string
          starting_capital_nok?: number | null
          status?: Database["public"]["Enums"]["session_status"]
          stopped_at?: string | null
          strategy_config?: Json
          strategy_id?: string
          total_pnl?: number
          total_trades?: number
          trading_pair?: string
          updated_at?: string
          user_id?: string
          winning_trades?: number
        }
        Relationships: [
          {
            foreignKeyName: "trading_sessions_autopilot_id_fkey"
            columns: ["autopilot_id"]
            isOneToOne: false
            referencedRelation: "ai_autopilot_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_sessions_copied_from_listing_id_fkey"
            columns: ["copied_from_listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_sessions_copy_source_session_id_fkey"
            columns: ["copy_source_session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_sessions_copy_source_session_id_fkey"
            columns: ["copy_source_session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trading_sessions_copy_source_session_id_fkey"
            columns: ["copy_source_session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_signals: {
        Row: {
          action: string | null
          agent_id: string | null
          agent_meta: Json | null
          agent_weight: number | null
          asset_name: string | null
          confidence: number | null
          created_at: string
          ensemble_run_id: string | null
          entry_price: number | null
          expires_at: string | null
          feature_version: string | null
          id: string
          model_version: string | null
          reasoning: string | null
          risk_level: number | null
          signal_type: string | null
          status: string | null
          stop_loss: number | null
          symbol: string
          target_price: number | null
        }
        Insert: {
          action?: string | null
          agent_id?: string | null
          agent_meta?: Json | null
          agent_weight?: number | null
          asset_name?: string | null
          confidence?: number | null
          created_at?: string
          ensemble_run_id?: string | null
          entry_price?: number | null
          expires_at?: string | null
          feature_version?: string | null
          id?: string
          model_version?: string | null
          reasoning?: string | null
          risk_level?: number | null
          signal_type?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol: string
          target_price?: number | null
        }
        Update: {
          action?: string | null
          agent_id?: string | null
          agent_meta?: Json | null
          agent_weight?: number | null
          asset_name?: string | null
          confidence?: number | null
          created_at?: string
          ensemble_run_id?: string | null
          entry_price?: number | null
          expires_at?: string | null
          feature_version?: string | null
          id?: string
          model_version?: string | null
          reasoning?: string | null
          risk_level?: number | null
          signal_type?: string | null
          status?: string | null
          stop_loss?: number | null
          symbol?: string
          target_price?: number | null
        }
        Relationships: []
      }
      trading_stats: {
        Row: {
          best_trade: number | null
          id: string
          total_pnl: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          winning_trades: number | null
          worst_trade: number | null
        }
        Insert: {
          best_trade?: number | null
          id?: string
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          winning_trades?: number | null
          worst_trade?: number | null
        }
        Update: {
          best_trade?: number | null
          id?: string
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          winning_trades?: number | null
          worst_trade?: number | null
        }
        Relationships: []
      }
      unified_notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel_v2"]
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          is_sent: boolean | null
          sent_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_v2"]
          user_id: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["notification_channel_v2"]
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          sent_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type_v2"]
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel_v2"]
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          is_sent?: boolean | null
          sent_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type_v2"]
          user_id?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          awarded_at: string | null
          description: string | null
          icon: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          awarded_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          awarded_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_auto_trading_configs: {
        Row: {
          allocated_capital_pct: number | null
          auto_extract_profit_amount_pct: number | null
          auto_extract_profit_enabled: boolean | null
          auto_extract_profit_threshold_pct: number | null
          created_at: string | null
          custom_params: Json | null
          id: string
          is_enabled: boolean | null
          is_paper_trading: boolean | null
          last_trade_at: string | null
          override_daily_loss_limit_pct: number | null
          override_max_trades_per_day: number | null
          override_stop_loss_pct: number | null
          phase: string | null
          phase_min_days: number | null
          phase_profitable: boolean | null
          phase_started_at: string | null
          risk_level: string
          strategy_id: string
          trading_capital_nok: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allocated_capital_pct?: number | null
          auto_extract_profit_amount_pct?: number | null
          auto_extract_profit_enabled?: boolean | null
          auto_extract_profit_threshold_pct?: number | null
          created_at?: string | null
          custom_params?: Json | null
          id?: string
          is_enabled?: boolean | null
          is_paper_trading?: boolean | null
          last_trade_at?: string | null
          override_daily_loss_limit_pct?: number | null
          override_max_trades_per_day?: number | null
          override_stop_loss_pct?: number | null
          phase?: string | null
          phase_min_days?: number | null
          phase_profitable?: boolean | null
          phase_started_at?: string | null
          risk_level?: string
          strategy_id: string
          trading_capital_nok?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allocated_capital_pct?: number | null
          auto_extract_profit_amount_pct?: number | null
          auto_extract_profit_enabled?: boolean | null
          auto_extract_profit_threshold_pct?: number | null
          created_at?: string | null
          custom_params?: Json | null
          id?: string
          is_enabled?: boolean | null
          is_paper_trading?: boolean | null
          last_trade_at?: string | null
          override_daily_loss_limit_pct?: number | null
          override_max_trades_per_day?: number | null
          override_stop_loss_pct?: number | null
          phase?: string | null
          phase_min_days?: number | null
          phase_profitable?: boolean | null
          phase_started_at?: string | null
          risk_level?: string
          strategy_id?: string
          trading_capital_nok?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_auto_trading_configs_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "auto_trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          is_completed: boolean | null
          last_accessed_at: string | null
          lesson_id: string | null
          progress_percent: number | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          lesson_id?: string | null
          progress_percent?: number | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          is_completed?: boolean | null
          last_accessed_at?: string | null
          lesson_id?: string | null
          progress_percent?: number | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_course_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_enrollments: {
        Row: {
          course_id: string
          enrolled_at: string | null
          expires_at: string | null
          id: string
          status: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "admin_user_list"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "paper_trading_leaderboard"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_entitlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "user_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_stats_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gamification: {
        Row: {
          created_at: string | null
          current_level: number
          current_streak: number
          id: string
          last_login_date: string | null
          level_up_at: string | null
          total_xp: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_level?: number
          current_streak?: number
          id?: string
          last_login_date?: string | null
          level_up_at?: string | null
          total_xp?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_level?: number
          current_streak?: number
          id?: string
          last_login_date?: string | null
          level_up_at?: string | null
          total_xp?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_klt_balances: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          total_earned: number
          total_spent: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          total_earned?: number
          total_spent?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_kraken_keys: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_validated_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_lesson_progress: {
        Row: {
          completed_at: string | null
          course_completed_at: string | null
          created_at: string | null
          id: string
          lesson_id: string
          status: string | null
          time_spent_seconds: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id: string
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_completed_at?: string | null
          created_at?: string | null
          id?: string
          lesson_id?: string
          status?: string | null
          time_spent_seconds?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notification_settings: {
        Row: {
          email_enabled: boolean | null
          email_marketing: boolean | null
          email_signals: boolean | null
          email_weekly_report: boolean | null
          push_enabled: boolean | null
          push_market_updates: boolean | null
          push_price_alerts: boolean | null
          push_signals: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_enabled: boolean | null
          sms_price_alerts: boolean | null
          sms_signals: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_enabled?: boolean | null
          email_marketing?: boolean | null
          email_signals?: boolean | null
          email_weekly_report?: boolean | null
          push_enabled?: boolean | null
          push_market_updates?: boolean | null
          push_price_alerts?: boolean | null
          push_signals?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          sms_price_alerts?: boolean | null
          sms_signals?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_enabled?: boolean | null
          email_marketing?: boolean | null
          email_signals?: boolean | null
          email_weekly_report?: boolean | null
          push_enabled?: boolean | null
          push_market_updates?: boolean | null
          push_price_alerts?: boolean | null
          push_signals?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_enabled?: boolean | null
          sms_price_alerts?: boolean | null
          sms_signals?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_okx_keys: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          broker_code: string | null
          created_at: string
          id: string
          is_active: boolean
          last_validated_at: string | null
          passphrase_encrypted: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          broker_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          passphrase_encrypted: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          broker_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_validated_at?: string | null
          passphrase_encrypted?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_portfolios: {
        Row: {
          cash_balance: number | null
          daily_pnl: number | null
          id: string
          invested_value: number | null
          mode: string
          total_pnl: number | null
          total_trades: number | null
          total_value: number | null
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
        }
        Insert: {
          cash_balance?: number | null
          daily_pnl?: number | null
          id?: string
          invested_value?: number | null
          mode?: string
          total_pnl?: number | null
          total_trades?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Update: {
          cash_balance?: number | null
          daily_pnl?: number | null
          id?: string
          invested_value?: number | null
          mode?: string
          total_pnl?: number | null
          total_trades?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_risk_level: Database["public"]["Enums"]["risk_level"] | null
          dismissed_get_started_card: boolean
          display_name: string
          earned_badges: Json
          email: string | null
          email_daily_digest: boolean
          email_on_crash: boolean
          email_on_trade: boolean
          font_size_preference: string
          full_name: string | null
          google_id: string | null
          high_contrast_mode: boolean
          id: string
          is_priority: boolean | null
          learning_progress: Json
          live_phase: string
          locale: string | null
          microsoft_id: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_dismissed_at: string | null
          onboarding_started_at: string | null
          onboarding_step: number
          paper_balance: number
          paper_trades_count: number
          preferred_trading_mode: string | null
          provider: string | null
          risk_accepted_at: string | null
          risk_tolerance: string | null
          role: string | null
          setup_completed_at: string | null
          show_on_leaderboard: boolean | null
          status: string | null
          subscription_status: string
          subscription_tier: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          tier_expires_at: string | null
          trading_experience: string | null
          ui_theme: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          dismissed_get_started_card?: boolean
          display_name?: string
          earned_badges?: Json
          email?: string | null
          email_daily_digest?: boolean
          email_on_crash?: boolean
          email_on_trade?: boolean
          font_size_preference?: string
          full_name?: string | null
          google_id?: string | null
          high_contrast_mode?: boolean
          id: string
          is_priority?: boolean | null
          learning_progress?: Json
          live_phase?: string
          locale?: string | null
          microsoft_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_dismissed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: number
          paper_balance?: number
          paper_trades_count?: number
          preferred_trading_mode?: string | null
          provider?: string | null
          risk_accepted_at?: string | null
          risk_tolerance?: string | null
          role?: string | null
          setup_completed_at?: string | null
          show_on_leaderboard?: boolean | null
          status?: string | null
          subscription_status?: string
          subscription_tier?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          tier_expires_at?: string | null
          trading_experience?: string | null
          ui_theme?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_risk_level?: Database["public"]["Enums"]["risk_level"] | null
          dismissed_get_started_card?: boolean
          display_name?: string
          earned_badges?: Json
          email?: string | null
          email_daily_digest?: boolean
          email_on_crash?: boolean
          email_on_trade?: boolean
          font_size_preference?: string
          full_name?: string | null
          google_id?: string | null
          high_contrast_mode?: boolean
          id?: string
          is_priority?: boolean | null
          learning_progress?: Json
          live_phase?: string
          locale?: string | null
          microsoft_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_dismissed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: number
          paper_balance?: number
          paper_trades_count?: number
          preferred_trading_mode?: string | null
          provider?: string | null
          risk_accepted_at?: string | null
          risk_tolerance?: string | null
          role?: string | null
          setup_completed_at?: string | null
          show_on_leaderboard?: boolean | null
          status?: string | null
          subscription_status?: string
          subscription_tier?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          tier_expires_at?: string | null
          trading_experience?: string | null
          ui_theme?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      user_quiz_attempts: {
        Row: {
          attempted_at: string | null
          id: string
          is_correct: boolean
          question_id: string
          selected_option_id: string
          user_id: string
        }
        Insert: {
          attempted_at?: string | null
          id?: string
          is_correct: boolean
          question_id: string
          selected_option_id: string
          user_id: string
        }
        Update: {
          attempted_at?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string
          selected_option_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          allow_copy_trading: boolean | null
          autotrade_enabled: boolean | null
          autotrade_max_daily_trades: number | null
          autotrade_max_position_percent: number | null
          autotrade_stop_loss_percent: number | null
          autotrade_take_profit_percent: number | null
          language: string | null
          safe_mode_enabled: boolean | null
          show_in_leaderboard: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allow_copy_trading?: boolean | null
          autotrade_enabled?: boolean | null
          autotrade_max_daily_trades?: number | null
          autotrade_max_position_percent?: number | null
          autotrade_stop_loss_percent?: number | null
          autotrade_take_profit_percent?: number | null
          language?: string | null
          safe_mode_enabled?: boolean | null
          show_in_leaderboard?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allow_copy_trading?: boolean | null
          autotrade_enabled?: boolean | null
          autotrade_max_daily_trades?: number | null
          autotrade_max_position_percent?: number | null
          autotrade_stop_loss_percent?: number | null
          autotrade_take_profit_percent?: number | null
          language?: string | null
          safe_mode_enabled?: boolean | null
          show_in_leaderboard?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_strategies: {
        Row: {
          config: Json | null
          copied_from_listing_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          is_marketplace_listed: boolean | null
          is_public: boolean | null
          last_analysis_details: Json | null
          last_status_message: string | null
          mode: string
          next_expected_action_at: string | null
          performance_fee_pct: number | null
          started_at: string | null
          stopped_at: string | null
          strategy_type: string
          subscriber_count: number | null
          total_pnl: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config?: Json | null
          copied_from_listing_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_marketplace_listed?: boolean | null
          is_public?: boolean | null
          last_analysis_details?: Json | null
          last_status_message?: string | null
          mode?: string
          next_expected_action_at?: string | null
          performance_fee_pct?: number | null
          started_at?: string | null
          stopped_at?: string | null
          strategy_type: string
          subscriber_count?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config?: Json | null
          copied_from_listing_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_marketplace_listed?: boolean | null
          is_public?: boolean | null
          last_analysis_details?: Json | null
          last_status_message?: string | null
          mode?: string
          next_expected_action_at?: string | null
          performance_fee_pct?: number | null
          started_at?: string | null
          stopped_at?: string | null
          strategy_type?: string
          subscriber_count?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_strategies_copied_from_listing_id_fkey"
            columns: ["copied_from_listing_id"]
            isOneToOne: false
            referencedRelation: "marketplace_listings"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      vipps_agreements: {
        Row: {
          activated_at: string | null
          agreement_id: string
          amount: number
          created_at: string
          expired_at: string | null
          id: string
          product_name: string
          status: string
          stopped_at: string | null
          tier: string
          user_id: string | null
          vipps_confirmation_url: string | null
        }
        Insert: {
          activated_at?: string | null
          agreement_id: string
          amount: number
          created_at?: string
          expired_at?: string | null
          id?: string
          product_name: string
          status?: string
          stopped_at?: string | null
          tier: string
          user_id?: string | null
          vipps_confirmation_url?: string | null
        }
        Update: {
          activated_at?: string | null
          agreement_id?: string
          amount?: number
          created_at?: string
          expired_at?: string | null
          id?: string
          product_name?: string
          status?: string
          stopped_at?: string | null
          tier?: string
          user_id?: string | null
          vipps_confirmation_url?: string | null
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string | null
          referral_code: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          referral_code?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          referral_code?: string | null
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string | null
          currency: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whale_movements: {
        Row: {
          amount: number
          detected_at: string | null
          from_address: string | null
          id: string
          interpretation: string | null
          symbol: string
          to_address: string | null
          tx_hash: string
          usd_value: number | null
        }
        Insert: {
          amount: number
          detected_at?: string | null
          from_address?: string | null
          id?: string
          interpretation?: string | null
          symbol: string
          to_address?: string | null
          tx_hash: string
          usd_value?: number | null
        }
        Update: {
          amount?: number
          detected_at?: string | null
          from_address?: string | null
          id?: string
          interpretation?: string | null
          symbol?: string
          to_address?: string | null
          tx_hash?: string
          usd_value?: number | null
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          action: string
          amount: number
          created_at: string | null
          description: string | null
          id: string
          level_up: boolean | null
          metadata: Json | null
          new_level: number
          new_xp: number
          previous_level: number
          previous_xp: number
          user_id: string
        }
        Insert: {
          action: string
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          level_up?: boolean | null
          metadata?: Json | null
          new_level: number
          new_xp: number
          previous_level: number
          previous_xp: number
          user_id: string
        }
        Update: {
          action?: string
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          level_up?: boolean | null
          metadata?: Json | null
          new_level?: number
          new_xp?: number
          previous_level?: number
          previous_xp?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_signals_summary: {
        Row: {
          avg_confidence: number | null
          long_signals: number | null
          short_signals: number | null
          total_active: number | null
        }
        Relationships: []
      }
      active_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string | null
          plan_type: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
        }
        Relationships: []
      }
      admin_user_list: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          portfolio_value: number | null
          role: string | null
          subscription_tier: string | null
          total_trades: number | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key_encrypted: string | null
          api_secret_encrypted: string | null
          created_at: string | null
          exchange: string | null
          id: string | null
          is_active: boolean | null
          is_testnet: boolean | null
          last_used_at: string | null
          permissions: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          created_at?: string | null
          exchange?: string | null
          id?: string | null
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_used_at?: string | null
          permissions?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          api_secret_encrypted?: string | null
          created_at?: string | null
          exchange?: string | null
          id?: string | null
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_used_at?: string | null
          permissions?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      client_errors_summary: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          error_message: string | null
          error_type: string | null
          id: string | null
          page_url: string | null
          resolved: boolean | null
          severity: string | null
          time_ago: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string | null
          page_url?: string | null
          resolved?: boolean | null
          severity?: string | null
          time_ago?: never
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          error_message?: string | null
          error_type?: string | null
          id?: string | null
          page_url?: string | null
          resolved?: boolean | null
          severity?: string | null
          time_ago?: never
        }
        Relationships: []
      }
      current_leaderboard: {
        Row: {
          display_name: string | null
          month: string | null
          points: number | null
          rank: number | null
          stats: Json | null
          subscription_tier: string | null
          user_id: string | null
        }
        Relationships: []
      }
      jokertrade_monitor: {
        Row: {
          capital_change_pct: number | null
          current_capital_nok: number | null
          error_message: string | null
          has_position: boolean | null
          id: string | null
          last_heartbeat: string | null
          losing_trades: number | null
          pnl_pct: number | null
          position_entry_price: number | null
          position_symbol: string | null
          smart_trader_enabled: boolean | null
          starting_capital_nok: number | null
          total_pnl: number | null
          total_trades: number | null
          trading_pair: string | null
          updated_at: string | null
          user_id: string | null
          winning_trades: number | null
        }
        Insert: {
          capital_change_pct?: never
          current_capital_nok?: number | null
          error_message?: string | null
          has_position?: never
          id?: string | null
          last_heartbeat?: string | null
          losing_trades?: number | null
          pnl_pct?: never
          position_entry_price?: never
          position_symbol?: never
          smart_trader_enabled?: boolean | null
          starting_capital_nok?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          trading_pair?: string | null
          updated_at?: string | null
          user_id?: string | null
          winning_trades?: number | null
        }
        Update: {
          capital_change_pct?: never
          current_capital_nok?: number | null
          error_message?: string | null
          has_position?: never
          id?: string | null
          last_heartbeat?: string | null
          losing_trades?: number | null
          pnl_pct?: never
          position_entry_price?: never
          position_symbol?: never
          smart_trader_enabled?: boolean | null
          starting_capital_nok?: number | null
          total_pnl?: number | null
          total_trades?: number | null
          trading_pair?: string | null
          updated_at?: string | null
          user_id?: string | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      klarpakke_cron_failures: {
        Row: {
          jobname: string | null
          return_message: string | null
          start_time: string | null
          status: string | null
        }
        Relationships: []
      }
      klarpakke_cron_status: {
        Row: {
          active: boolean | null
          duration_sec: number | null
          end_time: string | null
          jobname: string | null
          return_message: string | null
          schedule: string | null
          start_time: string | null
          status: string | null
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string | null
          is_public: boolean | null
          period: string | null
          previous_rank: number | null
          rank: number | null
          return_pct: number | null
          risk_level: string | null
          sharpe_ratio: number | null
          simulation_id: string | null
          total_trades: number | null
          updated_at: string | null
          user_display_name: string | null
          user_id: string | null
          win_rate: number | null
        }
        Relationships: []
      }
      marketing_funnel_summary: {
        Row: {
          day: string | null
          signups: number | null
          source: string | null
        }
        Relationships: []
      }
      paper_trades_compat: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          created_at: string | null
          entry_price: number | null
          exit_price: number | null
          id: string | null
          leverage: number | null
          opened_at: string | null
          pnl: number | null
          pnl_pct: number | null
          position_value: number | null
          quantity: number | null
          side: string | null
          simulation_id: string | null
          status: string | null
          stop_loss: number | null
          symbol: string | null
          take_profit: number | null
          updated_at: string | null
        }
        Insert: {
          close_reason?: never
          closed_at?: never
          created_at?: string | null
          entry_price?: number | null
          exit_price?: never
          id?: string | null
          leverage?: never
          opened_at?: string | null
          pnl?: number | null
          pnl_pct?: never
          position_value?: number | null
          quantity?: number | null
          side?: never
          simulation_id?: string | null
          status?: never
          stop_loss?: never
          symbol?: string | null
          take_profit?: never
          updated_at?: string | null
        }
        Update: {
          close_reason?: never
          closed_at?: never
          created_at?: string | null
          entry_price?: number | null
          exit_price?: never
          id?: string | null
          leverage?: never
          opened_at?: string | null
          pnl?: number | null
          pnl_pct?: never
          position_value?: number | null
          quantity?: number | null
          side?: never
          simulation_id?: string | null
          status?: never
          stop_loss?: never
          symbol?: string | null
          take_profit?: never
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      paper_trading_leaderboard: {
        Row: {
          avatar_url: string | null
          badge: string | null
          total_profit_loss_percent: number | null
          total_trades: number | null
          user_id: string | null
          username: string | null
          win_rate: number | null
        }
        Relationships: []
      }
      public_strategies: {
        Row: {
          creator_name: string | null
          creator_tier: string | null
          description: string | null
          follower_count: number | null
          id: string | null
          name: string | null
          risk_level: string | null
          strategy_type: string | null
          subscription_fee_monthly: number | null
          total_return_percent: number | null
          total_trades: number | null
          win_rate: number | null
        }
        Relationships: []
      }
      session_health: {
        Row: {
          count: number | null
          newest_heartbeat: string | null
          oldest_heartbeat: string | null
          stalled: number | null
          status: Database["public"]["Enums"]["session_status"] | null
        }
        Relationships: []
      }
      session_position_flows: {
        Row: {
          bought_qty: number | null
          session_id: string | null
          sold_qty: number | null
          trading_pair: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "jokertrade_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "unified_trading_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_funnel_stats: {
        Row: {
          conversion_rate: number | null
          event_type: string | null
          step_number: number | null
          total_events: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      trading_levels: {
        Row: {
          color: string | null
          icon: string | null
          level_id: string | null
          name_en: string | null
          name_no: string | null
          sort_order: number | null
        }
        Relationships: []
      }
      unified_notifications_with_email: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel_v2"] | null
          created_at: string | null
          data: Json | null
          email: string | null
          id: string | null
          is_read: boolean | null
          is_sent: boolean | null
          sent_at: string | null
          title: string | null
          type: Database["public"]["Enums"]["notification_type_v2"] | null
          user_id: string | null
        }
        Relationships: []
      }
      unified_trading_sessions: {
        Row: {
          config: Json | null
          copy_of_session_id: string | null
          created_at: string | null
          currency: string | null
          current_capital: number | null
          current_capital_nok: number | null
          daily_loss_limit_pct: number | null
          followers_count: number | null
          id: string | null
          initial_capital: number | null
          is_public: boolean | null
          last_heartbeat: string | null
          last_trade_at: string | null
          losing_trades: number | null
          max_drawdown_pct: number | null
          max_position_pct: number | null
          mode: string | null
          open_position: Json | null
          started_at: string | null
          starting_capital_nok: number | null
          status: string | null
          stop_loss_pct: number | null
          stopped_at: string | null
          strategy: string | null
          symbol: string | null
          take_profit_pct: number | null
          total_pnl: number | null
          total_pnl_pct: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          config?: Json | null
          copy_of_session_id?: never
          created_at?: string | null
          currency?: never
          current_capital?: number | null
          current_capital_nok?: number | null
          daily_loss_limit_pct?: never
          followers_count?: never
          id?: string | null
          initial_capital?: number | null
          is_public?: never
          last_heartbeat?: string | null
          last_trade_at?: never
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          max_position_pct?: never
          mode?: never
          open_position?: Json | null
          started_at?: string | null
          starting_capital_nok?: number | null
          status?: never
          stop_loss_pct?: never
          stopped_at?: string | null
          strategy?: string | null
          symbol?: string | null
          take_profit_pct?: never
          total_pnl?: number | null
          total_pnl_pct?: never
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: never
          winning_trades?: number | null
        }
        Update: {
          config?: Json | null
          copy_of_session_id?: never
          created_at?: string | null
          currency?: never
          current_capital?: number | null
          current_capital_nok?: number | null
          daily_loss_limit_pct?: never
          followers_count?: never
          id?: string | null
          initial_capital?: number | null
          is_public?: never
          last_heartbeat?: string | null
          last_trade_at?: never
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          max_position_pct?: never
          mode?: never
          open_position?: Json | null
          started_at?: string | null
          starting_capital_nok?: number | null
          status?: never
          stop_loss_pct?: never
          stopped_at?: string | null
          strategy?: string | null
          symbol?: string | null
          take_profit_pct?: never
          total_pnl?: number | null
          total_pnl_pct?: never
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: never
          winning_trades?: number | null
        }
        Relationships: []
      }
      user_entitlements: {
        Row: {
          active_strategies: number | null
          can_access_futures: boolean | null
          can_access_spot: boolean | null
          can_create_strategies: boolean | null
          can_use_autotrade: boolean | null
          can_use_copy_trading: boolean | null
          can_use_limit_orders: boolean | null
          can_use_margin: boolean | null
          can_use_sms: boolean | null
          display_name: string | null
          futures_quiz_passed: boolean | null
          id: string | null
          is_trial_active: boolean | null
          is_trial_expired: boolean | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
        }
        Relationships: []
      }
      user_onboarding_status: {
        Row: {
          email: string | null
          id: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          preferred_trading_mode: string | null
          status: string | null
          trading_experience: string | null
        }
        Insert: {
          email?: string | null
          id?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          preferred_trading_mode?: string | null
          status?: never
          trading_experience?: string | null
        }
        Update: {
          email?: string | null
          id?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          preferred_trading_mode?: string | null
          status?: never
          trading_experience?: string | null
        }
        Relationships: []
      }
      user_performance: {
        Row: {
          approval_rate: number | null
          approved_count: number | null
          rejected_count: number | null
          role: string | null
          total_processed: number | null
          user_id: string | null
          username: string | null
        }
        Relationships: []
      }
      user_referrals_summary: {
        Row: {
          converted_count: number | null
          referrer_user_id: string | null
          signed_up_count: number | null
          total_free_months: number | null
          total_points_earned: number | null
          total_referrals: number | null
        }
        Relationships: []
      }
      user_stats_summary: {
        Row: {
          display_name: string | null
          futures_quiz_passed: boolean | null
          id: string | null
          monthly_points: number | null
          quizzes_passed: number | null
          subscription_status: string | null
          subscription_tier: string | null
          total_points: number | null
          trial_ends_at: string | null
        }
        Insert: {
          display_name?: string | null
          futures_quiz_passed?: never
          id?: string | null
          monthly_points?: never
          quizzes_passed?: never
          subscription_status?: string | null
          subscription_tier?: string | null
          total_points?: never
          trial_ends_at?: string | null
        }
        Update: {
          display_name?: string | null
          futures_quiz_passed?: never
          id?: string | null
          monthly_points?: never
          quizzes_passed?: never
          subscription_status?: string | null
          subscription_tier?: string | null
          total_points?: never
          trial_ends_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_change_role: {
        Args: { p_admin_id: string; p_new_role: string; p_user_id: string }
        Returns: Json
      }
      admin_recent_signups: {
        Args: { max_rows?: number }
        Returns: {
          created_at: string
          email: string
          id: string
        }[]
      }
      admin_upgrade_user: {
        Args: { p_admin_id: string; p_new_tier: string; p_user_id: string }
        Returns: Json
      }
      alert_stalled_sessions: { Args: never; Returns: number }
      allocate_founder_tokens: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          student_number: number
        }[]
      }
      apply_trading_level: {
        Args: { p_level: string; p_user_id: string }
        Returns: Json
      }
      archive_old_signals: {
        Args: { days_old?: number }
        Returns: {
          archived_count: number
        }[]
      }
      assign_user_role: {
        Args: { new_role: string; user_uuid: string }
        Returns: boolean
      }
      award_achievement: {
        Args: {
          p_achievement_id: string
          p_description: string
          p_icon?: string
          p_title: string
          p_user_id: string
        }
        Returns: Json
      }
      award_learning_points: {
        Args: {
          p_event_type: string
          p_metadata?: Json
          p_points?: number
          p_user_id: string
        }
        Returns: string
      }
      award_login_xp: {
        Args: { p_user_id: string }
        Returns: {
          already_claimed: boolean
          awarded_xp: number
          level_up: boolean
          new_level: number
          new_xp: number
          streak: number
          success: boolean
        }[]
      }
      award_xp: {
        Args: {
          p_action: string
          p_amount: number
          p_description?: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          level_up: boolean
          message: string
          new_level: number
          new_xp: number
          success: boolean
        }[]
      }
      calculate_course_progress: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: number
      }
      calculate_daily_loss: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: number
      }
      calculate_effective_pnl: {
        Args: { p_realized_pnl: number; p_side: string; p_total_value: number }
        Returns: number
      }
      calculate_level: { Args: { xp: number }; Returns: number }
      calculate_paper_slippage: {
        Args: {
          p_amount: number
          p_current_price: number
          p_order_type: string
          p_side: string
          p_symbol: string
        }
        Returns: {
          execution_price: number
          reason: string
          slippage_amount: number
          slippage_bps: number
        }[]
      }
      calculate_session_costs: {
        Args: { session_uuid: string }
        Returns: {
          cost_per_trade: number
          total_costs: number
          total_fees: number
          total_slippage: number
        }[]
      }
      can_create_strategy: {
        Args: { p_trading_mode: string; p_user_id: string }
        Returns: boolean
      }
      can_follow_leader: { Args: { p_user_id: string }; Returns: boolean }
      can_proceed_to_module: {
        Args: { p_module_id: number; p_user_id: string }
        Returns: boolean
      }
      check_daily_loss_limit: {
        Args: { p_user_id: string }
        Returns: {
          current_loss_percent: number
          should_stop: boolean
        }[]
      }
      claim_founder_tokens: {
        Args: { p_user_id: string }
        Returns: {
          claimed_amount: number
          student_num: number
        }[]
      }
      cleanup_old_audit_logs: { Args: never; Returns: undefined }
      close_paper_position: {
        Args: {
          close_reason: string
          closing_price: number
          position_id: string
        }
        Returns: Json
      }
      competition_participant_count: {
        Args: { p_competition_id: string }
        Returns: number
      }
      complete_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: boolean
      }
      compute_leaderboard_monthly: {
        Args: { p_month?: string }
        Returns: number
      }
      count_user_strategies: {
        Args: { p_mode?: string; p_user_id: string }
        Returns: number
      }
      create_index_if_table_exists: {
        Args: { p_columns: string; p_index_name: string; p_table_name: string }
        Returns: undefined
      }
      decrement_capital: {
        Args: { p_amount: number; p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      detect_crashed_sessions: { Args: never; Returns: undefined }
      diag_constraints:
        | { Args: never; Returns: Json }
        | { Args: { p?: Json }; Returns: Json }
      drop_policy_if_exists: {
        Args: {
          p_policy_name: string
          p_schema_name?: string
          p_table_name: string
        }
        Returns: undefined
      }
      ensure_active_sessions_for_all: { Args: never; Returns: number }
      ensure_auto_trading_configs_for_new_users: {
        Args: never
        Returns: number
      }
      exec_sql: { Args: { query: string }; Returns: Json }
      exec_sql_query: {
        Args: { query_text: string }
        Returns: {
          result: Json
        }[]
      }
      generate_trade_idempotency_key: {
        Args: {
          p_session_id: string
          p_side: Database["public"]["Enums"]["trade_side"]
          p_timestamp: string
        }
        Returns: string
      }
      get_avg_onboarding_time: { Args: never; Returns: string }
      get_balance_sync_audit: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          check_type: string
          created_at: string
          details: Json
          id: string
          resolved_at: string
          status: string
        }[]
      }
      get_cron_jobs_status: {
        Args: never
        Returns: {
          active: boolean
          jobname: string
          schedule: string
          siste_kjøring: string
          siste_status: string
        }[]
      }
      get_cta_click_aggregates: {
        Args: { p_days?: number }
        Returns: {
          experiment_key: string
          locale: string
          route: string
          total_clicks: number
          tracking_id: string
          unique_users: number
          variant_key: string
        }[]
      }
      get_cta_daily_trends: {
        Args: { p_days?: number; p_tracking_id: string }
        Returns: {
          clicks: number
          date: string
        }[]
      }
      get_dashboard_metrics:
        | { Args: { p_user_id: string }; Returns: Json }
        | {
            Args: { p_mode: string; p_statuses: string[]; p_user_id: string }
            Returns: {
              avg_session_pnl: number
              daily_pnl: number
              losing_trades: number
              session_count: number
              total_capital: number
              total_pnl: number
              total_trades: number
              total_volume: number
              win_rate: number
              winning_trades: number
            }[]
          }
      get_emergency_status: {
        Args: never
        Returns: {
          is_active: boolean
          reason: string
          triggered_at: string
          triggered_by: string
        }[]
      }
      get_error_stats: {
        Args: { p_hours?: number }
        Returns: {
          critical_errors: number
          errors_last_hour: number
          top_error_type: string
          top_page: string
          total_errors: number
          unresolved_errors: number
        }[]
      }
      get_funnel_dropoff: {
        Args: never
        Returns: {
          dropoff_rate: number
          dropped_off_count: number
          reached_count: number
          step_name: string
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number; p_timeframe?: string }
        Returns: {
          followers_count: number
          is_own_session: boolean
          profit_nok: number
          rank: number
          session_id: string
          strategy_name: string
          total_return_pct: number
          total_trades: number
          user_id: string
          username: string
          win_rate: number
        }[]
      }
      get_leaderboard_stats: {
        Args: never
        Returns: {
          avg_roi: number
          top_performer: string
          top_roi: number
          total_participants: number
        }[]
      }
      get_next_founder_number: { Args: never; Returns: number }
      get_or_create_email_preferences: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string | null
          digest_emails: string | null
          gamification_emails: boolean | null
          id: string
          marketing_emails: boolean | null
          trading_alerts: boolean | null
          transaction_emails: boolean | null
          updated_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "email_preferences"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_paper_account_stats: {
        Args: { account_id: string }
        Returns: {
          avg_profit_loss: number
          largest_loss: number
          largest_win: number
          losing_trades: number
          total_trades: number
          win_rate: number
          winning_trades: number
        }[]
      }
      get_paper_trading_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_hold_time_minutes: number
          max_drawdown_percentage: number
          profitability_percentage: number
          readiness_score: number
          trades_count: number
        }[]
      }
      get_portfolio_overview_v2: { Args: { p_user_id: string }; Returns: Json }
      get_quiz_with_questions: { Args: { p_quiz_slug: string }; Returns: Json }
      get_real_account_stats: {
        Args: { p_account_id: string }
        Returns: {
          avg_profit_loss: number
          largest_loss: number
          largest_win: number
          losing_trades: number
          total_fees: number
          total_trades: number
          win_rate: number
          winning_trades: number
        }[]
      }
      get_rls_status: {
        Args: never
        Returns: {
          enabled: number
          tables: Json
          total: number
        }[]
      }
      get_system_metrics: {
        Args: never
        Returns: {
          metric_name: string
          metric_unit: string
          metric_value: number
        }[]
      }
      get_top_tables_by_rows: {
        Args: { limit_count?: number }
        Returns: {
          rader: number
          tablename: string
        }[]
      }
      get_trades_paginated: {
        Args: {
          p_cursor: string
          p_from: string
          p_limit: number
          p_mode: string
          p_pair: string
          p_search: string
          p_session_statuses: string[]
          p_side: string
          p_to: string
          p_trade_statuses: string[]
          p_user_id: string
        }
        Returns: {
          created_at: string
          effective_pnl: number
          executed_at: string
          fee: number
          id: string
          next_cursor: string
          price: number
          quantity: number
          realized_pnl: number
          session_id: string
          side: string
          status: string
          total_value: number
          trading_pair: string
        }[]
      }
      get_trading_analytics: {
        Args: {
          p_from: string
          p_mode: string
          p_pair: string
          p_search: string
          p_session_statuses: string[]
          p_side: string
          p_to: string
          p_trade_statuses: string[]
          p_user_id: string
        }
        Returns: {
          best_pair: string
          best_pair_pnl: number
          best_session_id: string
          best_session_pnl: number
          losing_trades: number
          max_drawdown_pct: number
          profit_factor: number
          starting_capital: number
          total_fees: number
          total_pnl: number
          total_trades: number
          trades_by_day: Json
          trades_by_symbol: Json
          win_rate: number
          winning_trades: number
          worst_pair: string
          worst_pair_pnl: number
          worst_session_id: string
          worst_session_pnl: number
        }[]
      }
      get_trading_level_config: { Args: { p_level: string }; Returns: Json }
      get_user_course_progress: {
        Args: { p_user_id: string }
        Returns: {
          average_score: number
          completed_modules: number
          overall_progress: number
          total_modules: number
        }[]
      }
      get_user_entitlements: {
        Args: { p_user_id: string }
        Returns: {
          auto_trade_allow_live: boolean
          auto_trade_allow_paper: boolean
          can_access_futures: boolean
          can_access_spot: boolean
          can_use_autotrade: boolean
          can_use_copy_trading: boolean
          can_use_limit_orders: boolean
          can_use_margin: boolean
          can_use_sms: boolean
          futures_quiz_passed: boolean
          is_trial_active: boolean
          max_auto_trade_live_sessions: number
          max_auto_trade_paper_sessions: number
          status: string
          tier_slug: string
          trial_days_remaining: number
          trial_expired: boolean
        }[]
      }
      get_user_paper_trading_rank: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_role: { Args: { user_uuid: string }; Returns: string }
      get_user_signal_stats: {
        Args: { user_uuid: string }
        Returns: {
          approval_rate: number
          approved_signals: number
          pending_signals: number
          rejected_signals: number
          total_signals: number
        }[]
      }
      get_user_subscription_tier: {
        Args: { user_uuid: string }
        Returns: string
      }
      heal_stale_sessions: { Args: never; Returns: number }
      increment: { Args: { x: number }; Returns: number }
      increment_capital: {
        Args: { p_amount: number; p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      increment_followers: { Args: { session_id: string }; Returns: undefined }
      increment_paper_trades_count: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      initialize_user_manually: {
        Args: { user_uuid: string }
        Returns: undefined
      }
      is_admin:
        | { Args: never; Returns: boolean }
        | { Args: { user_uuid: string }; Returns: boolean }
      is_admin_for_profiles: { Args: never; Returns: boolean }
      is_bot_healthy: { Args: { p_bot_id: string }; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_trading_allowed: { Args: never; Returns: boolean }
      klarpakke_daily_integrity_check: { Args: never; Returns: undefined }
      klarpakke_hourly_autopilot_health: { Args: never; Returns: undefined }
      klarpakke_hourly_balance_sync: { Args: never; Returns: undefined }
      klarpakke_hourly_consistency_check: { Args: never; Returns: undefined }
      klarpakke_trigger_cron: { Args: { path: string }; Returns: undefined }
      latest_trader_verification: {
        Args: { p_trader_profile_id: string }
        Returns: {
          created_at: string
          id: string
          reason: string | null
          status: string
          trader_profile_id: string
          verified_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "trader_verifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_admin_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_target_id?: string
          p_target_type?: string
        }
        Returns: string
      }
      log_cron_health_failures: { Args: never; Returns: number }
      log_user_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_signal_id?: string
          p_user_id: string
        }
        Returns: string
      }
      persist_gap_metrics: {
        Args: {
          p_alert_details?: Json
          p_alert_triggered?: boolean
          p_gap_name: string
          p_metrics: Json
          p_period_from: string
          p_period_to: string
        }
        Returns: string
      }
      pilot_emergency_stop: { Args: { p_reason?: string }; Returns: Json }
      pilot_health_guard: { Args: never; Returns: Json }
      pilot_resume: { Args: { p_reason?: string }; Returns: Json }
      place_paper_trade_with_slippage: {
        Args: {
          p_amount: number
          p_order_type: string
          p_requested_price: number
          p_side: string
          p_symbol: string
          p_user_id: string
        }
        Returns: {
          execution_price: number
          slippage_amount: number
          slippage_bps: number
          trade_id: string
        }[]
      }
      process_conditional_orders: { Args: never; Returns: number }
      process_pending_notifications: {
        Args: { batch_size?: number }
        Returns: {
          failed: number
          processed: number
          skipped: number
        }[]
      }
      process_trade_outbox: { Args: never; Returns: undefined }
      reactivate_stale_sessions: { Args: never; Returns: number }
      record_app_event: {
        Args: {
          p_event_name: string
          p_page_path?: string
          p_props?: Json
          p_session_id?: string
          p_user_id: string
        }
        Returns: string
      }
      record_billing_event: {
        Args: {
          p_amount_nok?: number
          p_event_type: string
          p_from_tier?: string
          p_metadata?: Json
          p_to_tier?: string
          p_user_id: string
        }
        Returns: string
      }
      record_leaderboard_position: {
        Args: { p_new_rank: number; p_time_period: string; p_user_id: string }
        Returns: undefined
      }
      recover_crashed_paper_sessions: { Args: never; Returns: number }
      refresh_leaderboard: { Args: never; Returns: undefined }
      refresh_marketing_funnel_summary: { Args: never; Returns: undefined }
      refresh_paper_trading_leaderboard: { Args: never; Returns: undefined }
      run_migration: {
        Args: { migration_name: string; migration_sql: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      seed_signal_if_stale: {
        Args: { p_max_age_minutes?: number }
        Returns: number
      }
      send_push_to_user: {
        Args: {
          notification_body: string
          notification_data?: Json
          notification_title: string
          user_uuid: string
        }
        Returns: number
      }
      session_maintenance: { Args: never; Returns: Json }
      set_subscription_tier: {
        Args: { p_status?: string; p_tier: string; p_user_id: string }
        Returns: boolean
      }
      set_trading_mode: {
        Args: { new_mode: string; user_uuid: string }
        Returns: boolean
      }
      should_send_notification: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      should_send_push: {
        Args: { p_notification_type: string; p_user_id: string }
        Returns: boolean
      }
      snapshot_leaderboard: { Args: { p_period?: string }; Returns: number }
      store_exchange_connection: {
        Args: {
          p_api_key: string
          p_api_secret_ciphertext: string
          p_api_secret_nonce: string
          p_exchange: string
          p_is_testnet?: boolean
          p_permissions?: Json
          p_user_id: string
        }
        Returns: string
      }
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_quiz_slug: string; p_user_id: string }
        Returns: Json
      }
      track_referral_click: {
        Args: {
          p_ip_address?: unknown
          p_landing_page?: string
          p_referral_code: string
          p_source?: string
          p_user_agent?: string
        }
        Returns: string
      }
      trading_session_status_counts: {
        Args: { p_mode: string; p_user_id: string }
        Returns: {
          count: number
          status: string
        }[]
      }
      update_session_heartbeat: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      update_transition_readiness_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      user_has_permission: {
        Args: { required_roles: string[]; user_uuid: string }
        Returns: boolean
      }
      validate_signal_for_processing: {
        Args: { signal_uuid: string }
        Returns: {
          error_message: string
          is_valid: boolean
        }[]
      }
      xp_for_level: { Args: { level: number }; Returns: number }
    }
    Enums: {
      notification_channel_v2: "push" | "email" | "sms" | "in_app"
      notification_type:
        | "signal_new"
        | "signal_executed"
        | "price_alert"
        | "subscription_expiring"
        | "subscription_expired"
        | "achievement_unlocked"
        | "leaderboard_update"
        | "system"
        | "level_up"
        | "leaderboard_climb"
      notification_type_v2:
        | "trade_opened"
        | "trade_closed"
        | "stop_loss_hit"
        | "take_profit_hit"
        | "session_started"
        | "session_stopped"
        | "circuit_breaker"
        | "daily_summary"
        | "weekly_report"
        | "copy_trade"
        | "system"
      order_type: "market" | "limit" | "stop_loss" | "take_profit"
      risk_level: "conservative" | "balanced" | "aggressive"
      session_status: "active" | "paused" | "crashed" | "stopped"
      subscription_tier:
        | "free"
        | "bachelor"
        | "master"
        | "phd"
        | "professor"
        | "student"
      trade_side: "buy" | "sell"
      trade_status:
        | "pending"
        | "filled"
        | "partially_filled"
        | "cancelled"
        | "failed"
      trading_mode: "paper" | "live"
      trading_phase: "paper" | "micro" | "small" | "full"
      user_role: "user" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      notification_channel_v2: ["push", "email", "sms", "in_app"],
      notification_type: [
        "signal_new",
        "signal_executed",
        "price_alert",
        "subscription_expiring",
        "subscription_expired",
        "achievement_unlocked",
        "leaderboard_update",
        "system",
        "level_up",
        "leaderboard_climb",
      ],
      notification_type_v2: [
        "trade_opened",
        "trade_closed",
        "stop_loss_hit",
        "take_profit_hit",
        "session_started",
        "session_stopped",
        "circuit_breaker",
        "daily_summary",
        "weekly_report",
        "copy_trade",
        "system",
      ],
      order_type: ["market", "limit", "stop_loss", "take_profit"],
      risk_level: ["conservative", "balanced", "aggressive"],
      session_status: ["active", "paused", "crashed", "stopped"],
      subscription_tier: [
        "free",
        "bachelor",
        "master",
        "phd",
        "professor",
        "student",
      ],
      trade_side: ["buy", "sell"],
      trade_status: [
        "pending",
        "filled",
        "partially_filled",
        "cancelled",
        "failed",
      ],
      trading_mode: ["paper", "live"],
      trading_phase: ["paper", "micro", "small", "full"],
      user_role: ["user", "admin"],
    },
  },
} as const
