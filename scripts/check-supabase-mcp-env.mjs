#!/usr/bin/env node
/**
 * Verifiserer at .env.local gir SUPABASE_ACCESS_TOKEN til Supabase MCP-wrapper (ingen hemmelighet skrives ut).
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

if (!existsSync(envPath)) {
  console.error("❌ Mangler .env.local i prosjektrot:", envPath);
  process.exit(1);
}

let token = process.env.SUPABASE_ACCESS_TOKEN;
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0 && t.slice(0, eq).trim() === "SUPABASE_ACCESS_TOKEN") {
    let v = t.slice(eq + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\"/g, '"');
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1).replace(/\\'/g, "'");
    token = v;
    break;
  }
}

if (!token || token === "sbp_your_supabase_token_here") {
  console.error("❌ SUPABASE_ACCESS_TOKEN ikke satt eller placeholder i .env.local");
  process.exit(1);
}

console.log("✅ SUPABASE_ACCESS_TOKEN funnet i .env.local (lengde:", token.length, "tegn)");
process.exit(0);
