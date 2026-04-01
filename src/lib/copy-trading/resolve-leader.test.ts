import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { Database } from "@/types/database.types";
import { resolveLeaderAuthId } from "./resolve-leader";

type MaybeRow = Record<string, unknown> | null;

/** Deterministisk mock av from().select().eq().maybeSingle() i rekkefølge. */
function createOrderedDbMock(rows: MaybeRow[]): SupabaseClient<Database> {
  let i = 0;
  const chain = () => ({
    select: (_cols: string) => ({
      eq: (_col: string, _val: string) => ({
        maybeSingle: async () => {
          const data = rows[i] ?? null;
          i += 1;
          return { data, error: null };
        },
      }),
    }),
  });
  return {
    from: (_table: string) => chain(),
  } as unknown as SupabaseClient<Database>;
}

describe("resolveLeaderAuthId", () => {
  it("resolver trader_profiles.id til auth user_id og visningsnavn", async () => {
    const authId = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const traderProfileId = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const db = createOrderedDbMock([
      null,
      null,
      { user_id: authId, display_name: "Offentlig Leder" },
    ]);
    const r = await resolveLeaderAuthId(db, traderProfileId);
    expect(r).toEqual({
      authUserId: authId,
      displayName: "Offentlig Leder",
    });
  });

  it("resolver leaderboard_bots.id til bot user_id og user_profiles.display_name", async () => {
    const botAuth = "cccccccc-cccc-cccc-cccc-cccccccccccc";
    const botRowId = "dddddddd-dddd-dddd-dddd-dddddddddddd";
    const db = createOrderedDbMock([
      null,
      null,
      null,
      { user_id: botAuth },
      { display_name: "Paper Bot Alpha" },
    ]);
    const r = await resolveLeaderAuthId(db, botRowId);
    expect(r).toEqual({
      authUserId: botAuth,
      displayName: "Paper Bot Alpha",
    });
  });

  it("returnerer null når ingen treff", async () => {
    const db = createOrderedDbMock([null, null, null, null]);
    const r = await resolveLeaderAuthId(
      db,
      "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    );
    expect(r).toBeNull();
  });
});
