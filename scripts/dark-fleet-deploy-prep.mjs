#!/usr/bin/env node
/**
 * Dark Fleet Deploy Prep Script
 *
 * Bruk:
 *   node scripts/dark-fleet-deploy-prep.mjs <userId> [challengerPercent] [salt]
 *
 * Eksempel:
 *   node scripts/dark-fleet-deploy-prep.mjs "user-abc-123" 1
 *   → Viser om brukeren blir champion eller challenger
 */

import { createHash } from "crypto";

function hashUserId(userId, salt) {
  const hash = createHash("sha256").update(userId + salt).digest("hex");
  return parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

function shouldUseChallenger(userId, percent, salt) {
  const bucket = hashUserId(userId, salt);
  const useChallenger = bucket < percent / 100;
  return { version: useChallenger ? "challenger" : "champion", bucket };
}

const userId = process.argv[2];
const percent = parseFloat(process.argv[3] || "0");
const salt = process.argv[4] || "klarpakke-dark-fleet-2026";

if (!userId) {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  Dark Fleet Deploy Prep                                  ║
╚════════════════════════════════════════════════════════════╝

Bruk: node scripts/dark-fleet-deploy-prep.mjs <userId> [percent] [salt]

Eksempler:
  node scripts/dark-fleet-deploy-prep.mjs "din-test-bruker-id" 1
  node scripts/dark-fleet-deploy-prep.mjs "din-test-bruker-id" 5
  node scripts/dark-fleet-deploy-prep.mjs "din-test-bruker-id" 100
`);
  process.exit(0);
}

const result = shouldUseChallenger(userId, percent, salt);

console.log(`
╔════════════════════════════════════════════════════════════╗
║  Dark Fleet Rollout Simulator                            ║
╚════════════════════════════════════════════════════════════╝

User ID:        ${userId}
Challenger %:   ${percent}%
Salt:           ${salt}
Bucket:         ${(result.bucket * 100).toFixed(4)}%

Resultat:       ${result.version.toUpperCase()} 🎯
`);

if (result.version === "champion" && percent > 0) {
  // Finn nærmeste challenger for debugging
  let nearest = null;
  let nearestDist = Infinity;
  for (let i = 0; i < 10000; i++) {
    const testId = `test-user-${i}`;
    const testBucket = hashUserId(testId, salt);
    if (testBucket < percent / 100) {
      const dist = Math.abs(testBucket - result.bucket);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = { id: testId, bucket: testBucket };
      }
    }
  }
  if (nearest) {
    console.log(`Nærmeste challenger: ${nearest.id} (bucket: ${(nearest.bucket * 100).toFixed(4)}%)`);
  }
}

console.log(`
📋 Deploy-sjekkliste:
□ 1. PUSH branch: git push origin feat/dark-fleet-phase1
□ 2. Vercel Preview deploy
□ 3. Sett ENABLE_DARK_FLEET=true (kun i Preview)
□ 4. Sett DARK_FLEET_CHALLENGER_PERCENT=1 (kun 1 bruker)
□ 5. Kjør: node scripts/dark-fleet-deploy-prep.mjs "<din-bruker-id>" 1
□ 6. Verifiser at brukeren er "challenger"
□ 7. Start paper trading bot
□ 8. Overvåk 48t — sjekk trading_logs for "trade_version"
□ 9. Go/No-Go: win rate ≥ 50%, drawdown ≤ 15%, error rate ≤ 2%
`);
