#!/usr/bin/env node
/**
 * Lagrer Toms Kraken-nøkler kryptert i user_kraken_keys.
 * Bruker samme AES-GCM-modul som produksjon (encrypt-api-keys.ts).
 * Kjør: node --experimental-json-modules ... — eller via tsx.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load .env.local
const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const USER_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd";
const API_KEY = "iK7VuZlXdvy1mQ6ky+4wJYF8v8wnsLyaaDGmv70KgymuuKkBAbbfn3Lh";
const API_SECRET = "Sm2LyPYj4udRXEdoKQDNndq1icvCCk5h85DpZoIAhVCa6oLT28bU1A3M0+S4Hp104q53NvOuFfoS2zsqe3nkSQ==";

process.env.ENCRYPTION_KEY = env.ENCRYPTION_KEY;

// Web Crypto encrypt — samme som src/lib/crypto/encrypt-api-keys.ts
async function encrypt(plaintext) {
  const keyData = Buffer.from(env.ENCRYPTION_KEY, "hex");
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return Buffer.from(combined).toString("base64");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const encKey = await encrypt(API_KEY);
const encSecret = await encrypt(API_SECRET);

const { data, error } = await supabase.from("user_kraken_keys").upsert(
  {
    user_id: USER_ID,
    api_key_encrypted: encKey,
    api_secret_encrypted: encSecret,
    is_active: true,
    last_validated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" },
);

if (error) {
  console.error("FEIL:", error.message);
  process.exit(1);
}
console.log("✅ Nøkler lagret kryptert (AES-GCM) for", USER_ID);
