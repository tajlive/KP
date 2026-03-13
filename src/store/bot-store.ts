import { createClient } from "@/lib/supabase/client";
import { create } from "zustand";
import type { Tables } from "@/lib/supabase/client";

type BotStatus = "active" | "paused" | "stopped" | "error";
type BotStrategyType =
  | "dca"
  | "trend"
  | "multisignal"
  | "grid"
  | "aicopy"
  | "momentum";

interface Bot {
  id: string;
  userId: string;
  name: string;
  strategyType: BotStrategyType;
  status: BotStatus;
  mode: "paper" | "live";
  symbol: string;
  config: Record<string, unknown>;
  pnlNok: number;
  pnlPct: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  currentCapitalNok: number;
  startingCapitalNok: number;
  maxDrawdownPct: number;
  lastTradeAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertConfig {
  id: string;
  strategyId: string;
  drawdownThresholdPct: number;
  dailyLossLimitNok: number | null;
  notifyOnTrade: boolean;
  notifyOnError: boolean;
  notificationChannels: string[];
}

interface AggregatePnl {
  day: number;
  week: number;
  month: number;
  all: number;
}

type BotFilter = "all" | "active" | "paused" | "stopped";

interface BotStore {
  bots: Bot[];
  selectedBotId: string | null;
  aggregatePnl: AggregatePnl;
  filter: BotFilter;
  isLoading: boolean;
  error: string | null;

  fetchBots: () => Promise<void>;
  selectBot: (id: string | null) => void;
  setFilter: (filter: BotFilter) => void;
  pauseBot: (id: string) => Promise<void>;
  resumeBot: (id: string) => Promise<void>;
  stopBot: (id: string) => Promise<void>;
  updateBotFromRealtime: (strategyId: string, updates: Partial<Bot>) => void;

  filteredBots: () => Bot[];
  selectedBot: () => Bot | null;
  activeBotCount: () => number;
}

function calculateAggregatePnl(bots: Bot[]): AggregatePnl {
  return bots.reduce<AggregatePnl>(
    (acc, bot) => ({
      day: acc.day, // Would need daily P&L data from sessions — fallback to all
      week: acc.week,
      month: acc.month,
      all: acc.all + bot.pnlNok,
    }),
    { day: 0, week: 0, month: 0, all: 0 },
  );
}

export const useBotStore = create<BotStore>()((set, get) => ({
  bots: [],
  selectedBotId: null,
  aggregatePnl: { day: 0, week: 0, month: 0, all: 0 },
  filter: "all",
  isLoading: false,
  error: null,

  fetchBots: async () => {
    set({ isLoading: true, error: null });
    try {
      const supabase = createClient();

      // Fetch strategies with their latest session data
      const { data: strategies, error: stratError } = await supabase
        .from("bot_configs")
        .select("*")
        .order("created_at", { ascending: false });

      if (stratError) throw stratError;

      // Fetch sessions for P&L data
      const { data: sessions } = await supabase
        .from("unified_trading_sessions")
        .select("*")
        .order("created_at", { ascending: false });

      const sessionMap = new Map(
        (sessions ?? []).map((s: Tables<"unified_trading_sessions">) => [
          s.id,
          s,
        ]),
      );

      const bots: Bot[] = (strategies ?? []).map(
        (strat: Tables<"bot_configs">) => {
          const session = sessionMap.get(strat.id) as
            | Tables<"unified_trading_sessions">
            | undefined;

          return {
            id: strat.id,
            userId: strat.user_id,
            name: strat.bot_name || "Unnamed Bot",
            strategyType: (strat.strategy_type as BotStrategyType) || "dca",
            status: strat.is_active ? "active" : "stopped",
            mode: strat.is_paper_trade ? "paper" : "live",
            symbol:
              ((strat.config as Record<string, unknown>)?.symbol as string) ||
              "BTCUSDT",
            config: (strat.config as Record<string, unknown>) || {},
            pnlNok: session?.total_pnl ?? 0,
            pnlPct: session?.total_pnl_pct ?? 0,
            totalTrades: session?.total_trades ?? 0,
            winningTrades: session?.winning_trades ?? 0,
            losingTrades: session?.losing_trades ?? 0,
            currentCapitalNok: session?.current_capital ?? 0,
            startingCapitalNok: session?.initial_capital ?? 0,
            maxDrawdownPct: session?.max_drawdown_pct ?? 0,
            lastTradeAt: session?.last_trade_at || null,
            createdAt: strat.created_at ?? "",
            updatedAt: strat.updated_at ?? strat.created_at ?? "",
          };
        },
      );

      set({
        bots,
        aggregatePnl: calculateAggregatePnl(bots),
        isLoading: false,
      });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  selectBot: (id) => set({ selectedBotId: id }),
  setFilter: (filter) => set({ filter }),

  pauseBot: async (id) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("bot_configs")
      .update({ is_active: false })
      .eq("id", id);

    if (!error) {
      set((state) => ({
        bots: state.bots.map((b) =>
          b.id === id ? { ...b, status: "paused" as BotStatus } : b,
        ),
      }));
    }
  },

  resumeBot: async (id) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("bot_configs")
      .update({ is_active: true })
      .eq("id", id);

    if (!error) {
      set((state) => ({
        bots: state.bots.map((b) =>
          b.id === id ? { ...b, status: "active" as BotStatus } : b,
        ),
      }));
    }
  },

  stopBot: async (id) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("bot_configs")
      .update({ is_active: false })
      .eq("id", id);

    if (!error) {
      set((state) => ({
        bots: state.bots.map((b) =>
          b.id === id ? { ...b, status: "stopped" as BotStatus } : b,
        ),
      }));
    }
  },

  updateBotFromRealtime: (strategyId, updates) => {
    set((state) => {
      const updatedBots = state.bots.map((b) =>
        b.id === strategyId ? { ...b, ...updates } : b,
      );
      return {
        bots: updatedBots,
        aggregatePnl: calculateAggregatePnl(updatedBots),
      };
    });
  },

  filteredBots: () => {
    const { bots, filter } = get();
    if (filter === "all") return bots;
    return bots.filter((b) => b.status === filter);
  },

  selectedBot: () => {
    const { bots, selectedBotId } = get();
    return bots.find((b) => b.id === selectedBotId) ?? null;
  },

  activeBotCount: () =>
    get().bots.filter((b) => b.status === "active").length,
}));

export type {
  AggregatePnl,
  AlertConfig,
  Bot,
  BotFilter,
  BotStatus,
  BotStrategyType,
};
