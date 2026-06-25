#!/usr/bin/env node
/**
 * Automatisk oppsett av Cloudflare Workers Builds for Klarpakke.
 *
 * Kjører Cloudflare Builds REST API for å:
 *   1. Koble GitHub-repoet (tajlive/KP) til Cloudflare
 *   2. Finne Worker-tag for "klarpakke"
 *   3. Opprette eller gjenbruke build token
 *   4. Opprette production + preview triggers
 *   5. Sette nødvendige build-time environment variables
 *   6. Trigge første build
 *
 * Forutsetninger:
 *   - Cloudflare GitHub App er installert (one-time dashboard-steg)
 *   - Et user-scoped API token med:
 *       * Workers Builds Configuration: Edit
 *       * Workers Scripts: Read
 *       * Workers CI Write (for build token)
 *   - CLOUDFLARE_API_TOKEN og CLOUDFLARE_ACCOUNT_ID er satt som env vars
 *
 * Bruk:
 *   CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<id> \
 *     node scripts/setup-workers-builds.mjs
 *
 *   Med env-vars fra .env.local:
 *   --env-file .env.local
 *
 *   Tørrkjøring:
 *   --dry-run
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CF_API = "https://api.cloudflare.com/client/v4";
const GITHUB_API = "https://api.github.com";
const GITHUB_OWNER = "tajlive";
const GITHUB_REPO = "KP";
const WORKER_NAME = "klarpakke";

const PRODUCTION_BRANCH = "main";
const BUILD_COMMAND = "npm run cf:build";
const PROD_DEPLOY_COMMAND = "npm run cf:deploy:ci";
const PREVIEW_DEPLOY_COMMAND = "npx wrangler versions upload";

// Build-time variabler som skal injectes i Workers Builds triggers.
// Verdier hentes fra --env-file eller fra eksisterende env.
const BUILD_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_GLITCHTIP_DSN",
  "GLITCHTIP_DSN",
  "NEXT_PUBLIC_SENTRY_DSN",
  "SENTRY_DSN",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ID_PREMIUM",
  "STRIPE_PRICE_ID_PRO",
  "STRIPE_PRICE_ID_UNLIMITED",
  "VIPPS_CLIENT_ID",
  "VIPPS_CLIENT_SECRET",
  "VIPPS_SUBSCRIPTION_KEY",
  "VIPPS_MERCHANT_SERIAL_NUMBER",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "KV_KLARPAKKE",
];

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const envFileArg = args.find((a) => a.startsWith("--env-file="));
const envFilePath = envFileArg ? envFileArg.split("=")[1] : null;

function log(...parts) {
  console.log("[setup-workers-builds]", ...parts);
}

function logDry(msg) {
  if (DRY_RUN) log("[DRY-RUN]", msg);
}

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const env = {};
  const content = readFileSync(filePath, "utf8");
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1).replace(/\\"/g, '"');
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/\\'/g, "'");
    }
    env[key] = value;
  }
  return env;
}

async function cf(path, opts = {}) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) {
    throw new Error("CLOUDFLARE_API_TOKEN og CLOUDFLARE_ACCOUNT_ID må være satt");
  }

  const url = path.startsWith("http")
    ? path
    : `${CF_API}/accounts/${accountId}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...opts.headers,
    },
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Cloudflare API returnerte ikke JSON: ${res.status} ${text.slice(0, 200)}`);
  }

  if (!res.ok || !data.success) {
    const messages = (data.errors || []).map((e) => `${e.code}: ${e.message}`).join("; ");
    throw new Error(`Cloudflare API feilet (${res.status}): ${messages || text.slice(0, 200)}`);
  }

  return data.result;
}

function getGitHubToken() {
  const fileEnv = envFilePath ? parseEnvFile(resolve(ROOT, envFilePath)) : {};
  // Prioritize explicit env vars set by the caller over potentially stale .env.local values.
  return process.env.GITHUB_TOKEN || process.env.GH_PAT || fileEnv.GH_PAT || null;
}

async function gh(path) {
  const url = `${GITHUB_API}${path}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "klarpakke-setup-workers-builds",
  };
  const token = getGitHubToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API feilet (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function verifyToken() {
  log("Verifiserer API-token...");
  try {
    // /builds/tokens krever user-scoped token og er en billig sanity-check.
    await cf("/builds/tokens", { method: "GET" });
    log("✅ API-token ser ut til å fungere med Builds API");
  } catch (err) {
    if (err.message.includes("Invalid token") || err.message.includes("10000")) {
      throw new Error(
        "API-tokenet er ikke gyldig for Builds API. Sørg for at det er et user-scoped token " +
          "med permission: Workers Builds Configuration (Edit), Workers Scripts (Read), Workers CI Write. " +
          "Account-scoped tokens støttes ikke."
      );
    }
    throw err;
  }
}

async function getGitHubRepoInfo() {
  log("Henter GitHub repo-info...");
  const [owner, repo] = await Promise.all([
    gh(`/users/${GITHUB_OWNER}`),
    gh(`/repos/${GITHUB_OWNER}/${GITHUB_REPO}`),
  ]);
  return {
    providerAccountId: String(owner.id),
    providerAccountName: owner.login,
    repoId: String(repo.id),
    repoName: repo.name,
    defaultBranch: repo.default_branch || PRODUCTION_BRANCH,
  };
}

async function getOrCreateRepoConnection(repoInfo, workerTag) {
  log("Sjekker eksisterende repo-tilkoblinger via triggers...");
  const triggers = await getTriggers(workerTag);
  const existingTrigger = triggers.find(
    (t) =>
      t.repo_connection?.provider_type === "github" &&
      t.repo_connection?.provider_account_id === repoInfo.providerAccountId &&
      t.repo_connection?.repo_id === repoInfo.repoId
  );

  if (existingTrigger) {
    const uuid = existingTrigger.repo_connection.repo_connection_uuid;
    log("✅ Fant eksisterende repo-tilkobling:", uuid);
    return uuid;
  }

  throw new Error(
    "Cloudflare GitHub App ser ikke ut til å være installert for dette repoet. " +
      "Gå til Cloudflare Dashboard → Workers & Pages → klarpakke → Settings → Builds → Connect → GitHub, " +
      "og installer Cloudflare Workers and Pages GitHub App for tajlive/KP. " +
      "Deretter kan du kjøre dette scriptet på nytt."
  );
}

async function getWorkerTag() {
  log("Henter Worker tag for", WORKER_NAME, "...");
  const scripts = await cf("/workers/scripts", { method: "GET" });
  const worker = (scripts || []).find((s) => s.id === WORKER_NAME);
  if (!worker?.tag) {
    throw new Error(`Finner ikke Worker "${WORKER_NAME}" eller den mangler tag.`);
  }
  log("✅ Worker tag:", worker.tag);
  return worker.tag;
}

async function getOrCreateBuildToken() {
  log("Sjekker build tokens...");
  const tokens = await cf("/builds/tokens", { method: "GET" });

  const usable = (tokens || []).find(
    (t) => t.owner_type === "user" && t.build_token_name?.includes("Workers Builds")
  );

  if (usable) {
    log("✅ Bruker eksisterende build token:", usable.build_token_uuid);
    return usable.build_token_uuid;
  }

  if ((tokens || []).length > 0) {
    const first = tokens[0];
    log("⚠️  Bruker første tilgjengelige build token:", first.build_token_uuid);
    return first.build_token_uuid;
  }

  if (DRY_RUN) {
    logDry("Ville opprettet build token");
    return "dry-run-build-token-uuid";
  }

  log("Oppretter ny build token...");
  const created = await cf("/builds/tokens", {
    method: "POST",
    body: JSON.stringify({
      build_token_name: `Workers Builds - ${WORKER_NAME}`,
      build_token_secret: randomUUID(),
      cloudflare_token_id: randomUUID(),
    }),
  });
  log("✅ Opprettet build token:", created.build_token_uuid);
  return created.build_token_uuid;
}

async function getTriggers(workerTag) {
  const list = await cf(`/builds/workers/${workerTag}/triggers`, { method: "GET" });
  return list || [];
}

async function createTrigger(workerTag, repoConnectionUuid, buildTokenUuid, name, branchIncludes, branchExcludes, deployCommand) {
  if (DRY_RUN) {
    logDry(`Ville opprettet trigger: ${name}`);
    return { trigger_uuid: `dry-run-${name.replace(/\s+/g, "-").toLowerCase()}-uuid` };
  }

  log(`Oppretter trigger: ${name} ...`);
  const trigger = await cf("/builds/triggers", {
    method: "POST",
    body: JSON.stringify({
      external_script_id: workerTag,
      repo_connection_uuid: repoConnectionUuid,
      build_token_uuid: buildTokenUuid,
      trigger_name: name,
      build_command: BUILD_COMMAND,
      deploy_command: deployCommand,
      root_directory: "/",
      branch_includes: branchIncludes,
      branch_excludes: branchExcludes,
      path_includes: ["*"],
      path_excludes: [],
      build_caching_enabled: true,
    }),
  });
  log("✅ Trigger opprettet:", trigger.trigger_uuid);
  return trigger;
}

async function updateTrigger(trigger, expectedBuildCommand, expectedDeployCommand) {
  const needsUpdate =
    trigger.build_command !== expectedBuildCommand ||
    trigger.deploy_command !== expectedDeployCommand ||
    !trigger.build_caching_enabled;

  if (!needsUpdate) {
    return trigger;
  }

  if (DRY_RUN) {
    logDry(`Ville oppdatert trigger: ${trigger.trigger_name}`);
    return { ...trigger, build_command: expectedBuildCommand, deploy_command: expectedDeployCommand, build_caching_enabled: true };
  }

  log(`Oppdaterer trigger: ${trigger.trigger_name} ...`);
  const updated = await cf(`/builds/triggers/${trigger.trigger_uuid}`, {
    method: "PATCH",
    body: JSON.stringify({
      build_command: expectedBuildCommand,
      deploy_command: expectedDeployCommand,
      build_caching_enabled: true,
    }),
  });
  log("✅ Trigger oppdatert:", updated.trigger_uuid);
  return updated;
}

async function ensureTriggers(workerTag, repoConnectionUuid, buildTokenUuid, defaultBranch) {
  const existing = await getTriggers(workerTag);

  let production = existing.find(
    (t) => t.branch_includes?.includes(defaultBranch) && !t.branch_excludes?.includes(defaultBranch)
  );
  let preview = existing.find(
    (t) => t.branch_includes?.includes("*") && t.branch_excludes?.includes(defaultBranch)
  );

  if (!production) {
    production = await createTrigger(
      workerTag,
      repoConnectionUuid,
      buildTokenUuid,
      "Deploy production",
      [defaultBranch],
      [],
      PROD_DEPLOY_COMMAND
    );
  } else {
    log("Found existing production trigger:", production.trigger_uuid);
    production = await updateTrigger(production, BUILD_COMMAND, PROD_DEPLOY_COMMAND);
  }

  if (!preview) {
    preview = await createTrigger(
      workerTag,
      repoConnectionUuid,
      buildTokenUuid,
      "Deploy preview branches",
      ["*"],
      [defaultBranch],
      PREVIEW_DEPLOY_COMMAND
    );
  } else {
    log("Found existing preview trigger:", preview.trigger_uuid);
    preview = await updateTrigger(preview, BUILD_COMMAND, PREVIEW_DEPLOY_COMMAND);
  }

  return { production, preview };
}

function collectBuildEnv() {
  const fileEnv = envFilePath ? parseEnvFile(resolve(ROOT, envFilePath)) : {};
  const collected = {};

  for (const key of BUILD_ENV_KEYS) {
    const value = fileEnv[key] || process.env[key];
    if (value) {
      collected[key] = { value, is_secret: key.toLowerCase().includes("secret") || key.toLowerCase().includes("key") || key.toLowerCase().includes("token") || key.toLowerCase().includes("password") };
    }
  }

  // APP_URL skal alltid peke til prod dersom den ikke er satt
  if (!collected["NEXT_PUBLIC_APP_URL"] && !process.env.NEXT_PUBLIC_APP_URL && !fileEnv["NEXT_PUBLIC_APP_URL"]) {
    collected["NEXT_PUBLIC_APP_URL"] = { value: "https://www.klarpakke.no", is_secret: false };
  }

  return collected;
}

async function setTriggerEnv(triggerUuid, envVars) {
  if (Object.keys(envVars).length === 0) {
    log("Ingen build-time env vars å sette");
    return;
  }

  if (DRY_RUN) {
    logDry(`Ville satt ${Object.keys(envVars).length} env vars på trigger ${triggerUuid}`);
    return;
  }

  log(`Setter ${Object.keys(envVars).length} env vars på trigger ${triggerUuid}...`);
  await cf(`/builds/triggers/${triggerUuid}/environment_variables`, {
    method: "PATCH",
    body: JSON.stringify(envVars),
  });
  log("✅ Env vars satt");
}

async function triggerBuild(triggerUuid, branch) {
  if (DRY_RUN) {
    logDry(`Ville trigget build på branch ${branch}`);
    return { build_uuid: "dry-run-build-uuid" };
  }

  log(`Triggrer første build på branch ${branch}...`);
  const build = await cf(`/builds/triggers/${triggerUuid}/builds`, {
    method: "POST",
    body: JSON.stringify({ branch }),
  });
  log("✅ Build trigget:", build.build_uuid);
  return build;
}

async function main() {
  log("Starter automatisk oppsett av Cloudflare Workers Builds");
  if (DRY_RUN) log("🔍 DRY-RUN modus — ingen endringer gjøres");

  await verifyToken();
  const repoInfo = await getGitHubRepoInfo();
  const workerTag = await getWorkerTag();
  const repoConnectionUuid = await getOrCreateRepoConnection(repoInfo, workerTag);
  const buildTokenUuid = await getOrCreateBuildToken();
  const { production, preview } = await ensureTriggers(workerTag, repoConnectionUuid, buildTokenUuid, repoInfo.defaultBranch);

  const buildEnv = collectBuildEnv();
  await setTriggerEnv(production.trigger_uuid, buildEnv);

  // For preview holder vi env minimalt for å unngå å eksponere prod-secrets i preview URL-er.
  const previewEnv = {};
  if (buildEnv["NEXT_PUBLIC_APP_URL"]) {
    previewEnv["NEXT_PUBLIC_APP_URL"] = { value: "https://www.klarpakke.no", is_secret: false };
  }
  await setTriggerEnv(preview.trigger_uuid, previewEnv);

  const build = await triggerBuild(production.trigger_uuid, repoInfo.defaultBranch);

  log("");
  log("🎉 Oppsett fullført!");
  log("   Production trigger:", production.trigger_uuid);
  log("   Første build:", build.build_uuid);
  log("");
  log("Fremtidige pushes til", repoInfo.defaultBranch, "vil nå automatisk bygge og deploye via Cloudflare Workers Builds.");
}

main().catch((err) => {
  console.error("❌", err.message);
  if (err.message.includes("user-scoped")) {
    console.error("");
    console.error("Opprett et user-scoped token her: https://dash.cloudflare.com/profile/api-tokens");
    console.error("Required permissions: Workers Builds Configuration (Edit), Workers Scripts (Read), Workers CI Write");
  }
  process.exit(1);
});
