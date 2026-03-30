// ============================================================================
// KLARPAKKE - Database Types Patch
// ============================================================================
// Denne filen utvider database.types.ts med manglende tabeller og kolonner
// ============================================================================

export interface DatabasePatch {
  public: {
    Tables: {
      // Manglende tabeller som må legges til i database.types.ts
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role:
            | "user"
            | "admin"
            | "super_admin"
            | "student"
            | "master"
            | "phd"
            | "professor";
          subscription_tier:
            | "free"
            | "student"
            | "bachelor"
            | "master"
            | "phd"
            | "professor";
          show_on_leaderboard: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?:
            | "user"
            | "admin"
            | "super_admin"
            | "student"
            | "master"
            | "phd"
            | "professor";
          subscription_tier?:
            | "free"
            | "student"
            | "bachelor"
            | "master"
            | "phd"
            | "professor";
          show_on_leaderboard?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?:
            | "user"
            | "admin"
            | "super_admin"
            | "student"
            | "master"
            | "phd"
            | "professor";
          subscription_tier?:
            | "free"
            | "student"
            | "bachelor"
            | "master"
            | "phd"
            | "professor";
          show_on_leaderboard?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      trading_sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: "paper" | "live";
          status: "active" | "paused" | "completed";
          starting_capital: number;
          starting_capital_nok: number | null;
          current_capital: number;
          current_capital_nok: number | null;
          total_pnl: number;
          realized_pnl: number;
          unrealized_pnl: number;
          allocated_capital_pct: number;
          risk_config: Record<string, unknown>;
          crash_count: number;
          last_heartbeat: string;
          last_analysis_details: Record<string, unknown>;
          winning_trades: number;
          losing_trades: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: "paper" | "live";
          status?: "active" | "paused" | "completed";
          starting_capital: number;
          starting_capital_nok?: number | null;
          current_capital?: number;
          current_capital_nok?: number | null;
          total_pnl?: number;
          realized_pnl?: number;
          unrealized_pnl?: number;
          allocated_capital_pct?: number;
          risk_config?: Record<string, unknown>;
          crash_count?: number;
          last_heartbeat?: string;
          last_analysis_details?: Record<string, unknown>;
          winning_trades?: number;
          losing_trades?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: "paper" | "live";
          status?: "active" | "paused" | "completed";
          starting_capital?: number;
          starting_capital_nok?: number | null;
          current_capital?: number;
          current_capital_nok?: number | null;
          total_pnl?: number;
          realized_pnl?: number;
          unrealized_pnl?: number;
          allocated_capital_pct?: number;
          risk_config?: Record<string, unknown>;
          crash_count?: number;
          last_heartbeat?: string;
          last_analysis_details?: Record<string, unknown>;
          winning_trades?: number;
          losing_trades?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      auto_trading_sessions: {
        Row: {
          id: string;
          user_id: string;
          bot_config_id: string;
          status: "running" | "paused" | "stopped";
          started_at: string;
          stopped_at: string | null;
          total_pnl: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          bot_config_id: string;
          status?: "running" | "paused" | "stopped";
          started_at?: string;
          stopped_at?: string | null;
          total_pnl?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          bot_config_id?: string;
          status?: "running" | "paused" | "stopped";
          started_at?: string;
          stopped_at?: string | null;
          total_pnl?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      strategy_logs: {
        Row: {
          id: string;
          session_id: string;
          strategy_id: string;
          action: string;
          details: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          strategy_id: string;
          action: string;
          details?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          strategy_id?: string;
          action?: string;
          details?: Record<string, unknown>;
          created_at?: string;
        };
      };
      trading_logs: {
        Row: {
          id: string;
          session_id: string;
          level: "info" | "warn" | "error";
          message: string;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          level: "info" | "warn" | "error";
          message: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          level?: "info" | "warn" | "error";
          message?: string;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
      };
      ai_cache: {
        Row: {
          id: string;
          cache_key: string;
          value: Record<string, unknown>;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cache_key: string;
          value: Record<string, unknown>;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cache_key?: string;
          value?: Record<string, unknown>;
          expires_at?: string;
          created_at?: string;
        };
      };
      strategy_reviews: {
        Row: {
          id: string;
          strategy_id: string;
          user_id: string;
          rating: number;
          review: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          strategy_id: string;
          user_id: string;
          rating: number;
          review?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          strategy_id?: string;
          user_id?: string;
          rating?: number;
          review?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      conditional_orders: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          type: "stop_loss" | "take_profit";
          trigger_price: number;
          quantity: number;
          status: "active" | "triggered" | "cancelled";
          created_at: string;
          triggered_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          type: "stop_loss" | "take_profit";
          trigger_price: number;
          quantity: number;
          status?: "active" | "triggered" | "cancelled";
          created_at?: string;
          triggered_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          type?: "stop_loss" | "take_profit";
          trigger_price?: number;
          quantity?: number;
          status?: "active" | "triggered" | "cancelled";
          created_at?: string;
          triggered_at?: string | null;
        };
      };
      onboarding_progress: {
        Row: {
          id: string;
          user_id: string;
          completed_lessons: string[];
          current_step: string;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          completed_lessons?: string[];
          current_step?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          completed_lessons?: string[];
          current_step?: string;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      learning_progress: {
        Row: {
          id: string;
          user_id: string;
          course_id: string;
          completed_lesson_ids: string[];
          _completedLessonIds: string[]; // For kompatibilitet
          progress_percent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          course_id: string;
          completed_lesson_ids?: string[];
          _completedLessonIds?: string[];
          progress_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          course_id?: string;
          completed_lesson_ids?: string[];
          _completedLessonIds?: string[];
          progress_percent?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      trading_triggers: {
        Row: {
          id: string;
          user_id: string;
          symbol: string;
          trigger_price: number;
          side: string;
          quantity: number;
          action: string;
          mode: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          symbol: string;
          trigger_price: number;
          side: string;
          quantity: number;
          action: string;
          mode?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          symbol?: string;
          trigger_price?: number;
          side?: string;
          quantity?: number;
          action?: string;
          mode?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          email_enabled: boolean;
          push_enabled: boolean;
          price_alerts: boolean;
          trade_notifications: boolean;
          marketing_emails: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          email_enabled?: boolean;
          push_enabled?: boolean;
          price_alerts?: boolean;
          trade_notifications?: boolean;
          marketing_emails?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          email_enabled?: boolean;
          push_enabled?: boolean;
          price_alerts?: boolean;
          trade_notifications?: boolean;
          marketing_emails?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          trading_mode: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          trading_mode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          trading_mode?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
