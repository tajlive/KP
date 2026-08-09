/**
 * STEG 1: Lagre OKX-nøkler kryptert i user_okx_keys
 * Leser nøkler fra .env.local, krypterer med ENCRYPTION_KEY, lagrer i Supabase.
 * Kjør: node scripts/setup-okx-keys.mjs
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const USER_ID = "0dd08529-b8a8-4fd3-9806-275e2d0135dd"; // Tom
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENC_KEY_HEX = process.env.ENCRYPTION_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ENC_KEY_HEX) {
  console.error("Mangler SUPABASE_URL / SERVICE_ROLE_KEY / ENCRYPTION_KEY");
  process.exit(1);
}

const apiKey = process.env.OKX_API_KEY;
const apiSecret = process.env.OKX_SECRET_KEY;
const passphrase = process.env.OKX_PASSPHRASE;

if (!apiKey || !apiSecret || !passphrase) {
  console.error("Mangler OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE i .env.local");
  process.exit(1);
}

// AES-256-GCM — samme format som src/lib/crypto/encrypt-api-keys.ts
function encrypt(plaintext) {
  const keyData = Buffer.from(ENC_KEY_HEX, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyData, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Web Crypto AES-GCM appender tag til ciphertext — gjør det samme
  const combined = Buffer.concat([iv, encrypted, tag]);
  return combined.toString("base64");
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const row = {
  user_id: USER_ID,
  api_key_encrypted: encrypt(apiKey),
  api_secret_encrypted: encrypt(apiSecret),
  passphrase_encrypted: encrypt(passphrase),
  broker_code: null,
  is_active: true,
  updated_at: new Date().toISOString(),
};

// Upsert — én aktiv nøkkel per bruker
const { data: existing } = await supabase
  .from("user_okx_keys")
  .select("id")
  .eq("user_id", USER_ID)
  .maybeSingle();

let result;
if (existing) {
  result = await supabase.from("user_okx_keys").update(row).eq("id", existing.id).select("id, user_id, is_active");
} else {
  result = await supabase.from("user_okx_keys").insert(row).select("id, user_id, is_active");
}

if (result.error) {
  console.error("❌ FEIL:", result.error.message);
  process.exit(1);
}

console.log("✅ OKX-nøkler lagret kryptert:", JSON.stringify(result.data));

// Verifiser dekryptering rundt-tur
const { data: check } = await supabase
  .from("user_okx_keys")
  .select("api_key_encrypted")
  .eq("user_id", USER_ID)
  .eq("is_active", true)
  .maybeSingle();

function decrypt(b64) {
  const buf = Buffer.from(b64, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(buf.length - 16);
  const ciphertext = buf.subarray(12, buf.length - 16);
  const keyData = Buffer.from(ENC_KEY_HEX, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyData, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

const roundtrip = decrypt(check.api_key_encrypted);
console.log(roundtrip === apiKey ? "✅ Rundt-tur dekryptering OK" : "❌ DEKRYPTERING FEILER");
