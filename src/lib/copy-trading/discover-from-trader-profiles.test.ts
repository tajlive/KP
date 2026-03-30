import { describe, expect, it } from "vitest";
import { traderProfilesToDiscoverLeaders } from "./discover-from-trader-profiles";

describe("traderProfilesToDiscoverLeaders", () => {
  it("bygger DiscoverLeaderDto med trader_profiles.id som href", () => {
    const uid = "11111111-1111-1111-1111-111111111111";
    const pid = "22222222-2222-2222-2222-222222222222";
    const rows = [
      {
        id: pid,
        user_id: uid,
        display_name: "E2E Public Trader",
        avatar_url: null,
        bio: null,
        created_at: null,
        updated_at: null,
        is_public: true,
        performance_fee_pct: 0,
        follower_count: 3,
        verified: false,
        all_time_roi: 12.5,
        win_rate: 55,
        sharpe_ratio: 1.1,
        total_trades: 10,
      },
    ] as const;

    const followed = new Set<string>();
    const out = traderProfilesToDiscoverLeaders([...rows], followed);
    expect(out).toHaveLength(1);
    expect(out[0]!.traderHrefId).toBe(pid);
    expect(out[0]!.leaderAuthUserId).toBe(uid);
    expect(out[0]!.display_name).toBe("E2E Public Trader");
    expect(out[0]!.is_following).toBe(false);
  });

  it("markerer is_following når leader auth-id er i settet", () => {
    const uid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const rows = [
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        user_id: uid,
        display_name: "X",
        avatar_url: null,
        bio: null,
        created_at: null,
        updated_at: null,
        is_public: true,
        performance_fee_pct: null,
        follower_count: null,
        verified: null,
        all_time_roi: null,
        win_rate: null,
        sharpe_ratio: null,
        total_trades: null,
      },
    ] as const;
    const out = traderProfilesToDiscoverLeaders([...rows], new Set([uid]));
    expect(out[0]!.is_following).toBe(true);
  });
});
