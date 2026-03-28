/**
 * INTEGRASJONSTEST — kjører mot live Supabase.
 * Krever: REPRO_PAPER_EXECUTE=1 og .env.local med SUPABASE_SERVICE_ROLE_KEY
 *
 * Kjør manuelt:
 *   REPRO_PAPER_EXECUTE=1 npx vitest run e2e/repro/paper-execute-remote.repro.test.ts
 *
 * ALDRI inkludert i npm run test:unit eller CI-pipeline.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });

import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { executePaperTrade } from "../../src/lib/trading/safety/execute-paper-trade";

const run = process.env.REPRO_PAPER_EXECUTE === "1";

async function userIdByEmail(
  sb: ReturnType<typeof createClient>,
  email: string,
): Promise<string | null> {
  let page = 1;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await sb.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const u = data.users.find(
      (x) => (x.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (u) return u.id;
    if (data.users.length < 200) return null;
    page += 1;
  }
  return null;
}

describe.skipIf(!run)(
  "REPRO: paper execute against remote DB (tom@klarpakke.no)",
  () => {
    let userId: string;

    beforeAll(async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        throw new Error(
          "Mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY",
        );
      }
      const sb = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const id = await userIdByEmail(sb, "tom@klarpakke.no");
      if (!id) throw new Error("tom@klarpakke.no ikke funnet i auth");
      userId = id;
    });

    it("small BTC buy (~100 NOK notional) should succeed or show explicit rejection", async () => {
      const price = 100_000;
      const qty = 0.00001; // 1 USDT @ 100k/BTC
      const r = await executePaperTrade({
        userId,
        symbol: "BTCUSDT",
        side: "buy",
        quantity: qty,
        price,
      });
      expect(r.success, JSON.stringify(r)).toBe(true);
    });

    it("larger BTC buy (~450 USDT notional) — typical UI quick amount path", async () => {
      const price = 100_000;
      const qty = 0.0045;
      const r = await executePaperTrade({
        userId,
        symbol: "BTCUSDT",
        side: "buy",
        quantity: qty,
        price,
      });
      expect(r.success, JSON.stringify(r)).toBe(true);
    });

    it("SOL buy small — tests default allowed_pairs vs altcoins", async () => {
      const price = 150;
      const qty = 0.05;
      const r = await executePaperTrade({
        userId,
        symbol: "SOLUSDT",
        side: "buy",
        quantity: qty,
        price,
      });
      expect(r.success, JSON.stringify(r)).toBe(true);
    });
  },
);
