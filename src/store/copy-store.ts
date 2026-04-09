import { createClient } from "../lib/supabase/client";
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
  lastFetchSource: "api" | "supabase" | null;

  fetchFollowing: () => Promise<void>;
  follow: (leaderId: string, config: CopyConfig) => Promise<void>;
  unfollow: (leaderId: string) => Promise<void>;
  updateConfig: (
    leaderId: string,
    config: Partial<CopyConfig>,
  ) => Promise<void>;
  fetchActiveCopies: () => Promise<void>;
}

type FollowingApiRow = {
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
};

async function fetchFollowingViaApi(): Promise<{
  following: FollowedTrader[];
  ok: boolean;
  apiError?: string;
  apiStatus?: number;
}> {
  const res = await fetch("/api/copy-trading/following", {
    credentials: "include",
  });
  if (!res.ok) {
    let apiError = `HTTP ${res.status}`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (typeof errBody?.error === "string" && errBody.error.trim()) {
        apiError = errBody.error.trim();
      }
    } catch {
      /* ignore */
    }
    return {
      following: [],
      ok: false,
      apiError,
      apiStatus: res.status,
    };
  }
  const body = (await res.json()) as { following: FollowingApiRow[] };
  const following: FollowedTrader[] = (body.following ?? []).map((f) => ({
    id: f.id,
    leaderId: f.leaderId,
    leaderName: f.leaderName,
    leaderAvatar: f.leaderAvatar,
    maxAllocationNok: f.maxAllocationNok,
    sizingMode: f.sizingMode,
    maxLeverage: f.maxLeverage,
    autoStopDrawdownPct: f.autoStopDrawdownPct,
    isActive: f.isActive,
    pnlNok: f.pnlNok,
    activeCopies: f.activeCopies,
    followedAt: f.followedAt,
  }));
  return { following, ok: true };
}

function mapFollowRowsFromSupabase(
  rows: Record<string, unknown>[],
  profiles: Map<
    string,
    { display_name: string | null; avatar_url: string | null }
  >,
): FollowedTrader[] {
  return rows.map((row) => {
    const leaderAuthId = String(row.leader_id ?? "");
    const prof = profiles.get(leaderAuthId);
    const maxRaw = row.max_trade_amount;
    const maxNok =
      typeof maxRaw === "number"
        ? maxRaw
        : maxRaw != null
          ? Number(maxRaw)
          : 10_000;
    const alloc = Number(row.allocation_percent ?? 0);
    const scale = Number(row.scale_factor ?? 0);
    const proportional = alloc > 0 && scale > 0;

    return {
      id: String(row.id ?? ""),
      leaderId: leaderAuthId,
      leaderName: prof?.display_name?.trim() || "Trader",
      leaderAvatar: prof?.avatar_url ?? null,
      maxAllocationNok: Number.isFinite(maxNok) ? maxNok : 10_000,
      sizingMode: proportional ? "proportional" : "fixed",
      maxLeverage: 5,
      autoStopDrawdownPct: 20,
      isActive: row.is_active !== false,
      pnlNok: 0,
      activeCopies: 0,
      followedAt: String(row.created_at ?? ""),
    };
  });
}

export const useCopyStore = create<CopyStore>()((set, get) => ({
  following: [],
  activeCopies: [],
  totalCopyPnl: 0,
  isLoading: false,
  error: null,
  lastFetchSource: null,

  fetchFollowing: async () => {
    set({ isLoading: true, error: null });
    try {
      const apiResult = await fetchFollowingViaApi();
      if (apiResult.ok) {
        const totalPnl = apiResult.following.reduce(
          (sum, f) => sum + f.pnlNok,
          0,
        );
        set({
          following: apiResult.following,
          totalCopyPnl: totalPnl,
          isLoading: false,
          lastFetchSource: "api",
          error: null,
        });
        return;
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        set({
          following: [],
          totalCopyPnl: 0,
          isLoading: false,
          lastFetchSource: null,
          error:
            apiResult.apiStatus === 401
              ? "Ikke innlogget — logg inn på nytt for å se copy trading."
              : (apiResult.apiError ?? "Kunne ikke hente copy trading (API)."),
        });
        return;
      }

      const { data, error } = await supabase
        .from("copy_trading_follows")
        .select("*")
        .eq("follower_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data ?? []) as Record<string, unknown>[];
      const leaderIds = [
        ...new Set(rows.map((r) => String(r.leader_id ?? "")).filter(Boolean)),
      ];
      const profiles = new Map<
        string,
        { display_name: string | null; avatar_url: string | null }
      >();

      if (leaderIds.length > 0) {
        const { data: profs } = await supabase
          .from("user_profiles")
          .select("user_id, display_name")
          .in("user_id", leaderIds);

        for (const p of profs ?? []) {
          if (p.user_id) {
            profiles.set(p.user_id, {
              display_name: p.display_name,
              avatar_url: null,
            });
          }
        }

        const { data: pubTraders } = await supabase
          .from("trader_profiles")
          .select("user_id, display_name")
          .in("user_id", leaderIds)
          .eq("is_public", true);

        for (const p of pubTraders ?? []) {
          if (!p.user_id) continue;
          const existing = profiles.get(p.user_id);
          const name = p.display_name?.trim();
          if (name && !existing?.display_name?.trim()) {
            profiles.set(p.user_id, {
              display_name: p.display_name,
              avatar_url: existing?.avatar_url ?? null,
            });
          }
        }
      }

      const following = mapFollowRowsFromSupabase(rows, profiles);
      const totalPnl = following.reduce((sum, f) => sum + f.pnlNok, 0);
      set({
        following,
        totalCopyPnl: totalPnl,
        isLoading: false,
        lastFetchSource: "supabase",
        error:
          following.length === 0 && apiResult.apiError
            ? apiResult.apiError
            : null,
      });
    } catch (err) {
      set({
        error: (err as Error).message,
        isLoading: false,
        lastFetchSource: null,
      });
    }
  },

  follow: async (leaderId: string, config: CopyConfig) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      set({ error: "Ikke innlogget" });
      return;
    }

    const { error } = await supabase.from("copy_trading_follows").insert({
      follower_id: user.id,
      leader_id: leaderId,
      max_trade_amount: config.maxAllocationNok,
      scale_factor: config.sizingMode === "proportional" ? 1 : null,
      allocation_percent: config.sizingMode === "proportional" ? 100 : 10,
      is_active: true,
    });

    if (!error) {
      await get().fetchFollowing();
    } else {
      set({ error: error.message });
    }
  },

  unfollow: async (leaderId: string) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const { error } = await supabase
      .from("copy_trading_follows")
      .update({ is_active: false })
      .eq("leader_id", leaderId)
      .eq("follower_id", user.id);

    if (!error) {
      set((state) => ({
        following: state.following.map((f) =>
          f.leaderId === leaderId ? { ...f, isActive: false } : f,
        ),
      }));
      await get().fetchFollowing();
    }
  },

  updateConfig: async (leaderId, config) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return;

    const updates: { [key: string]: unknown } = {};
    if (config.maxAllocationNok !== undefined) {
      updates.max_trade_amount = config.maxAllocationNok;
    }
    if (config.sizingMode !== undefined) {
      updates.scale_factor = config.sizingMode === "proportional" ? 1 : null;
      updates.allocation_percent =
        config.sizingMode === "proportional" ? 100 : 10;
    }

    if (Object.keys(updates).length === 0) return;

    await supabase
      .from("copy_trading_follows")
      .update(updates as any).eq("leader_id", leaderId)
      .eq("follower_id", user.id);

    await get().fetchFollowing();
  },

  fetchActiveCopies: async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("copy_trade_queue")
      .select("*")
      .eq("status", "executed")
      .order("created_at", { ascending: false })
      .limit(50);

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
}));

export type { CopiedPosition, CopyConfig, FollowedTrader };
