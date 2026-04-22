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
    PostgrestVersion: "14.1"
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
      _trigger_debug: {
        Row: {
          created_at: string | null
          event: string | null
          id: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event?: string | null
          id?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string | null
          id?: number
          user_id?: string | null
        }
        Relationships: []
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
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
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
          analysis_data: Json | null
          block_layer: string | null
          created_at: string | null
          decision_reason: string | null
          decision_type: string
          executed_at: string | null
          id: string
          opik_trace_id: string | null
          position_size_mul: number | null
          regime_confidence: string | null
          regime_context: string | null
          regime_reasoning: string | null
          sentiment_score: number | null
          sonar_confidence: number | null
          sonar_recommendation: string | null
          sonar_sentiment: string | null
          symbol: string
          user_id: string
        }
        Insert: {
          analysis_data?: Json | null
          block_layer?: string | null
          created_at?: string | null
          decision_reason?: string | null
          decision_type: string
          executed_at?: string | null
          id?: string
          opik_trace_id?: string | null
          position_size_mul?: number | null
          regime_confidence?: string | null
          regime_context?: string | null
          regime_reasoning?: string | null
          sentiment_score?: number | null
          sonar_confidence?: number | null
          sonar_recommendation?: string | null
          sonar_sentiment?: string | null
          symbol?: string
          user_id: string
        }
        Update: {
          analysis_data?: Json | null
          block_layer?: string | null
          created_at?: string | null
          decision_reason?: string | null
          decision_type?: string
          executed_at?: string | null
          id?: string
          opik_trace_id?: string | null
          position_size_mul?: number | null
          regime_confidence?: string | null
          regime_context?: string | null
          regime_reasoning?: string | null
          sentiment_score?: number | null
          sonar_confidence?: number | null
          sonar_recommendation?: string | null
          sonar_sentiment?: string | null
          symbol?: string
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
          created_at: string | null
          event_name: string
          event_type: string
          id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          event_type: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          event_type?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string
          exchange: string
          id: string
          is_active: boolean | null
          label: string | null
          last_tested_at: string | null
          permissions: Json | null
          test_error: string | null
          test_status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_tested_at?: string | null
          permissions?: Json | null
          test_error?: string | null
          test_status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean | null
          label?: string | null
          last_tested_at?: string | null
          permissions?: Json | null
          test_error?: string | null
          test_status?: string | null
          updated_at?: string
          user_id?: string
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
        Relationships: []
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
          fees_paid: number | null
          gross_pnl: number | null
          id: string
          losing_trades: number | null
          month: string
          net_pnl: number | null
          total_trades: number | null
          trading_pair: string
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          fees_paid?: number | null
          gross_pnl?: number | null
          id?: string
          losing_trades?: number | null
          month: string
          net_pnl?: number | null
          total_trades?: number | null
          trading_pair: string
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          fees_paid?: number | null
          gross_pnl?: number | null
          id?: string
          losing_trades?: number | null
          month?: string
          net_pnl?: number | null
          total_trades?: number | null
          trading_pair?: string
          user_id?: string
          winning_trades?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "archived_trade_summaries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      atr_cache: {
        Row: {
          atr_14: number | null
          atr_28: number | null
          symbol: string
          updated_at: string | null
        }
        Insert: {
          atr_14?: number | null
          atr_28?: number | null
          symbol: string
          updated_at?: string | null
        }
        Update: {
          atr_14?: number | null
          atr_28?: number | null
          symbol?: string
          updated_at?: string | null
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
          daily_loss_limit_reached: boolean | null
          daily_trade_limit_reached: boolean | null
          date: string
          id: string
          limit_reached_at: string | null
          losing_trades: number | null
          total_pnl: number | null
          total_realized_loss: number | null
          total_realized_profit: number | null
          total_trades: number | null
          updated_at: string | null
          user_id: string
          winning_trades: number | null
        }
        Insert: {
          created_at?: string | null
          daily_loss_limit_reached?: boolean | null
          daily_trade_limit_reached?: boolean | null
          date: string
          id?: string
          limit_reached_at?: string | null
          losing_trades?: number | null
          total_pnl?: number | null
          total_realized_loss?: number | null
          total_realized_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id: string
          winning_trades?: number | null
        }
        Update: {
          created_at?: string | null
          daily_loss_limit_reached?: boolean | null
          daily_trade_limit_reached?: boolean | null
          date?: string
          id?: string
          limit_reached_at?: string | null
          losing_trades?: number | null
          total_pnl?: number | null
          total_realized_loss?: number | null
          total_realized_profit?: number | null
          total_trades?: number | null
          updated_at?: string | null
          user_id?: string
          winning_trades?: number | null
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
          daily_loss_limit_percent: number
          daily_trade_limit: number
          id: string
          max_concurrent_positions: number | null
          max_position_percent: number
          min_confidence: number | null
          min_order_size_usdt: number | null
          notify_on_daily_limit: boolean | null
          notify_on_sl_tp: boolean | null
          notify_on_trade: boolean | null
          risk_profile: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          allowed_symbols?: string[] | null
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          daily_loss_limit_percent?: number
          daily_trade_limit?: number
          id?: string
          max_concurrent_positions?: number | null
          max_position_percent?: number
          min_confidence?: number | null
          min_order_size_usdt?: number | null
          notify_on_daily_limit?: boolean | null
          notify_on_sl_tp?: boolean | null
          notify_on_trade?: boolean | null
          risk_profile?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          allowed_symbols?: string[] | null
          auto_trading_enabled?: boolean | null
          created_at?: string | null
          daily_loss_limit_percent?: number
          daily_trade_limit?: number
          id?: string
          max_concurrent_positions?: number | null
          max_position_percent?: number
          min_confidence?: number | null
          min_order_size_usdt?: number | null
          notify_on_daily_limit?: boolean | null
          notify_on_sl_tp?: boolean | null
          notify_on_trade?: boolean | null
          risk_profile?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auto_trading_backtests: {
        Row: {
          created_at: string | null
          end_date: string | null
          final_capital: number | null
          id: string
          initial_capital: number | null
          profitable_trades: number | null
          result: Json | null
          start_date: string | null
          strategy_id: string | null
          symbol: string | null
          total_trades: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          final_capital?: number | null
          id?: string
          initial_capital?: number | null
          profitable_trades?: number | null
          result?: Json | null
          start_date?: string | null
          strategy_id?: string | null
          symbol?: string | null
          total_trades?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          final_capital?: number | null
          id?: string
          initial_capital?: number | null
          profitable_trades?: number | null
          result?: Json | null
          start_date?: string | null
          strategy_id?: string | null
          symbol?: string | null
          total_trades?: number | null
          user_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      auto_trading_followers: {
        Row: {
          created_at: string
          followed_session_id: string
          follower_session_id: string
          follower_user_id: string
          id: string
          is_active: boolean
          started_at: string
          stopped_at: string | null
          total_copied_trades: number
          total_pnl_nok: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          followed_session_id: string
          follower_session_id: string
          follower_user_id: string
          id?: string
          is_active?: boolean
          started_at?: string
          stopped_at?: string | null
          total_copied_trades?: number
          total_pnl_nok?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          followed_session_id?: string
          follower_session_id?: string
          follower_user_id?: string
          id?: string
          is_active?: boolean
          started_at?: string
          stopped_at?: string | null
          total_copied_trades?: number
          total_pnl_nok?: number
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      auto_trading_runs: {
        Row: {
          allocated_in_open_trades_nok: number | null
          available_auto_budget_nok: number | null
          binance_balance_nok: number | null
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
          binance_balance_nok?: number | null
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
          binance_balance_nok?: number | null
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
        Relationships: []
      }
      auto_trading_sessions: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string | null
          strategy_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
          strategy_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
          strategy_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auto_trading_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_trading_strategies: {
        Row: {
          allow_long: boolean | null
          allow_short: boolean | null
          allowed_symbols: string[] | null
          created_at: string | null
          daily_loss_limit_pct: number
          description: string
          expected_annual_return_pct: number | null
          id: string
          is_active: boolean | null
          max_leverage: number | null
          max_position_size_pct: number
          max_trades_per_day: number
          name: string
          risk_level: string
          stop_loss_pct: number
          take_profit_pct: number | null
          timeframe: string | null
          updated_at: string | null
        }
        Insert: {
          allow_long?: boolean | null
          allow_short?: boolean | null
          allowed_symbols?: string[] | null
          created_at?: string | null
          daily_loss_limit_pct: number
          description: string
          expected_annual_return_pct?: number | null
          id: string
          is_active?: boolean | null
          max_leverage?: number | null
          max_position_size_pct: number
          max_trades_per_day: number
          name: string
          risk_level: string
          stop_loss_pct: number
          take_profit_pct?: number | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_long?: boolean | null
          allow_short?: boolean | null
          allowed_symbols?: string[] | null
          created_at?: string | null
          daily_loss_limit_pct?: number
          description?: string
          expected_annual_return_pct?: number | null
          id?: string
          is_active?: boolean | null
          max_leverage?: number | null
          max_position_size_pct?: number
          max_trades_per_day?: number
          name?: string
          risk_level?: string
          stop_loss_pct?: number
          take_profit_pct?: number | null
          timeframe?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      backtest_cache: {
        Row: {
          cache_version: number
          created_at: string
          expires_at: string
          id: string
          metrics_summary: Json
          period_months: number
          result_data: Json
          result_hash: string
          strategy_id: string
          symbol: string
          usd_nok_rate: number
        }
        Insert: {
          cache_version?: number
          created_at?: string
          expires_at?: string
          id?: string
          metrics_summary: Json
          period_months: number
          result_data: Json
          result_hash: string
          strategy_id: string
          symbol: string
          usd_nok_rate?: number
        }
        Update: {
          cache_version?: number
          created_at?: string
          expires_at?: string
          id?: string
          metrics_summary?: Json
          period_months?: number
          result_data?: Json
          result_hash?: string
          strategy_id?: string
          symbol?: string
          usd_nok_rate?: number
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
          symbol?: string
          total_return_pct?: number
          total_trades?: number
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
        }
        Relationships: []
      }
      backtest_telemetry: {
        Row: {
          anonymous_id: string | null
          cache_age_ms: number | null
          cache_hit: boolean
          cagr: number | null
          converted_at: string | null
          converted_to_paper: boolean
          created_at: string
          id: string
          initial_capital_nok: number
          max_drawdown: number | null
          period_months: number
          referrer: string | null
          session_id: string
          strategy_id: string
          total_trades: number | null
          user_agent: string | null
          volatility: number | null
          win_rate: number | null
        }
        Insert: {
          anonymous_id?: string | null
          cache_age_ms?: number | null
          cache_hit?: boolean
          cagr?: number | null
          converted_at?: string | null
          converted_to_paper?: boolean
          created_at?: string
          id?: string
          initial_capital_nok: number
          max_drawdown?: number | null
          period_months: number
          referrer?: string | null
          session_id: string
          strategy_id: string
          total_trades?: number | null
          user_agent?: string | null
          volatility?: number | null
          win_rate?: number | null
        }
        Update: {
          anonymous_id?: string | null
          cache_age_ms?: number | null
          cache_hit?: boolean
          cagr?: number | null
          converted_at?: string | null
          converted_to_paper?: boolean
          created_at?: string
          id?: string
          initial_capital_nok?: number
          max_drawdown?: number | null
          period_months?: number
          referrer?: string | null
          session_id?: string
          strategy_id?: string
          total_trades?: number | null
          user_agent?: string | null
          volatility?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      backup_policies_20260224: {
        Row: {
          backed_up_at: string | null
          cmd: string | null
          permissive: string | null
          policyname: unknown
          qual: string | null
          roles: unknown[] | null
          schemaname: unknown
          tablename: unknown
          with_check: string | null
        }
        Insert: {
          backed_up_at?: string | null
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown
          tablename?: unknown
          with_check?: string | null
        }
        Update: {
          backed_up_at?: string | null
          cmd?: string | null
          permissive?: string | null
          policyname?: unknown
          qual?: string | null
          roles?: unknown[] | null
          schemaname?: unknown
          tablename?: unknown
          with_check?: string | null
        }
        Relationships: []
      }
      beta_applications: {
        Row: {
          application_status: string | null
          created_at: string | null
          id: string
          motivation: string | null
          risk_tolerance: string | null
          trading_experience: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          application_status?: string | null
          created_at?: string | null
          id?: string
          motivation?: string | null
          risk_tolerance?: string | null
          trading_experience: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          application_status?: string | null
          created_at?: string | null
          id?: string
          motivation?: string | null
          risk_tolerance?: string | null
          trading_experience?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_feedback: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          message: string | null
          rating: number | null
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          rating?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      beta_signups: {
        Row: {
          created_at: string | null
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          source?: string | null
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
      beta_users: {
        Row: {
          cohort: string
          created_at: string | null
          daily_max_gain: number | null
          daily_pnl_cap: number | null
          ending_balance: number | null
          enrolled_at: string | null
          id: string
          initial_capital: number | null
          max_consecutive_losses: number | null
          max_drawdown_pct: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cohort: string
          created_at?: string | null
          daily_max_gain?: number | null
          daily_pnl_cap?: number | null
          ending_balance?: number | null
          enrolled_at?: string | null
          id?: string
          initial_capital?: number | null
          max_consecutive_losses?: number | null
          max_drawdown_pct?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cohort?: string
          created_at?: string | null
          daily_max_gain?: number | null
          daily_pnl_cap?: number | null
          ending_balance?: number | null
          enrolled_at?: string | null
          id?: string
          initial_capital?: number | null
          max_consecutive_losses?: number | null
          max_drawdown_pct?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
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
      binance_balances: {
        Row: {
          asset: string
          connection_id: string | null
          free: number | null
          id: string
          locked: number | null
          nok_value: number | null
          total: number | null
          updated_at: string | null
          usd_value: number | null
          user_id: string | null
        }
        Insert: {
          asset: string
          connection_id?: string | null
          free?: number | null
          id?: string
          locked?: number | null
          nok_value?: number | null
          total?: number | null
          updated_at?: string | null
          usd_value?: number | null
          user_id?: string | null
        }
        Update: {
          asset?: string
          connection_id?: string | null
          free?: number | null
          id?: string
          locked?: number | null
          nok_value?: number | null
          total?: number | null
          updated_at?: string | null
          usd_value?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "binance_balances_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "binance_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      binance_connections: {
        Row: {
          account_type: string | null
          api_key: string
          api_secret: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          account_type?: string | null
          api_key: string
          api_secret: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          account_type?: string | null
          api_key?: string
          api_secret?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      binance_key_access_log: {
        Row: {
          action: string
          created_at: string
          error_message: string | null
          id: string
          ip_address: string | null
          success: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          error_message?: string | null
          id?: string
          ip_address?: string | null
          success?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      binance_sync_log: {
        Row: {
          balances_synced: number | null
          completed_at: string | null
          created_at: string | null
          error_details: string | null
          id: string
          message: string | null
          positions_synced: number | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          balances_synced?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: string | null
          id?: string
          message?: string | null
          positions_synced?: number | null
          started_at?: string | null
          status: string
          user_id: string
        }
        Update: {
          balances_synced?: number | null
          completed_at?: string | null
          created_at?: string | null
          error_details?: string | null
          id?: string
          message?: string | null
          positions_synced?: number | null
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_alert_configs: {
        Row: {
          created_at: string | null
          daily_loss_limit_nok: number | null
          drawdown_threshold_pct: number | null
          id: string
          notification_channels: string[] | null
          notify_on_error: boolean | null
          notify_on_trade: boolean | null
          strategy_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_loss_limit_nok?: number | null
          drawdown_threshold_pct?: number | null
          id?: string
          notification_channels?: string[] | null
          notify_on_error?: boolean | null
          notify_on_trade?: boolean | null
          strategy_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_loss_limit_nok?: number | null
          drawdown_threshold_pct?: number | null
          id?: string
          notification_channels?: string[] | null
          notify_on_error?: boolean | null
          notify_on_trade?: boolean | null
          strategy_id?: string
          updated_at?: string | null
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
          bot_name: string
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
          bot_name: string
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
          bot_name?: string
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
      build_status: {
        Row: {
          error_count: number
          files_affected: number
          id: number
          ignore_build_errors: boolean
          updated_at: string
        }
        Insert: {
          error_count?: number
          files_affected?: number
          id?: number
          ignore_build_errors?: boolean
          updated_at?: string
        }
        Update: {
          error_count?: number
          files_affected?: number
          id?: number
          ignore_build_errors?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      campaign_contacts: {
        Row: {
          clicked_at: string | null
          company: string | null
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          opened_at: string | null
          position: string | null
          registered_at: string | null
          sent_at: string | null
          sequence: number | null
          source: string | null
          status: string | null
          tags: string[] | null
          unsubscribed_at: string | null
          updated_at: string | null
        }
        Insert: {
          clicked_at?: string | null
          company?: string | null
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          opened_at?: string | null
          position?: string | null
          registered_at?: string | null
          sent_at?: string | null
          sequence?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Update: {
          clicked_at?: string | null
          company?: string | null
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          opened_at?: string | null
          position?: string | null
          registered_at?: string | null
          sent_at?: string | null
          sequence?: number | null
          source?: string | null
          status?: string | null
          tags?: string[] | null
          unsubscribed_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      chart_signals: {
        Row: {
          confidence: number | null
          created_at: string | null
          id: string
          price: number | null
          signal_type: string
          symbol: string
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          price?: number | null
          signal_type: string
          symbol: string
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          id?: string
          price?: number | null
          signal_type?: string
          symbol?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_errors: {
        Row: {
          created_at: string | null
          error_message: string
          id: string
          is_resolved: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message: string
          id?: string
          is_resolved?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string
          id?: string
          is_resolved?: boolean | null
          user_id?: string | null
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
      conditional_orders: {
        Row: {
          binance_oco_id: string | null
          binance_order_list_id: number | null
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
          binance_oco_id?: string | null
          binance_order_list_id?: number | null
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
          binance_oco_id?: string | null
          binance_order_list_id?: number | null
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
          allocation_percent: number
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
            foreignKeyName: "copy_trade_queue_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_trade_queue_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      copy_trading_follows: {
        Row: {
          allocation_percent: number
          created_at: string
          follower_id: string
          id: string
          is_active: boolean | null
          leader_id: string
          max_trade_amount: number | null
          scale_factor: number | null
        }
        Insert: {
          allocation_percent: number
          created_at?: string
          follower_id: string
          id?: string
          is_active?: boolean | null
          leader_id: string
          max_trade_amount?: number | null
          scale_factor?: number | null
        }
        Update: {
          allocation_percent?: number
          created_at?: string
          follower_id?: string
          id?: string
          is_active?: boolean | null
          leader_id?: string
          max_trade_amount?: number | null
          scale_factor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "copy_trading_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "copy_trading_follows_leader_id_fkey"
            columns: ["leader_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
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
      course_progress: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          progress_percentage: number | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          progress_percentage?: number | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          progress_percentage?: number | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          duration_hours: number | null
          duration_minutes: number | null
          har_auto_trade: boolean | null
          id: string
          image_url: string | null
          instructor_id: string | null
          is_free: boolean | null
          is_published: boolean | null
          lekepenger_belop: number | null
          level: string | null
          order_index: number | null
          price_nok: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          sort_order: number | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          har_auto_trade?: boolean | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          lekepenger_belop?: number | null
          level?: string | null
          order_index?: number | null
          price_nok?: number | null
          published_at?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          duration_hours?: number | null
          duration_minutes?: number | null
          har_auto_trade?: boolean | null
          id?: string
          image_url?: string | null
          instructor_id?: string | null
          is_free?: boolean | null
          is_published?: boolean | null
          lekepenger_belop?: number | null
          level?: string | null
          order_index?: number | null
          price_nok?: number | null
          published_at?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
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
      email_log: {
        Row: {
          created_at: string | null
          delivered_at: string | null
          email_type: string
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          sent_at: string | null
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          delivered_at?: string | null
          email_type: string
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string | null
          status: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          delivered_at?: string | null
          email_type?: string
          error_message?: string | null
          id?: string
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
      email_tracking: {
        Row: {
          contact_id: string | null
          created_at: string | null
          email: string | null
          event: string
          id: string
          ip: string | null
          sequence: number | null
          url: string | null
          user_agent: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          email?: string | null
          event: string
          id?: string
          ip?: string | null
          sequence?: number | null
          url?: string | null
          user_agent?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          email?: string | null
          event?: string
          id?: string
          ip?: string | null
          sequence?: number | null
          url?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_tracking_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "campaign_contacts"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      exchange_api_keys: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          last_validated_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          exchange: string
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_validated_at?: string | null
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
          last_validated_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          binance_price: number
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
          binance_price: number
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
          binance_price?: number
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
      kelly_stats: {
        Row: {
          avg_loss_pct: number | null
          avg_win_pct: number | null
          id: string
          kelly_fraction: number | null
          strategy: string
          updated_at: string | null
          user_id: string | null
          winrate: number | null
        }
        Insert: {
          avg_loss_pct?: number | null
          avg_win_pct?: number | null
          id?: string
          kelly_fraction?: number | null
          strategy: string
          updated_at?: string | null
          user_id?: string | null
          winrate?: number | null
        }
        Update: {
          avg_loss_pct?: number | null
          avg_win_pct?: number | null
          id?: string
          kelly_fraction?: number | null
          strategy?: string
          updated_at?: string | null
          user_id?: string | null
          winrate?: number | null
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
      kltbalances: {
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
      lesson_quiz_attempts: {
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
            foreignKeyName: "lesson_quiz_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "lesson_quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_quiz_questions: {
        Row: {
          correct_option_id: string
          created_at: string | null
          explanation_en: string | null
          explanation_no: string | null
          id: string
          lesson_id: string
          options: Json
          question_en: string
          question_no: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          correct_option_id: string
          created_at?: string | null
          explanation_en?: string | null
          explanation_no?: string | null
          id?: string
          lesson_id: string
          options?: Json
          question_en: string
          question_no: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          correct_option_id?: string
          created_at?: string | null
          explanation_en?: string | null
          explanation_no?: string | null
          id?: string
          lesson_id?: string
          options?: Json
          question_en?: string
          question_no?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_quiz_questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
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
      market_sentiment: {
        Row: {
          created_at: string | null
          id: string
          source: string
          symbol: string
          timestamp: string | null
          trend: string | null
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          source?: string
          symbol: string
          timestamp?: string | null
          trend?: string | null
          value: number
        }
        Update: {
          created_at?: string | null
          id?: string
          source?: string
          symbol?: string
          timestamp?: string | null
          trend?: string | null
          value?: number
        }
        Relationships: []
      }
      market_volatility: {
        Row: {
          last_updated: string | null
          symbol: string
          volatility_24h: number | null
        }
        Insert: {
          last_updated?: string | null
          symbol: string
          volatility_24h?: number | null
        }
        Update: {
          last_updated?: string | null
          symbol?: string
          volatility_24h?: number | null
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
      mcp_audit_logs: {
        Row: {
          duration_ms: number | null
          error: string | null
          id: string
          input: Json | null
          output: Json | null
          success: boolean | null
          timestamp: string | null
          tool_name: string
        }
        Insert: {
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          success?: boolean | null
          timestamp?: string | null
          tool_name: string
        }
        Update: {
          duration_ms?: number | null
          error?: string | null
          id?: string
          input?: Json | null
          output?: Json | null
          success?: boolean | null
          timestamp?: string | null
          tool_name?: string
        }
        Relationships: []
      }
      mcp_terminal_logs: {
        Row: {
          blocked_reason: string | null
          cmd: string
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          exit_code: number | null
          id: string
          pid: number | null
          session_id: string
          stderr: string | null
          stdout: string | null
        }
        Insert: {
          blocked_reason?: string | null
          cmd: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          pid?: number | null
          session_id: string
          stderr?: string | null
          stdout?: string | null
        }
        Update: {
          blocked_reason?: string | null
          cmd?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          pid?: number | null
          session_id?: string
          stderr?: string | null
          stdout?: string | null
        }
        Relationships: []
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
      notification_preferences: {
        Row: {
          created_at: string | null
          email_news: boolean | null
          email_trades: boolean | null
          id: string
          push_trades: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_news?: boolean | null
          email_trades?: boolean | null
          id?: string
          push_trades?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_news?: boolean | null
          email_trades?: boolean | null
          id?: string
          push_trades?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          is_read: boolean
          payload: Json
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
          is_read?: boolean
          payload: Json
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
          is_read?: boolean
          payload?: Json
          sent_at?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
          completed_lessons: number | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          step1_completed: boolean | null
          step2_completed: boolean | null
          step2_started_at: string | null
          step3_completed: boolean | null
          step4_completed: boolean | null
          step5_completed: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_lessons?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          step1_completed?: boolean | null
          step2_completed?: boolean | null
          step2_started_at?: string | null
          step3_completed?: boolean | null
          step4_completed?: boolean | null
          step5_completed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_lessons?: number | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          step1_completed?: boolean | null
          step2_completed?: boolean | null
          step2_started_at?: string | null
          step3_completed?: boolean | null
          step4_completed?: boolean | null
          step5_completed?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      optimal_trades: {
        Row: {
          atr_multiplier: number | null
          created_at: string | null
          entry_price: number | null
          id: string
          kelly_size: number | null
          pyramid_level: number | null
          rr_ratio: number | null
          session_id: string | null
          stop_price: number | null
          symbol: string | null
          target_price: number | null
          user_id: string | null
        }
        Insert: {
          atr_multiplier?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          kelly_size?: number | null
          pyramid_level?: number | null
          rr_ratio?: number | null
          session_id?: string | null
          stop_price?: number | null
          symbol?: string | null
          target_price?: number | null
          user_id?: string | null
        }
        Update: {
          atr_multiplier?: number | null
          created_at?: string | null
          entry_price?: number | null
          id?: string
          kelly_size?: number | null
          pyramid_level?: number | null
          rr_ratio?: number | null
          session_id?: string | null
          stop_price?: number | null
          symbol?: string | null
          target_price?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number | null
          completed_at: string | null
          created_at: string | null
          currency: string | null
          id: string
          plan_type: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_type?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          plan_type?: string | null
          status?: string | null
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
      page_visits: {
        Row: {
          created_at: string | null
          id: string
          ip_hash: string | null
          path: string
          referrer: string | null
          session_id: string | null
          time_spent_seconds: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          path: string
          referrer?: string | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          path?: string
          referrer?: string | null
          session_id?: string | null
          time_spent_seconds?: number | null
          user_agent?: string | null
          user_id?: string | null
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
      payment_history: {
        Row: {
          amount_ore: number
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          provider: string
          provider_payment_id: string | null
          status: string
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_ore: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          provider: string
          provider_payment_id?: string | null
          status: string
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_ore?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          provider?: string
          provider_payment_id?: string | null
          status?: string
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
      portfolios: {
        Row: {
          created_at: string | null
          currency: string | null
          current_balance: number | null
          description: string | null
          id: string
          initial_balance: number | null
          name: string | null
          total_invested: number | null
          total_profit: number | null
          total_profit_percent: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string
          initial_balance?: number | null
          name?: string | null
          total_invested?: number | null
          total_profit?: number | null
          total_profit_percent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          description?: string | null
          id?: string
          initial_balance?: number | null
          name?: string | null
          total_invested?: number | null
          total_profit?: number | null
          total_profit_percent?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      positions: {
        Row: {
          avg_price: number
          created_at: string | null
          current_price: number | null
          id: string
          portfolio_id: string
          profit_loss: number | null
          profit_loss_percent: number | null
          quantity: number
          symbol: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_price: number
          created_at?: string | null
          current_price?: number | null
          id?: string
          portfolio_id: string
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity: number
          symbol: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_price?: number
          created_at?: string | null
          current_price?: number | null
          id?: string
          portfolio_id?: string
          profit_loss?: number | null
          profit_loss_percent?: number | null
          quantity?: number
          symbol?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
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
      real_positions: {
        Row: {
          account_id: string
          close_reason: string | null
          closed_at: string | null
          closing_price: number | null
          entry_price: number
          exchange_order_id: string | null
          exchange_position_id: string | null
          filled_at: string | null
          filled_quantity: number | null
          id: string
          limit_price: number | null
          metadata: Json | null
          notes: string | null
          opened_at: string | null
          order_type: string | null
          position_type: string
          profit_loss_percent: number | null
          profit_loss_usd: number | null
          quantity: number
          status: string | null
          stop_loss: number | null
          stop_price: number | null
          symbol: string
          take_profit: number | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          close_reason?: string | null
          closed_at?: string | null
          closing_price?: number | null
          entry_price: number
          exchange_order_id?: string | null
          exchange_position_id?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          id?: string
          limit_price?: number | null
          metadata?: Json | null
          notes?: string | null
          opened_at?: string | null
          order_type?: string | null
          position_type: string
          profit_loss_percent?: number | null
          profit_loss_usd?: number | null
          quantity: number
          status?: string | null
          stop_loss?: number | null
          stop_price?: number | null
          symbol: string
          take_profit?: number | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          close_reason?: string | null
          closed_at?: string | null
          closing_price?: number | null
          entry_price?: number
          exchange_order_id?: string | null
          exchange_position_id?: string | null
          filled_at?: string | null
          filled_quantity?: number | null
          id?: string
          limit_price?: number | null
          metadata?: Json | null
          notes?: string | null
          opened_at?: string | null
          order_type?: string | null
          position_type?: string
          profit_loss_percent?: number | null
          profit_loss_usd?: number | null
          quantity?: number
          status?: string | null
          stop_loss?: number | null
          stop_price?: number | null
          symbol?: string
          take_profit?: number | null
          updated_at?: string | null
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
          created_at: string
          regime_data: Json
          symbol: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          regime_data: Json
          symbol: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          regime_data?: Json
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      risk_presets: {
        Row: {
          atr_mult: number
          color: string
          created_at: string | null
          description: string
          icon: string
          id: string
          leverage_max: number
          max_drawdown_pct: number
          max_positions: number
          name: string
          name_en: string
          position_pct: number
          rebalance_freq: string | null
          stop_loss_pct: number
          take_profit_pct: number
          trailing_stop: boolean | null
          volatility_scale: number
        }
        Insert: {
          atr_mult: number
          color: string
          created_at?: string | null
          description: string
          icon: string
          id: string
          leverage_max?: number
          max_drawdown_pct: number
          max_positions?: number
          name: string
          name_en: string
          position_pct: number
          rebalance_freq?: string | null
          stop_loss_pct?: number
          take_profit_pct?: number
          trailing_stop?: boolean | null
          volatility_scale: number
        }
        Update: {
          atr_mult?: number
          color?: string
          created_at?: string | null
          description?: string
          icon?: string
          id?: string
          leverage_max?: number
          max_drawdown_pct?: number
          max_positions?: number
          name?: string
          name_en?: string
          position_pct?: number
          rebalance_freq?: string | null
          stop_loss_pct?: number
          take_profit_pct?: number
          trailing_stop?: boolean | null
          volatility_scale?: number
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
          max_position_size_pct: number
          max_total_exposure_pct: number
          name: string
          stop_loss_pct: number
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
          max_position_size_pct: number
          max_total_exposure_pct: number
          name: string
          stop_loss_pct: number
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
          max_position_size_pct?: number
          max_total_exposure_pct?: number
          name?: string
          stop_loss_pct?: number
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
      rl_agents: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          state_vector: Json
          updated_at: string | null
          version: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          state_vector?: Json
          updated_at?: string | null
          version: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          state_vector?: Json
          updated_at?: string | null
          version?: string
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
          avg_loss_pct: number | null
          avg_win_pct: number | null
          kelly_fraction: number | null
          sample_size: number | null
          strategy_id: string
          updated_at: string | null
          user_id: string
          win_rate: number | null
        }
        Insert: {
          avg_loss_pct?: number | null
          avg_win_pct?: number | null
          kelly_fraction?: number | null
          sample_size?: number | null
          strategy_id: string
          updated_at?: string | null
          user_id: string
          win_rate?: number | null
        }
        Update: {
          avg_loss_pct?: number | null
          avg_win_pct?: number | null
          kelly_fraction?: number | null
          sample_size?: number | null
          strategy_id?: string
          updated_at?: string | null
          user_id?: string
          win_rate?: number | null
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
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      strategy_templates: {
        Row: {
          color: string | null
          created_at: string | null
          default_config: Json
          description_en: string | null
          description_no: string | null
          expected_annual_return_pct: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name_en: string
          name_no: string
          risk_level: string | null
          sort_order: number | null
          strategy: Database["public"]["Enums"]["strategy_type_v2"]
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_config: Json
          description_en?: string | null
          description_no?: string | null
          expected_annual_return_pct?: number | null
          icon?: string | null
          id: string
          is_active?: boolean | null
          name_en: string
          name_no: string
          risk_level?: string | null
          sort_order?: number | null
          strategy: Database["public"]["Enums"]["strategy_type_v2"]
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_config?: Json
          description_en?: string | null
          description_no?: string | null
          expected_annual_return_pct?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name_en?: string
          name_no?: string
          risk_level?: string | null
          sort_order?: number | null
          strategy?: Database["public"]["Enums"]["strategy_type_v2"]
        }
        Relationships: []
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
          amount: number | null
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: string
          provider: string | null
          status: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          tier_slug: string | null
          updated_at: string | null
          user_id: string
          vipps_agreement_id: string | null
          vipps_order_id: string | null
        }
        Insert: {
          amount?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          provider?: string | null
          status: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier_slug?: string | null
          updated_at?: string | null
          user_id: string
          vipps_agreement_id?: string | null
          vipps_order_id?: string | null
        }
        Update: {
          amount?: number | null
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: string
          provider?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          tier_slug?: string | null
          updated_at?: string | null
          user_id?: string
          vipps_agreement_id?: string | null
          vipps_order_id?: string | null
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
      system_health_logs: {
        Row: {
          binance_status: string
          checked_at: string | null
          email_status: string
          id: string
          metadata: Json | null
          response_time_ms: number | null
          supabase_status: string
        }
        Insert: {
          binance_status: string
          checked_at?: string | null
          email_status: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          supabase_status: string
        }
        Update: {
          binance_status?: string
          checked_at?: string | null
          email_status?: string
          id?: string
          metadata?: Json | null
          response_time_ms?: number | null
          supabase_status?: string
        }
        Relationships: []
      }
      technical_indicators: {
        Row: {
          adx: number | null
          atr: number | null
          bb_lower: number | null
          bb_middle: number | null
          bb_upper: number | null
          created_at: string | null
          ema20: number | null
          ema50: number | null
          id: string
          macd: number | null
          macd_signal: number | null
          rsi: number | null
          symbol: string
          timestamp: string | null
        }
        Insert: {
          adx?: number | null
          atr?: number | null
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          created_at?: string | null
          ema20?: number | null
          ema50?: number | null
          id?: string
          macd?: number | null
          macd_signal?: number | null
          rsi?: number | null
          symbol: string
          timestamp?: string | null
        }
        Update: {
          adx?: number | null
          atr?: number | null
          bb_lower?: number | null
          bb_middle?: number | null
          bb_upper?: number | null
          created_at?: string | null
          ema20?: number | null
          ema50?: number | null
          id?: string
          macd?: number | null
          macd_signal?: number | null
          rsi?: number | null
          symbol?: string
          timestamp?: string | null
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
          started_at: string | null
          status: string
          stderr: string | null
          stdout: string | null
        }
        Insert: {
          cmd: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          exit_code?: number | null
          id: string
          started_at?: string | null
          status?: string
          stderr?: string | null
          stdout?: string | null
        }
        Update: {
          cmd?: string
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          exit_code?: number | null
          id?: string
          started_at?: string | null
          status?: string
          stderr?: string | null
          stdout?: string | null
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
        Relationships: []
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
      trades: {
        Row: {
          binance_order_id: string | null
          created_at: string
          executed_at: string
          fee: number
          id: string
          idempotency_key: string
          indicator_snapshot: Json | null
          is_copy: boolean
          leader_trade_id: string | null
          mode: string
          order_type: string
          price: number
          quantity: number
          realized_pnl: number | null
          reason_code: string | null
          reason_params: Json | null
          session_id: string
          side: string
          status: string
          strategy_signal: Json | null
          symbol: string | null
          total: number | null
          total_value: number
          trading_pair: string
          user_id: string
        }
        Insert: {
          binance_order_id?: string | null
          created_at?: string
          executed_at?: string
          fee?: number
          id?: string
          idempotency_key: string
          indicator_snapshot?: Json | null
          is_copy?: boolean
          leader_trade_id?: string | null
          mode: string
          order_type?: string
          price: number
          quantity: number
          realized_pnl?: number | null
          reason_code?: string | null
          reason_params?: Json | null
          session_id: string
          side: string
          status?: string
          strategy_signal?: Json | null
          symbol?: string | null
          total?: number | null
          total_value: number
          trading_pair: string
          user_id: string
        }
        Update: {
          binance_order_id?: string | null
          created_at?: string
          executed_at?: string
          fee?: number
          id?: string
          idempotency_key?: string
          indicator_snapshot?: Json | null
          is_copy?: boolean
          leader_trade_id?: string | null
          mode?: string
          order_type?: string
          price?: number
          quantity?: number
          realized_pnl?: number | null
          reason_code?: string | null
          reason_params?: Json | null
          session_id?: string
          side?: string
          status?: string
          strategy_signal?: Json | null
          symbol?: string | null
          total?: number | null
          total_value?: number
          trading_pair?: string
          user_id?: string
        }
        Relationships: [
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
          exchange_env: string
          id: string
          ip_whitelist: string[] | null
          is_active: boolean | null
          is_valid: boolean | null
          last_used_at: string | null
          last_validated_at: string | null
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          exchange?: string
          exchange_env?: string
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          is_valid?: boolean | null
          last_used_at?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string | null
          exchange?: string
          exchange_env?: string
          id?: string
          ip_whitelist?: string[] | null
          is_active?: boolean | null
          is_valid?: boolean | null
          last_used_at?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
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
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_positions: {
        Row: {
          closed_at: string | null
          created_at: string
          current_price: number | null
          entry_price: number
          exchange: string
          exit_price: number | null
          id: string
          pnl: number | null
          pnl_percentage: number | null
          position_type: string
          quantity: number
          side: string
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          entry_price: number
          exchange?: string
          exit_price?: number | null
          id?: string
          pnl?: number | null
          pnl_percentage?: number | null
          position_type?: string
          quantity: number
          side: string
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          current_price?: number | null
          entry_price?: number
          exchange?: string
          exit_price?: number | null
          id?: string
          pnl?: number | null
          pnl_percentage?: number | null
          position_type?: string
          quantity?: number
          side?: string
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          copied_from_listing_id: string | null
          copy_source_session_id: string | null
          crash_count: number
          created_at: string
          current_capital: number
          current_capital_nok: number | null
          id: string
          initial_capital: number
          last_analysis_details: Json | null
          last_heartbeat: string
          last_status_message: string | null
          last_tick_at: string | null
          losing_trades: number
          max_drawdown_pct: number | null
          mode: string
          next_expected_action_at: string | null
          open_position: Json | null
          phase: string | null
          phase_started_at: string | null
          risk_level: string | null
          started_at: string
          starting_capital_nok: number | null
          status: string
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
          copied_from_listing_id?: string | null
          copy_source_session_id?: string | null
          crash_count?: number
          created_at?: string
          current_capital?: number
          current_capital_nok?: number | null
          id?: string
          initial_capital?: number
          last_analysis_details?: Json | null
          last_heartbeat?: string
          last_status_message?: string | null
          last_tick_at?: string | null
          losing_trades?: number
          max_drawdown_pct?: number | null
          mode?: string
          next_expected_action_at?: string | null
          open_position?: Json | null
          phase?: string | null
          phase_started_at?: string | null
          risk_level?: string | null
          started_at?: string
          starting_capital_nok?: number | null
          status?: string
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
          copied_from_listing_id?: string | null
          copy_source_session_id?: string | null
          crash_count?: number
          created_at?: string
          current_capital?: number
          current_capital_nok?: number | null
          id?: string
          initial_capital?: number
          last_analysis_details?: Json | null
          last_heartbeat?: string
          last_status_message?: string | null
          last_tick_at?: string | null
          losing_trades?: number
          max_drawdown_pct?: number | null
          mode?: string
          next_expected_action_at?: string | null
          open_position?: Json | null
          phase?: string | null
          phase_started_at?: string | null
          risk_level?: string | null
          started_at?: string
          starting_capital_nok?: number | null
          status?: string
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
          created_at: string | null
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
          created_at?: string | null
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
          created_at?: string | null
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
      unified_circuit_breaker_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
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
          resolved_at?: string | null
          resolved_by?: string | null
          resume_at?: string | null
          session_id?: string
          trigger_type?: string
          trigger_value?: string | null
          user_id?: string
        }
        Relationships: []
      }
      unified_copy_follows: {
        Row: {
          allocation_pct: number | null
          created_at: string | null
          follower_id: string
          follower_session_id: string | null
          id: string
          is_active: boolean | null
          leader_session_id: string
          max_trade_amount: number | null
          started_at: string | null
          stopped_at: string | null
          total_copied_trades: number | null
          total_pnl: number | null
        }
        Insert: {
          allocation_pct?: number | null
          created_at?: string | null
          follower_id: string
          follower_session_id?: string | null
          id?: string
          is_active?: boolean | null
          leader_session_id: string
          max_trade_amount?: number | null
          started_at?: string | null
          stopped_at?: string | null
          total_copied_trades?: number | null
          total_pnl?: number | null
        }
        Update: {
          allocation_pct?: number | null
          created_at?: string | null
          follower_id?: string
          follower_session_id?: string | null
          id?: string
          is_active?: boolean | null
          leader_session_id?: string
          max_trade_amount?: number | null
          started_at?: string | null
          stopped_at?: string | null
          total_copied_trades?: number | null
          total_pnl?: number | null
        }
        Relationships: []
      }
      unified_daily_metrics: {
        Row: {
          circuit_breaker_triggered: boolean | null
          created_at: string | null
          cumulative_pnl: number | null
          cumulative_pnl_pct: number | null
          daily_pnl: number | null
          daily_pnl_pct: number | null
          date: string
          ending_capital: number
          id: string
          losing_trades: number | null
          max_drawdown_pct: number | null
          session_id: string
          starting_capital: number
          trades_count: number | null
          user_id: string
          win_rate: number | null
          winning_trades: number | null
        }
        Insert: {
          circuit_breaker_triggered?: boolean | null
          created_at?: string | null
          cumulative_pnl?: number | null
          cumulative_pnl_pct?: number | null
          daily_pnl?: number | null
          daily_pnl_pct?: number | null
          date: string
          ending_capital: number
          id?: string
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          session_id: string
          starting_capital: number
          trades_count?: number | null
          user_id: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Update: {
          circuit_breaker_triggered?: boolean | null
          created_at?: string | null
          cumulative_pnl?: number | null
          cumulative_pnl_pct?: number | null
          daily_pnl?: number | null
          daily_pnl_pct?: number | null
          date?: string
          ending_capital?: number
          id?: string
          losing_trades?: number | null
          max_drawdown_pct?: number | null
          session_id?: string
          starting_capital?: number
          trades_count?: number | null
          user_id?: string
          win_rate?: number | null
          winning_trades?: number | null
        }
        Relationships: []
      }
      unified_exchange_keys: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string | null
          exchange: string
          id: string
          is_active: boolean | null
          last_error: string | null
          last_validated_at: string | null
          permissions: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string | null
          exchange: string
          id?: string
          is_active?: boolean | null
          last_error?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
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
          last_error?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string
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
          type: Database["public"]["Enums"]["notification_type_v2"]
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
      unified_trades: {
        Row: {
          client_order_id: string | null
          close_reason: string | null
          closed_at: string | null
          created_at: string | null
          entry_price: number
          exchange_order_id: string | null
          execution_time_ms: number | null
          exit_price: number | null
          fees: number | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          mode: Database["public"]["Enums"]["trading_mode_v2"]
          opened_at: string | null
          pnl: number | null
          pnl_pct: number | null
          position_value: number
          quantity: number
          session_id: string
          side: Database["public"]["Enums"]["trade_side_v2"]
          signal_confidence: number | null
          signal_reason: string | null
          slippage_pct: number | null
          status: Database["public"]["Enums"]["trade_status_v2"] | null
          stop_loss: number | null
          strategy: Database["public"]["Enums"]["strategy_type_v2"]
          symbol: string
          take_profit: number | null
          user_id: string
        }
        Insert: {
          client_order_id?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          entry_price: number
          exchange_order_id?: string | null
          execution_time_ms?: number | null
          exit_price?: number | null
          fees?: number | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          mode: Database["public"]["Enums"]["trading_mode_v2"]
          opened_at?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          position_value: number
          quantity: number
          session_id: string
          side: Database["public"]["Enums"]["trade_side_v2"]
          signal_confidence?: number | null
          signal_reason?: string | null
          slippage_pct?: number | null
          status?: Database["public"]["Enums"]["trade_status_v2"] | null
          stop_loss?: number | null
          strategy: Database["public"]["Enums"]["strategy_type_v2"]
          symbol: string
          take_profit?: number | null
          user_id: string
        }
        Update: {
          client_order_id?: string | null
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string | null
          entry_price?: number
          exchange_order_id?: string | null
          execution_time_ms?: number | null
          exit_price?: number | null
          fees?: number | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          mode?: Database["public"]["Enums"]["trading_mode_v2"]
          opened_at?: string | null
          pnl?: number | null
          pnl_pct?: number | null
          position_value?: number
          quantity?: number
          session_id?: string
          side?: Database["public"]["Enums"]["trade_side_v2"]
          signal_confidence?: number | null
          signal_reason?: string | null
          slippage_pct?: number | null
          status?: Database["public"]["Enums"]["trade_status_v2"] | null
          stop_loss?: number | null
          strategy?: Database["public"]["Enums"]["strategy_type_v2"]
          symbol?: string
          take_profit?: number | null
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
        Relationships: []
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
          id: string
          is_enabled: boolean | null
          is_paper_trading: boolean | null
          phase: string | null
          phase_min_days: number | null
          phase_profitable: boolean | null
          phase_started_at: string | null
          risk_level: string
          strategy_id: string | null
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
          id?: string
          is_enabled?: boolean | null
          is_paper_trading?: boolean | null
          phase?: string | null
          phase_min_days?: number | null
          phase_profitable?: boolean | null
          phase_started_at?: string | null
          risk_level?: string
          strategy_id?: string | null
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
          id?: string
          is_enabled?: boolean | null
          is_paper_trading?: boolean | null
          phase?: string | null
          phase_min_days?: number | null
          phase_profitable?: boolean | null
          phase_started_at?: string | null
          risk_level?: string
          strategy_id?: string | null
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
      user_binance_keys: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_testnet: boolean | null
          last_error: string | null
          last_validated_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_error?: string | null
          last_validated_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_testnet?: boolean | null
          last_error?: string | null
          last_validated_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      user_lesson_progress: {
        Row: {
          completed_at: string | null
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
      user_portfolios: {
        Row: {
          cash_balance: number | null
          daily_pnl: number | null
          id: string
          invested_value: number | null
          last_yield_move: string | null
          mode: string
          total_pnl: number | null
          total_trades: number | null
          total_value: number | null
          updated_at: string | null
          user_id: string | null
          win_rate: number | null
          yield_balance: number | null
        }
        Insert: {
          cash_balance?: number | null
          daily_pnl?: number | null
          id?: string
          invested_value?: number | null
          last_yield_move?: string | null
          mode?: string
          total_pnl?: number | null
          total_trades?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
          yield_balance?: number | null
        }
        Update: {
          cash_balance?: number | null
          daily_pnl?: number | null
          id?: string
          invested_value?: number | null
          last_yield_move?: string | null
          mode?: string
          total_pnl?: number | null
          total_trades?: number | null
          total_value?: number | null
          updated_at?: string | null
          user_id?: string | null
          win_rate?: number | null
          yield_balance?: number | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          binance_api_key_id: string | null
          binance_api_secret_id: string | null
          binance_connected: boolean
          created_at: string
          dismissed_get_started_card: boolean
          display_name: string | null
          email: string | null
          email_daily_digest: boolean
          email_on_crash: boolean
          email_on_trade: boolean
          full_name: string | null
          google_id: string | null
          id: string
          locale: string | null
          microsoft_id: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_started_at: string | null
          onboarding_step: number | null
          paper_balance: number
          paper_trades_count: number
          preferred_trading_mode: string | null
          provider: string | null
          real_balance: number | null
          risk_tolerance: string | null
          role: string | null
          setup_completed_at: string | null
          show_on_leaderboard: boolean | null
          status: string | null
          subscription_status: string
          subscription_tier: string
          tier: Database["public"]["Enums"]["subscription_tier"]
          trading_experience: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          binance_api_key_id?: string | null
          binance_api_secret_id?: string | null
          binance_connected?: boolean
          created_at?: string
          dismissed_get_started_card?: boolean
          display_name?: string | null
          email?: string | null
          email_daily_digest?: boolean
          email_on_crash?: boolean
          email_on_trade?: boolean
          full_name?: string | null
          google_id?: string | null
          id?: string
          locale?: string | null
          microsoft_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          paper_balance?: number
          paper_trades_count?: number
          preferred_trading_mode?: string | null
          provider?: string | null
          real_balance?: number | null
          risk_tolerance?: string | null
          role?: string | null
          setup_completed_at?: string | null
          show_on_leaderboard?: boolean | null
          status?: string | null
          subscription_status?: string
          subscription_tier?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trading_experience?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          binance_api_key_id?: string | null
          binance_api_secret_id?: string | null
          binance_connected?: boolean
          created_at?: string
          dismissed_get_started_card?: boolean
          display_name?: string | null
          email?: string | null
          email_daily_digest?: boolean
          email_on_crash?: boolean
          email_on_trade?: boolean
          full_name?: string | null
          google_id?: string | null
          id?: string
          locale?: string | null
          microsoft_id?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_started_at?: string | null
          onboarding_step?: number | null
          paper_balance?: number
          paper_trades_count?: number
          preferred_trading_mode?: string | null
          provider?: string | null
          real_balance?: number | null
          risk_tolerance?: string | null
          role?: string | null
          setup_completed_at?: string | null
          show_on_leaderboard?: boolean | null
          status?: string | null
          subscription_status?: string
          subscription_tier?: string
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trading_experience?: string | null
          updated_at?: string
          user_id?: string
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
      user_trading_config: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          paper_balance: number | null
          referral_code: string | null
          referral_points: number | null
          referred_by: string | null
          risk_level: string | null
          selected_pairs: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          paper_balance?: number | null
          referral_code?: string | null
          referral_points?: number | null
          referred_by?: string | null
          risk_level?: string | null
          selected_pairs?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          paper_balance?: number | null
          referral_code?: string | null
          referral_points?: number | null
          referred_by?: string | null
          risk_level?: string | null
          selected_pairs?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_trading_limits: {
        Row: {
          can_use_limit_orders: boolean | null
          can_use_margin: boolean | null
          can_use_stop_loss: boolean | null
          can_use_take_profit: boolean | null
          created_at: string | null
          max_trades_per_month: number | null
          max_volume_per_month_usd: number | null
          month_reset_at: string | null
          plan_type: string | null
          trades_used_this_month: number | null
          updated_at: string | null
          user_id: string
          volume_used_this_month_usd: number | null
        }
        Insert: {
          can_use_limit_orders?: boolean | null
          can_use_margin?: boolean | null
          can_use_stop_loss?: boolean | null
          can_use_take_profit?: boolean | null
          created_at?: string | null
          max_trades_per_month?: number | null
          max_volume_per_month_usd?: number | null
          month_reset_at?: string | null
          plan_type?: string | null
          trades_used_this_month?: number | null
          updated_at?: string | null
          user_id: string
          volume_used_this_month_usd?: number | null
        }
        Update: {
          can_use_limit_orders?: boolean | null
          can_use_margin?: boolean | null
          can_use_stop_loss?: boolean | null
          can_use_take_profit?: boolean | null
          created_at?: string | null
          max_trades_per_month?: number | null
          max_volume_per_month_usd?: number | null
          month_reset_at?: string | null
          plan_type?: string | null
          trades_used_this_month?: number | null
          updated_at?: string | null
          user_id?: string
          volume_used_this_month_usd?: number | null
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
      vipps_payments: {
        Row: {
          amount: number | null
          course_id: string | null
          created_at: string | null
          id: string
          order_id: string | null
          status: string | null
          user_id: string | null
          vipps_order_id: string | null
        }
        Insert: {
          amount?: number | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          user_id?: string | null
          vipps_order_id?: string | null
        }
        Update: {
          amount?: number | null
          course_id?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          status?: string | null
          user_id?: string | null
          vipps_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vipps_payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vipps_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      campaign_stats: {
        Row: {
          bounced: number | null
          click_rate: number | null
          emails_clicked: number | null
          emails_opened: number | null
          emails_sent: number | null
          open_rate: number | null
          registered: number | null
          total_contacts: number | null
          unsubscribed: number | null
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
          mode?: string | null
          open_position?: Json | null
          started_at?: string | null
          status?: string | null
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
          mode?: string | null
          open_position?: Json | null
          started_at?: string | null
          status?: string | null
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
      v_active_paper_positions: {
        Row: {
          account_id: string | null
          current_price: number | null
          current_return_percent: number | null
          entry_amount: number | null
          entry_price: number | null
          id: string | null
          opened_at: string | null
          position_type: string | null
          quantity: number | null
          stop_loss: number | null
          symbol: string | null
          take_profit: number | null
          unrealized_pnl: number | null
          user_id: string | null
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
    }
    Functions: {
      admin_change_role: {
        Args: { p_admin_id: string; p_new_role: string; p_user_id: string }
        Returns: Json
      }
      admin_upgrade_user: {
        Args: { p_admin_id: string; p_new_tier: string; p_user_id: string }
        Returns: Json
      }
      allocate_founder_tokens: {
        Args: { p_user_id: string }
        Returns: {
          amount: number
          student_number: number
        }[]
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
        Args: { p_strategy_id?: string; p_user_id: string }
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
      can_place_trade: {
        Args: { p_amount_usd: number; p_user_id: string }
        Returns: {
          allowed: boolean
          reason: string
          trades_remaining: number
          volume_remaining: number
        }[]
      }
      check_beta_kill_switch: {
        Args: { p_user_id: string }
        Returns: {
          can_trade: boolean
          reason: string
          severity: string
        }[]
      }
      check_daily_limits: {
        Args: { p_user_id: string }
        Returns: {
          current_loss_percent: number
          current_trade_count: number
          loss_limit_reached: boolean
          trade_limit_reached: boolean
        }[]
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
      cleanup_old_ai_logs: { Args: never; Returns: number }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      close_paper_position: {
        Args: {
          close_reason: string
          closing_price: number
          position_id: string
        }
        Returns: Json
      }
      complete_referral: {
        Args: { p_referral_code: string; p_referred_user_id: string }
        Returns: boolean
      }
      complete_referral_reward: {
        Args: { p_referred_user_id: string }
        Returns: undefined
      }
      compute_leaderboard_monthly: {
        Args: { p_month?: string }
        Returns: number
      }
      count_user_strategies: {
        Args: { p_mode?: string; p_user_id: string }
        Returns: number
      }
      decrement_capital: {
        Args: { p_amount: number; p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      decrypt_binance_keys: {
        Args: { key_id: string; secret_id: string }
        Returns: {
          api_key: string
          api_secret: string
          is_testnet: boolean
        }[]
      }
      detect_crashed_sessions: { Args: never; Returns: undefined }
      exec_sql: { Args: { query_text: string }; Returns: Json }
      generate_trade_idempotency_key: {
        Args: {
          p_session_id: string
          p_side: Database["public"]["Enums"]["trade_side"]
          p_timestamp: string
        }
        Returns: string
      }
      get_active_tier: { Args: { p_user_id: string }; Returns: string }
      get_ai_trading_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_confidence: number
          buy_signals: number
          executed_trades: number
          hold_signals: number
          last_analysis_at: string
          sell_signals: number
          total_analyses: number
        }[]
      }
      get_available_auto_budget: {
        Args: { p_user_id: string }
        Returns: {
          allocated_in_open_trades_nok: number
          available_auto_budget_nok: number
          binance_balance_nok: number
          max_auto_budget_nok: number
        }[]
      }
      get_avg_onboarding_time: { Args: never; Returns: string }
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
      get_daily_trading_metrics: {
        Args: { p_days?: number; p_user_id: string }
        Returns: {
          cumulative_pnl: number
          daily_pnl: number
          date: string
          trades_count: number
          win_rate: number
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
      get_funnel_dropoff: {
        Args: never
        Returns: {
          dropoff_rate: number
          dropped_off_count: number
          reached_count: number
          step_name: string
        }[]
      }
      get_funnel_stats: {
        Args: { p_days?: number }
        Returns: {
          event_type: string
          total_events: number
          unique_users: number
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
      get_or_create_backtest_cache: {
        Args: {
          p_metrics_summary: Json
          p_period_months: number
          p_result_data: Json
          p_strategy_id: string
          p_symbol: string
          p_usd_nok_rate?: number
        }
        Returns: Json
      }
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
      get_rls_status_detailed: {
        Args: never
        Returns: {
          policy_count: number
          rls_enabled: boolean
          table_name: string
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
      get_tables_info: {
        Args: never
        Returns: {
          has_rls: boolean
          row_count: number
          table_name: string
        }[]
      }
      get_top_pages: {
        Args: { p_limit?: number; p_start_date?: string }
        Returns: {
          path: string
          visits: number
        }[]
      }
      get_top_tables_by_rows: {
        Args: { limit_count?: number }
        Returns: {
          rader: number
          tablename: string
        }[]
      }
      get_unique_visitors: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: number
      }
      get_user_entitlements: {
        Args: { p_user_id: string }
        Returns: {
          auto_trade_allow_live: boolean
          auto_trade_allow_paper: boolean
          auto_trade_max_positions: number
          auto_trade_max_strategies: number
          can_access_futures: boolean
          can_access_spot: boolean
          can_use_autotrade: boolean
          can_use_copy_trading: boolean
          can_use_limit_orders: boolean
          can_use_margin: boolean
          can_use_sms: boolean
          futures_quiz_passed: boolean
          is_trial_active: boolean
          is_trial_expired: boolean
          subscription_status: string
          subscription_tier: string
          trial_days_remaining: number
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
      get_user_trading_stats: {
        Args: { p_user_id: string }
        Returns: {
          active_sessions: number
          total_capital: number
          total_pnl: number
          total_pnl_pct: number
          total_trades: number
          win_rate: number
          winning_trades: number
        }[]
      }
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
      is_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_admin_for_profiles: { Args: never; Returns: boolean }
      is_bot_healthy: { Args: { p_bot_id: string }; Returns: boolean }
      is_service_role: { Args: never; Returns: boolean }
      is_trading_allowed: { Args: never; Returns: boolean }
      klarpakke_trigger_cron: { Args: { path: string }; Returns: undefined }
      level_norsk: { Args: { lvl: string }; Returns: string }
      log_backtest_telemetry: {
        Args: {
          p_anonymous_id?: string
          p_cache_age_ms?: number
          p_cache_hit?: boolean
          p_initial_capital_nok: number
          p_metrics: Json
          p_period_months: number
          p_referrer?: string
          p_session_id: string
          p_strategy_id: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_user_action: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_signal_id?: string
          p_user_id: string
        }
        Returns: string
      }
      mark_backtest_converted: {
        Args: { p_session_id: string }
        Returns: boolean
      }
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
      record_trade_usage: {
        Args: { p_amount_usd: number; p_user_id: string }
        Returns: boolean
      }
      refresh_leaderboard: { Args: never; Returns: undefined }
      remove_binance_keys: { Args: { p_user_id: string }; Returns: boolean }
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
      sync_binance_balances: {
        Args: { p_balances: Json; p_user_id: string }
        Returns: {
          assets_synced: number
          total_usd_value: number
        }[]
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
      trigger_binance_auto_sync: { Args: never; Returns: undefined }
      update_session_heartbeat: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      update_transition_readiness_score: {
        Args: { p_user_id: string }
        Returns: number
      }
      upsert_daily_stats: {
        Args: { p_trade_pnl: number; p_user_id: string }
        Returns: undefined
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
        | "trade_executed"
        | "trade_closed"
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
      session_status_v2: "active" | "paused" | "stopped" | "crashed"
      strategy_type_v2: "dca" | "trend" | "multi_signal" | "grid"
      subscription_tier:
        | "free"
        | "student"
        | "master"
        | "phd"
        | "professor"
        | "bachelor"
      trade_side: "buy" | "sell"
      trade_side_v2: "buy" | "sell"
      trade_status: "pending" | "executed" | "failed"
      trade_status_v2: "pending" | "open" | "closed" | "cancelled" | "failed"
      trading_mode: "paper" | "live"
      trading_mode_v2: "paper" | "live"
      trading_phase: "paper" | "micro" | "small" | "full"
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
        "trade_executed",
        "trade_closed",
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
      session_status_v2: ["active", "paused", "stopped", "crashed"],
      strategy_type_v2: ["dca", "trend", "multi_signal", "grid"],
      subscription_tier: [
        "free",
        "student",
        "master",
        "phd",
        "professor",
        "bachelor",
      ],
      trade_side: ["buy", "sell"],
      trade_side_v2: ["buy", "sell"],
      trade_status: ["pending", "executed", "failed"],
      trade_status_v2: ["pending", "open", "closed", "cancelled", "failed"],
      trading_mode: ["paper", "live"],
      trading_mode_v2: ["paper", "live"],
      trading_phase: ["paper", "micro", "small", "full"],
    },
  },
} as const
