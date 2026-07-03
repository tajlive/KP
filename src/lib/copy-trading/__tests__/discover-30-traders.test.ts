import { describe, expect, it } from "vitest";
import { traderProfilesToDiscoverLeaders } from "../discover-from-trader-profiles";
import type { Database } from "@/types/database.types";

type TraderProfileRow = Database["public"]["Tables"]["trader_profiles"]["Row"];

function makeTraderProfile(index: number): TraderProfileRow {
  const idSuffix = String(index).padStart(12, "0");
  return {
    id: `00000000-0000-0000-0000-${idSuffix}`,
    user_id: `11111111-1111-1111-1111-${idSuffix}`,
    display_name: `Trader ${index + 1}`,
    all_time_roi: index * 1.5,
    win_rate: 30 + index,
    sharpe_ratio: index * 0.1,
    follower_count: index,
    performance_fee_pct: index * 0.5,
    total_trades: index * 2,
    is_public: index % 2 === 0,
    verified: index % 3 === 0,
    avatar_url: index % 5 === 0 ? null : `https://example.com/avatar-${index}.png`,
    bio: `Bio for trader ${index + 1}`,
    created_at: null,
    updated_at: null,
  };
}

describe("traderProfilesToDiscoverLeaders with 30 generated traders", () => {
  it("processes 30 distinct trader profiles without error", () => {
    const rows = Array.from({ length: 30 }, (_, i) => makeTraderProfile(i));
    const out = traderProfilesToDiscoverLeaders(rows, new Set());

    expect(out).toHaveLength(30);

    for (let i = 0; i < 30; i++) {
      const input = rows[i]!;
      const dto = out[i]!;
      expect(dto.traderHrefId).toBe(input.id);
      expect(dto.leaderAuthUserId).toBe(input.user_id);
      expect(dto.display_name).toBe(input.display_name);
    }

    const hrefIds = new Set(out.map((dto) => dto.traderHrefId));
    expect(hrefIds.size).toBe(30);
  });
});
