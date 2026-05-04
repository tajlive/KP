#!/usr/bin/env node
/**
 * 🔥 MCP Smoke Test — v1.0 (2026-05-03)
 * Tester alle MCP-servere konfigurert i ~/.kimi/mcp.json
 * Erstatter run-kimi-mcp-optimized.mjs med ~97% mindre kode.
 */

import { execSync } from "child_process";

const SERVERS = [
  "filesystem",
  "supabase-db",
  "sanity",
  "github",
  "context7",
  "perplexity",
  "mempalace",
];

let passed = 0;
let failed = 0;

console.log("🔥 MCP Smoke Test");
console.log("═════════════════");

for (const server of SERVERS) {
  process.stdout.write(`  ${server} … `);
  try {
    execSync(`kimi mcp test ${server} 2>/dev/null`, {
      timeout: 15000,
      stdio: "pipe",
    });
    console.log("✅");
    passed++;
  } catch {
    console.log("❌");
    failed++;
  }
}

console.log("═════════════════");
console.log(`Resultat: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.log("\nFeilsøking:");
  console.log("  1. Sjekk at ~/.kimi/mcp.json finnes");
  console.log("  2. Sjekk at wrapper-scripts i scripts/run-*-mcp.mjs er kjørbare");
  console.log("  3. Kjør: kimi mcp list");
  process.exit(1);
}

console.log("\n✅ All MCP-servere operative");
process.exit(0);
