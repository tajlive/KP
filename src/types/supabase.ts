// =============================================================================
// Supabase Database Types
// =============================================================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          beta_limits?: Record<string, unknown> | null
          onboarding_step?: string | null
          exchange_connected?: boolean | null
          binance_clicked?: boolean | null
          student_nummer?: string | null
          risk_preference?: string | null
          telegram_connected?: boolean | null
          telegram_username?: string | null
          created_at?: string | null
          updated_at?: string | null
          user_metadata?: Record<string, unknown> | null
          last_sign_in_at?: string | null
          phone?: string | null
          preferred_language?: string | null
          push_notifications_enabled?: boolean | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: string | null
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          portfolio_id?: string | null
          symbol: string
          side?: string | null
          status?: string | null
          quantity?: number | null
          price?: number | null
          pnl?: number | null
          pnl_nok?: number | null
          pnl_pct?: number | null
          profit_loss?: number | null
          realized_pnl?: number | null
          position_value?: number | null
          opened_at?: string | null
          closed_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      portfolios: {
        Row: {
          id: string
          user_id: string
          name?: string | null
          balance?: number | null
          currency?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      simulations: {
        Row: {
          id: string
          user_id: string
          current_balance?: number | null
          initial_balance?: number | null
          status?: string | null
          phase?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      visits: {
        Row: {
          id: string
          path?: string | null
          referrer?: string | null
          user_id?: string | null
          created_at?: string | null
          ip_address?: string | null
          user_agent?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      system_logs: {
        Row: {
          id: string
          type?: string | null
          message?: string | null
          time?: string | null
          created_at?: string | null
          metadata?: Record<string, unknown> | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      ai_predictions: {
        Row: {
          id: string
          symbol?: string | null
          prediction_action?: string | null
          prediction_confidence?: number | null
          target_price?: number | null
          stop_loss?: number | null
          reason?: string | null
          sentiment_score?: number | null
          fear_greed_index?: number | null
          rsi?: number | null
          timestamp?: string | null
          created_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          status?: string | null
          tier?: string | null
          stripe_subscription_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      waitlist: {
        Row: {
          id: string
          email: string
          name?: string | null
          phone?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      beta_applications: {
        Row: {
          id: string
          user_id?: string | null
          email: string
          name?: string | null
          phone?: string | null
          status?: string | null
          risk_preference?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      leaderboard: {
        Row: {
          id: string
          user_id: string
          full_name?: string | null
          email?: string | null
          total_pnl?: number | null
          win_rate?: number | null
          trade_count?: number | null
          rank?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type?: string | null
          title: string
          message?: string | null
          read?: boolean | null
          action_url?: string | null
          created_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          description?: string | null
          slug: string
          price?: number | null
          currency?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      user_courses: {
        Row: {
          id: string
          user_id: string
          course_id: string
          status?: string | null
          progress?: number | null
          purchased_at?: string | null
          completed_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
      funnel_events: {
        Row: {
          id: string
          user_id?: string | null
          event_type: string
          step?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string | null
        }
        Insert: {
          [key: string]: unknown
        }
        Update: {
          [key: string]: unknown
        }
      }
    }
    Views: {
      [key: string]: unknown
    }
    Functions: {
      [key: string]: unknown
    }
    Enums: {
      [key: string]: unknown
    }
  }
}
