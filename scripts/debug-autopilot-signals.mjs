#!/usr/bin/env node

/**
 * Debug Autopilot Signal Generation
 * Kjører runAutopilotAnalysis og logger hvert steg.
 */

import { runAutopilotAnalysis } from "../src/lib/ai/autopilot/decision-engine.js";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vuxbjlykgmzskxbclquf.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log("🔍 Debug Autopilot Signal Generation\n");

  if (!SUPABASE_KEY) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY mangler");
    process.exit(1);
  }

  const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Sjekk ai_agent_stats
  console.log("📊 Sjekker ai_agent_stats...");
  const { data: stats, error: statsErr } = await db
    .from("ai_agent_stats")
    .select("agent_id, symbol, win_rate")
    .limit(10);

  if (statsErr) {
    console.error("❌ ai_agent_stats feil:", statsErr.message);
  } else {
    console.log(`✅ ai_agent_stats: ${stats?.length ?? 0} rader funnet`);
    if (stats?.length) {
      console.log("   Første 3:", stats.slice(0, 3).map((s) => `${s.agent_id}@${s.symbol}=${s.win_rate}`));
    }
  }

  // Sjekk feature flags
  console.log("\n🏳️  Sjekker feature flags...");
  const { data: flags } = await db.from("feature_flags").select("*").limit(10);
  console.log(`   ${flags?.length ?? 0} flags funnet`);
  const killSwitch = flags?.find((f) => f.name === "signalEngineKillSwitch");
  if (killSwitch) {
    console.log(`   signalEngineKillSwitch: ${killSwitch.enabled}`);
  }

  // Kjør autopilot analyse
  console.log("\n🤖 Kjører runAutopilotAnalysis...");
  try {
    const decision = await runAutopilotAnalysis("moderate", 100000, 3, db);
    console.log("\n📋 Resultat:");
    console.log(`   Regime: ${decision.regime} (confidence: ${decision.regime_confidence})`);
    console.log(`   Strategy: ${decision.strategy}`);
    console.log(`   Pairs: ${decision.pairs.length}`);
    if (decision.pairs.length === 0) {
      console.log("   ⚠️  INGEN PAR ALLOKERT — autopilot vil IKKE aktiveres!");
    } else {
      decision.pairs.forEach((p) => {
        console.log(`   ✅ ${p.symbol}: ${p.signal_action} @ ${p.confidence}% — ${p.capital_nok} NOK`);
      });
    }
  } catch (err) {
    console.error("❌ runAutopilotAnalysis feilet:", err.message);
    console.error(err.stack);
  }
}

main().catch(console.error);
