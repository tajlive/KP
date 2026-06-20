#!/usr/bin/env node
/**
 * Sync allowlisted env vars from .env.local → GitHub Actions repository secrets (via `gh`).
 *
 * Usage:
 *   npm run secrets:sync:github
 *   npm run secrets:sync:github -- --dry-run
 *
 * Requires: `gh auth login` with repo scope. Does not print secret values.
 *
 * Override repo: GITHUB_REPO=owner/name
 * Override env file: GH_SYNC_ENV_FILE=.env.production.local
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

/** Names referenced by .github/workflows/* — only these are ever sent to GitHub. */
const ALLOWLIST = [
  // Supabase
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_JWT_SECRET",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "POSTGRES_URL_NON_POOLING",
  "DATABASE_URL",
  // Vercel
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  // Cron
  "CRON_SECRET",
  "CRON_API_KEY",
  // Monitoring (GlitchTip)
  "GLITCHTIP_DSN",
  // Services
  "RESEND_API_KEY",
  "STRIPE_SECRET_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
  // Sanity
  "SANITY_API_READ_TOKEN",
  "SANITY_API_WRITE_TOKEN",
  "SANITY_WEBHOOK_SECRET",
  // E2E testing
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "TEST_USER_EMAIL",
  "TEST_USER_PASSWORD",
  "TEST_USER_B_EMAIL",
  "TEST_USER_B_PASSWORD",
  // Misc
  "SNYK_TOKEN",
  "SLACK_WEBHOOK_URL",
];

/** Lokale / personlige nøkler — aldri til repo-secrets via dette scriptet. */
const NEVER_SYNC = new Set(["GITHUB_TOKEN", "GITHUB_PAT", "LINEAR_API_KEY"]);

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run") || argv.includes("-n");
  return { dryRun };
}

function detectRepo() {
  if (process.env.GITHUB_REPO?.includes("/")) {
    return process.env.GITHUB_REPO.trim();
  }
  const r = spawnSync("git", ["remote", "get-url", "origin"], {
    encoding: "utf-8",
    cwd: ROOT,
  });
  if (r.status !== 0 || !r.stdout) {
    return null;
  }
  const url = r.stdout.trim();
  const m =
    url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i) ||
    url.match(/^git@[^:]+:([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!m) return null;
  return `${m[1]}/${m[2]}`;
}

function ghOk() {
  const r = spawnSync("gh", ["auth", "status"], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return r.status === 0;
}

function setSecret(repo, name, value, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] would set ${name}`);
    return true;
  }
  const r = spawnSync("gh", ["secret", "set", name, "--repo", repo], {
    input: value,
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.status !== 0) {
    console.error(`Failed: ${name}: ${(r.stderr || r.stdout || "").trim()}`);
    return false;
  }
  console.log(`OK ${name}`);
  return true;
}

function main() {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const envFile =
    process.env.GH_SYNC_ENV_FILE || path.join(ROOT, ".env.local");

  if (!fs.existsSync(envFile)) {
    console.error(`Missing env file: ${envFile}`);
    process.exit(1);
  }

  dotenv.config({ path: envFile });

  const repo = detectRepo();
  if (!repo) {
    console.error(
      "Could not detect GitHub repo. Set GITHUB_REPO=owner/name or fix git remote origin.",
    );
    process.exit(1);
  }

  if (!ghOk()) {
    console.error("GitHub CLI not logged in. Run: gh auth login");
    process.exit(1);
  }

  console.log(`Repo: ${repo}`);
  console.log(`Source: ${envFile}`);
  if (dryRun) console.log("(dry-run — no secrets written)\n");

  let ok = 0;
  let skip = 0;
  for (const name of ALLOWLIST) {
    if (NEVER_SYNC.has(name)) continue;
    const value = process.env[name];
    if (value === undefined || value === "") {
      skip++;
      continue;
    }
    if (setSecret(repo, name, value, dryRun)) ok++;
    else process.exitCode = 1;
  }

  console.log(
    `\nDone: ${dryRun ? "would set" : "set"} ${ok} secret(s); skipped ${skip} empty key(s) in file.`,
  );
  console.log(`Verify: gh secret list --repo ${repo}`);
}

main();
