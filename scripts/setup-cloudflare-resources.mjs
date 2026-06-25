#!/usr/bin/env node
/**
 * Idempotent setup script for Cloudflare resources needed by Klarpakke:
 * - R2 bucket for OpenNext incremental cache
 * - D1 database for OpenNext tag cache
 * - Cloudflare Images account hash detection
 *
 * The script updates wrangler.jsonc bindings and appends placeholders to
 * .env.local. Run it after granting CLOUDFLARE_API_TOKEN the following
 * permissions: Account > Cloudflare R2 Storage > Edit,
 * Account > Cloudflare D1 > Edit, Account > Cloudflare Images > Edit.
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { parse, stringify } from "comment-json";

const R2_BUCKET_NAME = "klarpakke-incremental-cache";
const D1_DB_NAME = "klarpakke-tag-cache";
const WORKER_NAME = "klarpakke";
const ENABLE_R2_CACHE_VAR = "OPENNEXT_ENABLE_R2_CACHE";

const ENV_PATH = path.resolve(".env.local");
const WRANGLER_PATH = path.resolve("wrangler.jsonc");

function exit(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    exit(".env.local finnes ikke");
  }
  const content = await readFile(ENV_PATH, "utf-8");
  const token = content.match(/^CLOUDFLARE_API_TOKEN=(.+)$/m)?.[1]?.trim();
  const accountId = content.match(/^CLOUDFLARE_ACCOUNT_ID=(.+)$/m)?.[1]?.trim();
  if (!token) exit("CLOUDFLARE_API_TOKEN mangler i .env.local");
  if (!accountId) exit("CLOUDFLARE_ACCOUNT_ID mangler i .env.local");
  return { token, accountId, content };
}

function createCfClient(token, accountId) {
  const base = `https://api.cloudflare.com/client/v4/accounts/${accountId}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  return async function cf(endpoint, opts = {}) {
    const res = await fetch(`${base}${endpoint}`, { ...opts, headers });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  };
}

async function ensureR2Bucket(cf) {
  console.log("🪣 Sjekker R2-buckets...");
  const list = await cf("/r2/buckets");
  if (!list.ok) {
    exit(`Kunne ikke liste R2-buckets: ${JSON.stringify(list.json?.errors)}`);
  }
  const exists = list.json.result?.buckets?.some((b) => b.name === R2_BUCKET_NAME);
  if (exists) {
    console.log(`   Bucket '${R2_BUCKET_NAME}' finnes allerede.`);
    return;
  }
  console.log(`   Oppretter R2-bucket '${R2_BUCKET_NAME}'...`);
  const create = await cf("/r2/buckets", {
    method: "POST",
    body: JSON.stringify({ name: R2_BUCKET_NAME }),
  });
  if (!create.ok) {
    exit(`Kunne ikke opprette R2-bucket: ${JSON.stringify(create.json?.errors)}`);
  }
  console.log("   ✅ R2-bucket opprettet.");
}

async function ensureD1Database(cf) {
  console.log("🗄️  Sjekker D1-databaser...");
  const list = await cf("/d1/database");
  if (!list.ok) {
    exit(`Kunne ikke liste D1-databaser: ${JSON.stringify(list.json?.errors)}`);
  }
  const existing = list.json.result?.find((db) => db.name === D1_DB_NAME);
  if (existing) {
    console.log(`   Database '${D1_DB_NAME}' finnes allerede (${existing.uuid}).`);
    return existing.uuid;
  }
  console.log(`   Oppretter D1-database '${D1_DB_NAME}'...`);
  const create = await cf("/d1/database", {
    method: "POST",
    body: JSON.stringify({ name: D1_DB_NAME }),
  });
  if (!create.ok) {
    exit(`Kunne ikke opprette D1-database: ${JSON.stringify(create.json?.errors)}`);
  }
  const uuid = create.json.result?.uuid;
  console.log(`   ✅ D1-database opprettet (${uuid}).`);
  return uuid;
}

async function detectImagesAccountHash(cf) {
  console.log("🖼️  Sjekker Cloudflare Images-konfigurasjon...");
  const res = await cf("/images/v1/config");
  if (!res.ok) {
    console.log("   ⚠️  Kunne ikke hente Images-konfigurasjon (token har kanskje ikke Images-rettigheter).");
    return null;
  }
  const hash = res.json.result?.account_hash || res.json.result?.hash;
  if (hash) {
    console.log(`   ✅ Images account hash funnet.`);
  }
  return hash || null;
}

async function updateWranglerJsonc(d1DatabaseId) {
  console.log("📝 Oppdaterer wrangler.jsonc...");
  const content = await readFile(WRANGLER_PATH, "utf-8");
  const config = parse(content);

  config.r2_buckets = config.r2_buckets || [];
  if (!config.r2_buckets.some((b) => b.binding === "NEXT_INC_CACHE_R2_BUCKET")) {
    config.r2_buckets.push({ binding: "NEXT_INC_CACHE_R2_BUCKET", bucket_name: R2_BUCKET_NAME });
    console.log("   + R2 binding NEXT_INC_CACHE_R2_BUCKET");
  } else {
    console.log("   = R2 binding fantes allerede");
  }

  config.d1_databases = config.d1_databases || [];
  const existingD1 = config.d1_databases.find((b) => b.binding === "NEXT_TAG_CACHE_D1");
  if (!existingD1) {
    config.d1_databases.push({
      binding: "NEXT_TAG_CACHE_D1",
      database_name: D1_DB_NAME,
      database_id: d1DatabaseId,
    });
    console.log("   + D1 binding NEXT_TAG_CACHE_D1");
  } else {
    existingD1.database_id = d1DatabaseId;
    console.log("   = D1 binding oppdatert");
  }

  config.services = config.services || [];
  if (!config.services.some((s) => s.binding === "WORKER_SELF_REFERENCE")) {
    config.services.push({ binding: "WORKER_SELF_REFERENCE", service: WORKER_NAME });
    console.log("   + Service binding WORKER_SELF_REFERENCE");
  } else {
    console.log("   = Service binding fantes allerede");
  }

  await writeFile(WRANGLER_PATH, stringify(config, null, 2) + "\n");
  console.log("   ✅ wrangler.jsonc lagret.");
}

async function updateEnvLocal(imagesAccountHash) {
  console.log("🔧 Oppdaterer .env.local...");
  let content = await readFile(ENV_PATH, "utf-8");
  const additions = [];

  if (!content.includes("CLOUDFLARE_IMAGES_ACCOUNT_HASH")) {
    if (imagesAccountHash) {
      additions.push(`CLOUDFLARE_IMAGES_ACCOUNT_HASH=${imagesAccountHash}`);
    } else {
      additions.push(
        "# CLOUDFLARE_IMAGES_ACCOUNT_HASH=<lim_inn_fra_cloudflare_dashboard_images_section>"
      );
    }
  }

  if (!content.includes(ENABLE_R2_CACHE_VAR)) {
    additions.push(`${ENABLE_R2_CACHE_VAR}=true`);
  }

  if (additions.length === 0) {
    console.log("   = Ingen nye env-variabler nødvendig.");
    return;
  }

  content = content.replace(/\n+$/, "") + "\n\n# Cloudflare optimization resources (auto-configured)\n";
  content += additions.join("\n") + "\n";
  await writeFile(ENV_PATH, content);
  console.log("   ✅ .env.local oppdatert.");
}

async function getWorkerTag(cf) {
  console.log("🔍 Henter Worker tag...");
  const res = await cf("/workers/scripts");
  if (!res.ok) {
    exit(`Kunne ikke liste Workers: ${JSON.stringify(res.json?.errors)}`);
  }
  const worker = res.json.result?.find((w) => w.id === WORKER_NAME);
  if (!worker?.tag) {
    exit(`Fant ikke Worker '${WORKER_NAME}' eller mangler tag.`);
  }
  console.log(`   Worker tag: ${worker.tag}`);
  return worker.tag;
}

async function getTriggers(cf, workerTag) {
  console.log("🔍 Henter Workers Builds triggers...");
  const res = await cf(`/builds/workers/${workerTag}/triggers`);
  if (!res.ok) {
    exit(`Kunne ikke liste triggers: ${JSON.stringify(res.json?.errors)}`);
  }
  const triggers = res.json.result || [];
  if (triggers.length === 0) {
    exit("Ingen triggers funnet. Kjør setup-workers-builds.mjs først.");
  }
  console.log(`   Fant ${triggers.length} trigger(s).`);
  return triggers;
}

async function enableR2CacheOnTriggers(cf, triggers) {
  console.log("🚀 Aktiverer R2-cache på triggers...");
  for (const trigger of triggers) {
    const res = await cf(`/builds/triggers/${trigger.trigger_uuid}/environment_variables`, {
      method: "PATCH",
      body: JSON.stringify({
        [ENABLE_R2_CACHE_VAR]: { value: "true", is_secret: false },
      }),
    });
    if (!res.ok) {
      exit(
        `Kunne ikke sette env-var på trigger ${trigger.trigger_name}: ${JSON.stringify(
          res.json?.errors
        )}`
      );
    }
    console.log(`   ✅ ${trigger.trigger_name}: ${ENABLE_R2_CACHE_VAR}=true`);
  }
}

async function main() {
  console.log("[setup-cloudflare-resources] Starter oppsett av Cloudflare-ressurser\n");
  const { token, accountId } = await loadEnv();
  const cf = createCfClient(token, accountId);

  await ensureR2Bucket(cf);
  const d1DatabaseId = await ensureD1Database(cf);
  const imagesAccountHash = await detectImagesAccountHash(cf);

  await updateWranglerJsonc(d1DatabaseId);
  await updateEnvLocal(imagesAccountHash);

  const workerTag = await getWorkerTag(cf);
  const triggers = await getTriggers(cf, workerTag);
  await enableR2CacheOnTriggers(cf, triggers);

  console.log("\n✅ Oppsett fullført.");
  if (!imagesAccountHash) {
    console.log(
      "\n⚠️  Husk å lime inn CLOUDFLARE_IMAGES_ACCOUNT_HASH i .env.local fra Cloudflare Dashboard → Images."
    );
  }
  console.log("\nNeste steg:");
  console.log("  1. Commit endringene i wrangler.jsonc og .env.local");
  console.log("  2. Push til main for å trigge ny deploy med R2-cache aktivert");
  console.log("  3. Verifiser med: curl https://www.klarpakke.no/api/health");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
