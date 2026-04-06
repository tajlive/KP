#!/usr/bin/env node
/**
 * Kaller Edge-funksjonen signal-engine én gang (service role).
 * Oppdaterer bot_health via tidlig upsertHealth i funksjonen.
 *
 *   npm run signals:invoke
 *
 * Krever NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (.env.local).
 */
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

const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!base || !key) {
  console.error(
    "Mangler NEXT_PUBLIC_SUPABASE_URL og/eller SUPABASE_SERVICE_ROLE_KEY (.env.local).",
  );
  process.exit(2);
}

const url = `${base}/functions/v1/signal-engine`;

const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  },
  body: "{}",
});

const text = await res.text();
let json;
try {
  json = JSON.parse(text);
} catch {
  json = { raw: text };
}

console.log(JSON.stringify({ httpStatus: res.status, body: json }, null, 2));

if (!res.ok) {
  console.error("→ signal-engine returnerte ikke 2xx — sjekk Edge-logger i Supabase Dashboard.");
  process.exit(1);
}

console.error(
  "\n→ OK. Kjør npm run signals:health om noen sekunder for oppdatert heartbeat.",
);
process.exit(0);
