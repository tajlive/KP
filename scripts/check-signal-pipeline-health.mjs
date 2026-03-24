#!/usr/bin/env node
/**
 * Laster .env.local / .env fra repo-roten (samme mønster som diagnose-signals-traders.mjs)
 * slik at `npm run signals:health` fungerer uten manuell export.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
for (const rel of [".env.local", ".env"]) {
  const full = path.join(repoRoot, rel);
  if (fs.existsSync(full)) dotenv.config({ path: full });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const maxAgeMinutes = Number(process.env.SIGNAL_HEALTH_MAX_AGE_MINUTES ?? "20");

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(2);
}

if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes <= 0) {
  console.error("SIGNAL_HEALTH_MAX_AGE_MINUTES must be a positive number.");
  process.exit(2);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase
  .from("trading_signals")
  .select("id,created_at,status,symbol,action")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (error) {
  console.error("Failed to fetch latest signal:", error.message);
  process.exit(1);
}

if (!data?.created_at) {
  console.error("No trading signals found in trading_signals.");
  process.exit(1);
}

const createdAtMs = new Date(data.created_at).getTime();
const ageMinutes = (Date.now() - createdAtMs) / 60000;
const stale = ageMinutes > maxAgeMinutes;

const payload = {
  ok: !stale,
  maxAgeMinutes,
  ageMinutes: Number(ageMinutes.toFixed(2)),
  latestSignal: data,
};

if (stale) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
