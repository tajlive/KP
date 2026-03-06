export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          subscription_tier: 'free' | 'standard' | 'proff' | 'extrem' | 'family'
          subscription_expires_at: string | null
          trial_used: boolean
          trial_expires_at: string | null
          amount: number | null
          status: string | null
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          subscription_tier?: 'free' | 'standard' | 'proff' | 'extrem' | 'family'
          subscription_expires_at?: string | null
          trial_used?: boolean
          trial_expires_at?: string | null
          amount?: number | null
          status?: string | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          subscription_tier?: 'free' | 'standard' | 'proff' | 'extrem' | 'family'
          subscription_expires_at?: string | null
          trial_used?: boolean
          trial_expires_at?: string | null
          amount?: number | null
          status?: string | null
        }
      }
      wallets: {
        Row: {
          id: string
          user_id: string
          balance_usdt: number
          total_deposited: number
          total_withdrawn: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance_usdt?: number
          total_deposited?: number
          total_withdrawn?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance_usdt?: number
          total_deposited?: number
          total_withdrawn?: number
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          symbol: string
          quantity: number
          avg_buy_price: number
          total_invested: number
          unrealized_pnl: number
          unrealized_pnl_percent: number
          current_price: number
          current_value: number
          last_updated: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          quantity?: number
          avg_buy_price?: number
          total_invested?: number
          unrealized_pnl?: number
          unrealized_pnl_percent?: number
          current_price?: number
          current_value?: number
          last_updated?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          quantity?: number
          avg_buy_price?: number
          total_invested?: number
          unrealized_pnl?: number
          unrealized_pnl_percent?: number
          current_price?: number
          current_value?: number
          last_updated?: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          session_id?: string | null
          symbol: string
          type: 'buy' | 'sell'
          side: 'market' | 'limit'
          quantity: number
          price: number
          total_amount: number
          fee: number
          fee_percent: number
          realized_pnl: number | null
          pnl: number | null
          pnl_percent: number | null
          status: 'pending' | 'completed' | 'failed'
          created_at: string
          executed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          symbol: string
          type: 'buy' | 'sell'
          side?: 'market' | 'limit'
          quantity: number
          price: number
          total_amount: number
          fee: number
          fee_percent?: number
          realized_pnl?: number | null
          pnl?: number | null
          pnl_percent?: number | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
          executed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          symbol?: string
          type?: 'buy' | 'sell'
          side?: 'market' | 'limit'
          quantity?: number
          price?: number
          total_amount?: number
          fee?: number
          fee_percent?: number
          realized_pnl?: number | null
          pnl?: number | null
          pnl_percent?: number | null
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
          executed_at?: string | null
        }
      }
      coin_prices: {
        Row: {
          id: string
          symbol: string
          name: string
          price: number
          price_change_24h: number
          price_change_percent_24h: number
          volume_24h: number
          market_cap: number | null
          high_24h: number
          low_24h: number
          last_updated: string
        }
        Insert: {
          id?: string
          symbol: string
          name: string
          price: number
          price_change_24h?: number
          price_change_percent_24h?: number
          volume_24h?: number
          market_cap?: number | null
          high_24h?: number
          low_24h?: number
          last_updated?: string
        }
        Update: {
          id?: string
          symbol?: string
          name?: string
          price?: number
          price_change_24h?: number
          price_change_percent_24h?: number
          volume_24h?: number
          market_cap?: number | null
          high_24h?: number
          low_24h?: number
          last_updated?: string
        }
      }
      trading_stats: {
        Row: {
          id: string
          user_id: string
          total_trades: number
          winning_trades: number
          losing_trades: number
          win_rate: number
          total_pnl: number
          total_pnl_percent: number
          best_trade_pnl: number | null
          worst_trade_pnl: number | null
          avg_trade_pnl: number
          avg_trade_duration: number | null
          max_drawdown: number
          sharpe_ratio: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_trades?: number
          winning_trades?: number
          losing_trades?: number
          win_rate?: number
          total_pnl?: number
          total_pnl_percent?: number
          best_trade_pnl?: number | null
          worst_trade_pnl?: number | null
          avg_trade_pnl?: number
          avg_trade_duration?: number | null
          max_drawdown?: number
          sharpe_ratio?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_trades?: number
          winning_trades?: number
          losing_trades?: number
          win_rate?: number
          total_pnl?: number
          total_pnl_percent?: number
          best_trade_pnl?: number | null
          worst_trade_pnl?: number | null
          avg_trade_pnl?: number
          avg_trade_duration?: number | null
          max_drawdown?: number
          sharpe_ratio?: number | null
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          name_no: string
          price_monthly: number
          price_yearly: number
          description: string
          features: string[]
          features_no: string[]
          max_backtest_days: number
          ai_coach: boolean
          risk_level: 'low' | 'medium' | 'high'
          max_team_members: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          name_no: string
          price_monthly: number
          price_yearly: number
          description: string
          features?: string[]
          features_no?: string[]
          max_backtest_days?: number
          ai_coach?: boolean
          risk_level?: 'low' | 'medium' | 'high'
          max_team_members?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          name_no?: string
          price_monthly?: number
          price_yearly?: number
          description?: string
          features?: string[]
          features_no?: string[]
          max_backtest_days?: number
          ai_coach?: boolean
          risk_level?: 'low' | 'medium' | 'high'
          max_team_members?: number | null
          created_at?: string
        }
      }
      strategies: {
        Row: {
          id: string
          name: string
          description: string
          type: 'trend' | 'momentum' | 'mean_reversion' | 'breakout' | 'scalping'
          risk_level: 'low' | 'medium' | 'high'
          min_capital: number
          avg_return: number
          win_rate: number
          created_by: string
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          type: 'trend' | 'momentum' | 'mean_reversion' | 'breakout' | 'scalping'
          risk_level: 'low' | 'medium' | 'high'
          min_capital?: number
          avg_return?: number
          win_rate?: number
          created_by: string
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          type?: 'trend' | 'momentum' | 'mean_reversion' | 'breakout' | 'scalping'
          risk_level?: 'low' | 'medium' | 'high'
          min_capital?: number
          avg_return?: number
          win_rate?: number
          created_by?: string
          is_public?: boolean
          created_at?: string
        }
      }
      price_alerts: {
        Row: {
          id: string
          user_id: string
          symbol: string
          condition: 'above' | 'below' | 'percent_change'
          target_price: number | null
          percent_threshold: number | null
          is_active: boolean
          triggered_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          condition: 'above' | 'below' | 'percent_change'
          target_price?: number | null
          percent_threshold?: number | null
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          condition?: 'above' | 'below' | 'percent_change'
          target_price?: number | null
          percent_threshold?: number | null
          is_active?: boolean
          triggered_at?: string | null
          created_at?: string
        }
      }
      panic_button_logs: {
        Row: {
          id: string
          user_id: string
          triggered_at: string
          action_taken: string
          positions_closed: number
          total_value_closed: number
          reason: string | null
        }
        Insert: {
          id?: string
          user_id: string
          triggered_at?: string
          action_taken: string
          positions_closed: number
          total_value_closed: number
          reason?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          triggered_at?: string
          action_taken?: string
          positions_closed?: number
          total_value_closed?: number
          reason?: string | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'user' | 'admin' | 'super_admin' | 'founder'
          is_founder: boolean
          subscription_tier: 'free' | 'standard' | 'proff' | 'extrem' | 'family'
          show_on_leaderboard: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin' | 'super_admin' | 'founder'
          is_founder?: boolean
          subscription_tier?: 'free' | 'standard' | 'proff' | 'extrem' | 'family'
          show_on_leaderboard?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          display_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin' | 'super_admin' | 'founder'
          is_founder?: boolean
          subscription_tier?: 'free' | 'standard' | 'proff' | 'extrem' | 'family'
          show_on_leaderboard?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      trading_sessions: {
        Row: {
          id: string
          user_id: string
          mode: 'paper' | 'live'
          status: 'active' | 'paused' | 'completed'
          starting_capital: number
          starting_capital_nok: number | null
          current_capital: number
          current_capital_nok: number | null
          total_pnl: number
          realized_pnl: number
          unrealized_pnl: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          mode: 'paper' | 'live'
          status?: 'active' | 'paused' | 'completed'
          starting_capital: number
          starting_capital_nok?: number | null
          current_capital?: number
          current_capital_nok?: number | null
          total_pnl?: number
          realized_pnl?: number
          unrealized_pnl?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          mode?: 'paper' | 'live'
          status?: 'active' | 'paused' | 'completed'
          starting_capital?: number
          starting_capital_nok?: number | null
          current_capital?: number
          current_capital_nok?: number | null
          total_pnl?: number
          realized_pnl?: number
          unrealized_pnl?: number
          created_at?: string
          updated_at?: string
        }
      }
      conditional_orders: {
        Row: {
          id: string
          user_id: string
          symbol: string
          type: 'stop_loss' | 'take_profit'
          trigger_price: number
          quantity: number
          status: 'active' | 'triggered' | 'cancelled'
          created_at: string
          triggered_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          type: 'stop_loss' | 'take_profit'
          trigger_price: number
          quantity: number
          status?: 'active' | 'triggered' | 'cancelled'
          created_at?: string
          triggered_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          type?: 'stop_loss' | 'take_profit'
          trigger_price?: number
          quantity?: number
          status?: 'active' | 'triggered' | 'cancelled'
          created_at?: string
          triggered_at?: string | null
        }
      }
      ai_cache: {
        Row: {
          id: string
          cache_key: string
          value: Record<string, unknown>
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          value: Record<string, unknown>
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          value?: Record<string, unknown>
          expires_at?: string
          created_at?: string
        }
      }
    }
    Functions: {
      execute_trade: {
        Args: {
          p_user_id: string
          p_symbol: string
          p_type: 'buy' | 'sell'
          p_quantity: number
          p_price: number
        }
        Returns: {
          success: boolean
          trade_id: string
          message: string
        }
      }
      initialize_user_wallet: {
        Args: {
          p_user_id: string
        }
        Returns: {
          success: boolean
          message: string
        }
      }
      trigger_panic_button: {
        Args: {
          p_user_id: string
          p_reason?: string
        }
        Returns: {
          success: boolean
          positions_closed: number
          total_value: number
          message: string
        }
      }
      klt_balances: {
        Row: {
          id: string
          user_id: string
          balance: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          balance?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          balance?: number
          updated_at?: string
        }
      }
      klt_transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          type: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          type: string
          reason?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          type?: string
          reason?: string
          created_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          user_id: string | null
          session_id: string | null
          event_name: string
          event_type: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          event_name: string
          event_type: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          session_id?: string | null
          event_name?: string
          event_type?: string
          created_at?: string
        }
      }
      onboarding_progress: {
        Row: {
          id: string
          user_id: string
          completed_lessons: string[]
          current_step: string
          is_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          completed_lessons?: string[]
          current_step?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          completed_lessons?: string[]
          current_step?: string
          is_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      learning_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          completed_lesson_ids: string[]
          progress_percent: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          completed_lesson_ids?: string[]
          progress_percent?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          completed_lesson_ids?: string[]
          progress_percent?: number
          created_at?: string
          updated_at?: string
        }
      }
      auto_trading_sessions: {
        Row: {
          id: string
          user_id: string
          bot_config_id: string
          status: 'running' | 'paused' | 'stopped'
          started_at: string
          stopped_at: string | null
          total_pnl: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bot_config_id: string
          status?: 'running' | 'paused' | 'stopped'
          started_at?: string
          stopped_at?: string | null
          total_pnl?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bot_config_id?: string
          status?: 'running' | 'paused' | 'stopped'
          started_at?: string
          stopped_at?: string | null
          total_pnl?: number
          created_at?: string
          updated_at?: string
        }
      }
      strategy_logs: {
        Row: {
          id: string
          session_id: string
          strategy_id: string
          action: string
          details: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          strategy_id: string
          action: string
          details?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          strategy_id?: string
          action?: string
          details?: Record<string, unknown>
          created_at?: string
        }
      }
      trading_logs: {
        Row: {
          id: string
          session_id: string
          level: 'info' | 'warn' | 'error'
          message: string
          metadata: Record<string, unknown>
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          level: 'info' | 'warn' | 'error'
          message: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          level?: 'info' | 'warn' | 'error'
          message?: string
          metadata?: Record<string, unknown>
          created_at?: string
        }
      }
      ai_cache: {
        Row: {
          id: string
          cache_key: string
          value: Record<string, unknown>
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          cache_key: string
          value: Record<string, unknown>
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          cache_key?: string
          value?: Record<string, unknown>
          expires_at?: string
          created_at?: string
        }
      }
      conditional_orders: {
        Row: {
          id: string
          user_id: string
          symbol: string
          type: 'stop_loss' | 'take_profit'
          trigger_price: number
          quantity: number
          status: 'active' | 'triggered' | 'cancelled'
          created_at: string
          triggered_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          type: 'stop_loss' | 'take_profit'
          trigger_price: number
          quantity: number
          status?: 'active' | 'triggered' | 'cancelled'
          created_at?: string
          triggered_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          type?: 'stop_loss' | 'take_profit'
          trigger_price?: number
          quantity?: number
          status?: 'active' | 'triggered' | 'cancelled'
          created_at?: string
          triggered_at?: string | null
        }
      }
      strategy_reviews: {
        Row: {
          id: string
          strategy_id: string
          user_id: string
          rating: number
          review: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          strategy_id: string
          user_id: string
          rating: number
          review?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          strategy_id?: string
          user_id?: string
          rating?: number
          review?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
