#!/usr/bin/env node
/**
 * Synkroniser Supabase URL + legacy og moderne API-nøkler via Management API.
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
function parseArgs(argv) {
  const args = {
    envFile: resolve(REPO_ROOT, ".env.local"),
    runtimeOnly: false,
    managementOnly: false,
  };

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env-path" || argv[i] === "-e") {
      args.envFile = resolve(REPO_ROOT, argv[++i]);
    } else if (argv[i] === "--runtime-only") {
      args.runtimeOnly = true;
    } else if (argv[i] === "--management-only") {
      args.managementOnly = true;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));

/** Samme prioritering som create-test-users.js / playwright.config (siste fil vinner). */
function loadRepositoryEnv() {
  const fillMissingOnly = [".env.production.local"];
  const overwriteChain = [
    ".env",
    ".env.development",
    ".env.local",
    ".env.development.local",
  ];

  for (const name of fillMissingOnly) {
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

  for (const name of overwriteChain) {
    const full = resolve(REPO_ROOT, name);
    if (!existsSync(full)) continue;
    try {
      const parsed = dotenv.parse(readFileSync(full, "utf8"));
      for (const [key, value] of Object.entries(parsed)) {
        process.env[key] = value;
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

function updateEnvFile(envFile, updates, removeKeys = []) {
  const keysToSet = new Set(Object.keys(updates));
  const keysToRemove = new Set(removeKeys);
  let lines = [];
  if (existsSync(envFile)) {
    lines = readFileSync(envFile, "utf8").split("\n");
  }

  const seen = new Set();
  const outputKeys = new Set();
  const out = [];

  for (const line of lines) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m && keysToRemove.has(m[1])) {
      continue;
    }
    if (m && keysToSet.has(m[1])) {
      if (seen.has(m[1])) continue;
      const v = updates[m[1]];
      out.push(`${m[1]}=${v}`);
      seen.add(m[1]);
      outputKeys.add(m[1]);
    } else if (m && outputKeys.has(m[1])) {
      continue;
    } else {
      out.push(line);
      if (m) outputKeys.add(m[1]);
    }
  }

  for (const k of keysToSet) {
    if (!seen.has(k)) {
      out.push(`${k}=${updates[k]}`);
    }
  }

  writeFileSync(envFile, out.join("\n").replace(/\n+$/, "\n"));
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
    console.error("❌ Mangler SUPABASE_ACCESS_TOKEN (Supabase PAT)");
    console.error("");
    console.error(
      "   1) Opprett token: https://supabase.com/dashboard/account/tokens",
    );
    console.error(
      "   2) Legg én linje i .env.local (gitignored, ikke commit):",
    );
    console.error("      SUPABASE_ACCESS_TOKEN=sbp_...");
    console.error("");
    console.error(
      "   3) Kjør igjen: npm run env:sync:supabase:verify",
    );
    console.error("");
    console.error(
      "   Uten å lagre i fil (én gang):",
    );
    console.error(
      "   SUPABASE_ACCESS_TOKEN=sbp_... npm run env:sync:supabase:verify",
    );
    console.error("");
    console.error(
      "   Uten PAT: kopier «anon public» manuelt fra Dashboard → Project Settings → API",
    );
    console.error(
      "   (eller npm run vercel:env hvis Vercel allerede har riktige nøkler)",
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
  let publishable = "";
  let secret = "";

  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const apiKey = row.api_key;
    if (typeof apiKey !== "string") continue;
    if (apiKey.startsWith("eyJ")) {
      const role = jwtRole(apiKey);
      if (role === "anon") anon = apiKey;
      if (role === "service_role") service = apiKey;
    }
    if (row.type === "publishable" && apiKey.startsWith("sb_publishable_")) {
      publishable = apiKey;
    }
    if (row.type === "secret" && apiKey.startsWith("sb_secret_")) {
      secret = apiKey;
    }
  }

  if (!anon || !service || !publishable || !secret) {
    console.error(
      "❌ Fant ikke anon, service_role, publishable og secret i api-keys-svaret.",
    );
    process.exit(1);
  }

  const publicUrl = `https://${ref}.supabase.co`;

  if (!existsSync(args.envFile)) {
    writeFileSync(
      args.envFile,
      `# Generert av npm run env:sync:supabase — ikke commit\n`,
    );
  }

  const runtimeUpdates = {
    NEXT_PUBLIC_SUPABASE_URL: publicUrl,
    SUPABASE_URL: publicUrl,
    SUPABASE_PROJECT_REF: ref,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_PUBLISHABLE_KEY: publishable,
    SUPABASE_SECRET_KEY: secret,
    SUPABASE_SERVICE_ROLE_KEY: service,
  };

  const updates = args.managementOnly
    ? {
        SUPABASE_PROJECT_REF: ref,
        SUPABASE_ACCESS_TOKEN: token,
      }
    : runtimeUpdates;

  updateEnvFile(
    args.envFile,
    updates,
    args.runtimeOnly
      ? ["SUPABASE_ACCESS_TOKEN"]
      : args.managementOnly
        ? []
        : ["VIPPS_CLIENT_ID", "VIPPS_CLIENT_SECRET"],
  );

  console.log(`✅ Oppdatert ${args.envFile} (masket):`);
  if (args.managementOnly) {
    console.log(`   SUPABASE_PROJECT_REF=${ref}`);
    console.log(`   SUPABASE_ACCESS_TOKEN=${mask(token)}`);
  } else {
    console.log(`   NEXT_PUBLIC_SUPABASE_URL=${publicUrl}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY=${mask(anon)}`);
    console.log(`   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${mask(publishable)}`);
    console.log(`   SUPABASE_SECRET_KEY=${mask(secret)}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY=${mask(service)}`);
  }
  console.log("");
  console.log("   Neste: npm run test:e2e:check-env  eller  npm run test:e2e:prepare");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
