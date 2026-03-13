import { createClient } from "@/lib/supabase/client";
import { create } from "zustand";

interface FollowedTrader {
  id: string;
  leaderId: string;
  leaderName: string;
  leaderAvatar: string | null;
  maxAllocationNok: number;
  sizingMode: "fixed" | "proportional";
  maxLeverage: number;
  autoStopDrawdownPct: number;
  isActive: boolean;
  pnlNok: number;
  activeCopies: number;
  followedAt: string;
}

interface CopiedPosition {
  id: string;
  leaderId: string;
  originalTradeId: string;
  symbol: string;
  side: "LONG" | "SHORT";
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnlNok: number;
  pnlPct: number;
  latencyMs: number;
  status: "active" | "closed";
  openedAt: string;
}

interface CopyConfig {
  maxAllocationNok: number;
  sizingMode: "fixed" | "proportional";
  maxLeverage: number;
  autoStopDrawdownPct: number;
}

interface CopyStore {
  following: FollowedTrader[];
  activeCopies: CopiedPosition[];
  totalCopyPnl: number;
  isLoading: boolean;
  error: string | null;

  fetchFollowing: () => Promise<void>;
  follow: (leaderId: string, config: CopyConfig) => Promise<void>;
  unfollow: (leaderId: string) => Promise<void>;
  updateConfig: (
    leaderId: string,
    config: Partial<CopyConfig>,
  ) => Promise<void>;
  fetchActiveCopies: () => Promise<void>;
}

export const useCopyStore = create<CopyStore>()(
  (set, get) => ({
    following: [],
    activeCopies: [],
    totalCopyPnl: 0,
    isLoading: false,
    error: null,

    fetchFollowing: async () => {
      set({ isLoading: true, error: null });
      try {
        const supabase = createClient();
        const { data, error } = (await supabase
          .from("copy_trading_follows")
          .select("*")
          .order("created_at", { ascending: false }));

        if (error) throw error;

        const following: FollowedTrader[] = (data || []).map(
          (cfg: any) => ({
            id: cfg.id as string,
            leaderId: cfg.leader_id as string,
            leaderName: (cfg.leader_name as string) || "Unknown Trader",
            leaderAvatar: (cfg.leader_avatar as string) || null,
            maxAllocationNok: (cfg.max_allocation_nok as number) || 10000,
            sizingMode:
              (cfg.sizing_mode as "fixed" | "proportional") || "proportional",
            maxLeverage: (cfg.max_leverage as number) || 5,
            autoStopDrawdownPct: (cfg.auto_stop_drawdown_pct as number) || 20,
            isActive: (cfg.is_active as boolean) ?? true,
            pnlNok: 0, // Computed from copy_trade_log
            activeCopies: 0,
            followedAt: cfg.created_at as string,
          }),
        );

        const totalPnl = following.reduce((sum, f) => sum + f.pnlNok, 0);
        set({ following, totalCopyPnl: totalPnl, isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    follow: async (leaderId: string, config: unknown) => {
      const supabase = createClient();
      const { error } = (await supabase
        .from("copy_trading_follows" as unknown)
        .insert({
          leader_id: leaderId,
          max_allocation_nok: config.maxAllocationNok,
          sizing_mode: config.sizingMode,
          max_leverage: config.maxLeverage,
          auto_stop_drawdown_pct: config.autoStopDrawdownPct,
          is_active: true,
        })) as unknown;

      if (!error) {
        await get().fetchFollowing();
      }
    },

    unfollow: async (leaderId) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("copy_trading_follows")
        .update({ is_active: false })
        .eq("leader_id", leaderId);

      if (!error) {
        set((state: unknown) => ({
          following: state.following.map((f: unknown) =>
            f.leaderId === leaderId ? { ...f, isActive: false } : f,
          ),
        }));
      }
    },

    updateConfig: async (leaderId, config) => {
      const supabase = createClient();
      const updates: Record<string, unknown> = {};
      if (config.maxAllocationNok !== undefined)
        updates.max_allocation_nok = config.maxAllocationNok;
      if (config.sizingMode !== undefined)
        updates.sizing_mode = config.sizingMode;
      if (config.maxLeverage !== undefined)
        updates.max_leverage = config.maxLeverage;
      if (config.autoStopDrawdownPct !== undefined)
        updates.auto_stop_drawdown_pct = config.autoStopDrawdownPct;
      updates.updated_at = new Date().toISOString();

      (await supabase
        .from("copy_trading_follows" as unknown)
        .update(updates)
        .eq("leader_id", leaderId)) as unknown;

      await get().fetchFollowing();
    },

    fetchActiveCopies: async () => {
      const supabase = createClient();
      const { data } = (await supabase
        .from("copy_trade_queue" as unknown)
        .select("*")
        .eq("status", "executed")
        .order("created_at", { ascending: false })
        .limit(50)) as unknown;

      if (data) {
        const copies: CopiedPosition[] = data.map(
          (log: Record<string, unknown>) => ({
            id: log.id as string,
            leaderId: (log.config_id as string) || "",
            originalTradeId: (log.original_trade_id as string) || "",
            symbol: (log.symbol as string) || "",
            side: "LONG" as const,
            entryPrice: (log.copy_price as number) || 0,
            currentPrice: (log.copy_price as number) || 0,
            quantity: 0,
            pnlNok: 0,
            pnlPct: 0,
            latencyMs: (log.latency_ms as number) || 0,
            status: "active" as const,
            openedAt: log.created_at as string,
          }),
        );

        set({ activeCopies: copies });
      }
    },
  }),
);

export type { CopiedPosition, CopyConfig, FollowedTrader };
