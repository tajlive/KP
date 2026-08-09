/**
 * STEG 5-verifikasjon: Simuler én tick ende-til-ende.
 * Henter aktiv live-sesjon → resolveStrategy → ExecutorFactory → OKX-tilkobling.
 * Kjør: npx tsx scripts/verify-live-tick.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { ExecutorFactory } from "../src/lib/trading/executor-factory";
import { resolveStrategy } from "../src/lib/trading/strategies/index";

async function main() {
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const userId = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";

  // 1. Aktiv live-sesjon
  const { data: session } = await sb
    .from("trading_sessions")
    .select("id, strategy_id, trading_pair, mode, status, current_capital")
    .eq("user_id", userId)
    .eq("mode", "live")
    .eq("status", "active")
    .maybeSingle();

  if (!session) {
    console.log("FAIL: ingen aktiv live-sesjon");
    return;
  }
  console.log("SESSION_OK:", session.strategy_id, session.trading_pair, session.current_capital);

  // 2. Strategi i registry
  const strategy = resolveStrategy(session.strategy_id);
  if (!strategy) {
    console.log("FAIL: strategi ikke i registry:", session.strategy_id);
    return;
  }
  console.log("STRATEGY_OK:", session.strategy_id);

  // 3. Executor — dette er lenken som var brutt (DB-nøkler)
  try {
    const executor = await ExecutorFactory.create(
      sb as never,
      userId,
      "live",
      session.id
    );
    console.log("EXECUTOR_OK:", executor.constructor.name);

    // 4. Reell OKX-tilkoblingstest — hent balanse via executoren
    if ("getBalance" in executor && typeof executor.getBalance === "function") {
      const bal = await executor.getBalance();
      console.log("OKX_BALANCE:", JSON.stringify(bal).slice(0, 200));
    }
  } catch (e) {
    console.log("EXECUTOR_FAIL:", (e as Error).message);
  }
}

main().catch((e) => {
  console.log("FATAL:", (e as Error).message);
  process.exit(1);
});
