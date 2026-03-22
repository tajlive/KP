#!/usr/bin/env node
/**
 * Synkroniser Supabase URL + anon + service_role inn i .env.local via Management API.
 *
 * Krever (én av):
 *   - SUPABASE_ACCESS_TOKEN (PAT fra https://supabase.com/dashboard/account/tokens)
 *   - Og project ref: SUPABASE_PROJECT_REF eller NEXT_PUBLIC_SUPABASE_URL (https://xxxx.supabase.co)
 *
 * Bruk:
 *   npm run env:sync:supabase
 *   npm run env:sync:supabase:verify   # + create-test-users --check-env
 *
 * Skriver aldri hemmeligheter til stdout (kun masket bekreftelse).
 */
import dotenv from "dotenv";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = process.cwd();
const ENV_LOCAL = resolve(REPO_ROOT, ".env.local");

const ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development.local",
  ".env.production.local",
];

function loadRepositoryEnv() {
  for (const name of ENV_FILES) {
    const full = resolve(REPO_ROOT, name);
    if (!existsSync(full)) continue;
    try {
      const parsed = dotenv.parse(readFileSync(full, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        const cur = process.env[key];
        if (cur === undefined || cur === "") {
          process.env[key] = value;
        }
      }
    } catch (e) {
      console.warn(`⚠️  Kunne ikke lese ${name}:`, e?.message ?? e);
    }
  }
}

function mask(s) {
  if (!s || s.length < 16) return "(tom)";
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

/** JWT payload.role uten verifisering (kun for å skille anon / service_role). */
function jwtRole(jwt) {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const json = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

function extractProjectRefFromUrl(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

function upsertEnvLocal(updates) {
  const keysToSet = new Set(Object.keys(updates));
  let lines = [];
  if (existsSync(ENV_LOCAL)) {
    lines = readFileSync(ENV_LOCAL, "utf8").split("\n");
  }

  const seen = new Set();
  const out = [];

  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && keysToSet.has(m[1])) {
      const v = updates[m[1]];
      out.push(`${m[1]}=${v}`);
      seen.add(m[1]);
    } else {
      out.push(line);
    }
  }

  for (const k of keysToSet) {
    if (!seen.has(k)) {
      out.push(`${k}=${updates[k]}`);
    }
  }

  writeFileSync(ENV_LOCAL, out.join("\n").replace(/\n+$/, "\n"));
}

async function main() {
  loadRepositoryEnv();

  const token = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
  let ref = (process.env.SUPABASE_PROJECT_REF || "").trim();
  if (!ref) {
    ref =
      extractProjectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || "") ||
      extractProjectRefFromUrl(process.env.SUPABASE_URL || "") ||
      "";
  }

  if (!token) {
    console.error("❌ Mangler SUPABASE_ACCESS_TOKEN");
    console.error(
      "   Opprett PAT: https://supabase.com/dashboard/account/tokens",
    );
    console.error(
      "   Alternativt: synk fra Vercel med nøkler allerede lagret → npm run vercel:env",
    );
    process.exit(1);
  }

  if (!ref) {
    console.error("❌ Mangler project ref (SUPABASE_PROJECT_REF eller NEXT_PUBLIC_SUPABASE_URL)");
    process.exit(1);
  }

  const url = `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/api-keys?reveal=true`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`❌ Management API ${res.status}: ${body.slice(0, 500)}`);
    console.error(
      "   Sjekk at PAT har tilgang til prosjektet og at «reveal» er tillatt for kontoen.",
    );
    process.exit(1);
  }

  /** @type {unknown} */
  const data = await res.json();
  if (!Array.isArray(data)) {
    console.error("❌ Uventet svar fra api-keys (forventet array)");
    process.exit(1);
  }

  let anon = "";
  let service = "";

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const apiKey = row.api_key;
    if (typeof apiKey !== "string" || !apiKey.startsWith("eyJ")) continue;
    const role = jwtRole(apiKey);
    if (role === "anon") anon = apiKey;
    if (role === "service_role") service = apiKey;
  }

  if (!anon || !service) {
    console.error("❌ Fant ikke både anon og service_role JWT i api-keys-svaret.");
    console.error(
      "   Nye prosjekter kan bruke andre nøkkeltyper — bruk Dashboard → Settings → API eller vercel env pull.",
    );
    process.exit(1);
  }

  const publicUrl = `https://${ref}.supabase.co`;

  if (!existsSync(ENV_LOCAL)) {
    writeFileSync(
      ENV_LOCAL,
      `# Generert av npm run env:sync:supabase — ikke commit\n`,
    );
  }

  upsertEnvLocal({
    NEXT_PUBLIC_SUPABASE_URL: publicUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
  });

  console.log("✅ Oppdatert .env.local (masket):");
  console.log(`   NEXT_PUBLIC_SUPABASE_URL=${publicUrl}`);
  console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY=${mask(anon)}`);
  console.log(`   SUPABASE_SERVICE_ROLE_KEY=${mask(service)}`);
  console.log("");
  console.log("   Neste: npm run test:e2e:check-env  eller  npm run test:e2e:prepare");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
