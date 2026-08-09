/**
 * Verifiser at tick-kjeden resolver max_aggressive korrekt.
 * Simulerer det /api/cron/tick gjør for sesjon d10c6096.
 * Kjør: npx tsx scripts/verify-tick-resolution.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { resolveTickStrategyEngineKey } from "../src/lib/trading/strategy-id-aliases";
import { getStrategyConfig, getDarkFleetConfig } from "../src/lib/trading/strategy-configs";
import { resolveStrategy } from "../src/lib/trading/strategies/index";

function main() {
  const strategyId = "max_aggressive";

  // Steg A: alias-resolve (det tick gjør først)
  const engineKey = resolveTickStrategyEngineKey(strategyId);
  console.log(engineKey === "max_aggressive" ? "ALIAS_OK: max_aggressive" : `ALIAS_FAIL: ${engineKey}`);

  // Steg B: config-resolve (V2)
  const cfg = getStrategyConfig(strategyId);
  console.log(cfg?.engine === "max_aggressive" ? "CONFIG_OK" : `CONFIG_FAIL: ${cfg?.engine}`);

  // Steg C: Dark Fleet skal være AV
  const df = getDarkFleetConfig(strategyId);
  console.log(df?.enabled === false ? "DARKFLEET_DISABLED_OK" : `DARKFLEET_FAIL: ${JSON.stringify(df)}`);

  // Steg D: strategyRegistry har motoren
  const strategy = resolveStrategy("max_aggressive");
  console.log(strategy ? `REGISTRY_OK: ${strategy.constructor.name}` : "REGISTRY_FAIL: ikke funnet");

  // Oppsummering
  const allOk = engineKey === "max_aggressive" && cfg?.engine === "max_aggressive" && df?.enabled === false && !!strategy;
  console.log(allOk ? "TICK_CHAIN_READY" : "TICK_CHAIN_BROKEN");
}

main();
