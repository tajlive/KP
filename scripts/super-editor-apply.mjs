#!/usr/bin/env node
/**
 * Super Editor Apply Tool
 *
 * Publiserer endringer ETTER bruker-godkjenning.
 * - Kode: git add + commit + push
 * - Sanity: publiserer drafts
 *
 * Bruk:
 *   node scripts/super-editor-apply.mjs [--publish] [--message="editor: beskrivelse"]
 *
 * Flagg:
 *   --publish    Publiser Sanity drafts (uten dette beholdes de som drafts)
 *   --message    Git commit-melding (default: "editor: innholds- og design-endringer")
 */

import { execSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
  const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const shouldPublishSanity = args.includes("--publish");
const messageArg = args.find((a) => a.startsWith("--message="));
const commitMessage = messageArg
  ? messageArg.replace("--message=", "")
  : "editor: innholds- og design-endringer";

// ─── Git: commit + push ───
function commitAndPush() {
  try {
    const status = execSync("git status --short", { cwd: ROOT, encoding: "utf-8" }).trim();
    if (!status) {
      console.log("📦 Ingen kode-endringer å committe.");
      return true;
    }

    console.log("📦 Kode-endringer oppdaget:");
    console.log(status);
    console.log("");

    execSync("git add -A", { cwd: ROOT, stdio: "inherit" });
    execSync(`git commit -m "${commitMessage}"`, { cwd: ROOT, stdio: "inherit" });
    execSync("git push origin main", { cwd: ROOT, stdio: "inherit" });

    console.log("✅ Kode pushet til main.");
    return true;
  } catch (err) {
    console.error("❌ Git-operasjon feilet:", err.message);
    return false;
  }
}

// ─── Sanity: publiser drafts ───
async function publishSanityDrafts() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN;

  if (!projectId || !token) {
    console.warn("⚠️ Sanity ikke konfigurert (mangler NEXT_PUBLIC_SANITY_PROJECT_ID eller SANITY_API_WRITE_TOKEN).");
    return false;
  }

  try {
    // Hent alle drafts
    const query = encodeURIComponent(`*[_id in path("drafts.**")]{_id}`);
    const readUrl = `https://${projectId}.api.sanity.io/v2024-04-07/data/query/${dataset}?query=${query}`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const readJson = await readRes.json();
    const drafts = readJson.result || [];

    if (drafts.length === 0) {
      console.log("🎨 Ingen Sanity drafts å publisere.");
      return true;
    }

    console.log(`🎨 Publiserer ${drafts.length} Sanity draft(s)...`);

    // Publiser hver draft
    const mutations = drafts.map((d) => ({
      delete: { id: d._id },
    }));

    // Sanity sin publish er egentlig å slette draft og la published være oppdatert
    // Men for "createOrReplace"-baserte drafts må vi gjøre en patch på published
    // Så vi bruker transaction API for å patch published med draft-data
    const draftIds = drafts.map((d) => d._id);
    const fetchQuery = encodeURIComponent(
      `*[_id in ${JSON.stringify(draftIds)}]{_id,_type,...}`
    );
    const fetchUrl = `https://${projectId}.api.sanity.io/v2024-04-07/data/query/${dataset}?query=${fetchQuery}`;
    const fetchRes = await fetch(fetchUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const fetchJson = await fetchRes.json();
    const draftDocs = fetchJson.result || [];

    const publishMutations = draftDocs.map((doc) => {
      const publishedId = doc._id.replace("drafts.", "");
      const { _id, ...docWithoutId } = doc;
      return {
        createOrReplace: {
          ...docWithoutId,
          _id: publishedId,
        },
      };
    });

    // Slett drafts etter publishing
    const deleteMutations = draftIds.map((id) => ({ delete: { id } }));

    const allMutations = [...publishMutations, ...deleteMutations];

    const mutateUrl = `https://${projectId}.api.sanity.io/v2024-04-07/data/mutate/${dataset}?returnIds=true`;
    const mutateRes = await fetch(mutateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mutations: allMutations }),
    });

    if (!mutateRes.ok) {
      const errText = await mutateRes.text();
      throw new Error(`Sanity publish failed: ${mutateRes.status} ${errText}`);
    }

    console.log(`✅ ${draftDocs.length} Sanity-dokument(er) publisert.`);
    return true;
  } catch (err) {
    console.error("❌ Sanity-publisering feilet:", err.message);
    return false;
  }
}

// ─── Hovedlogikk ───
async function main() {
  console.log("🚀 Super Editor Apply\n");
  console.log(`Publish Sanity: ${shouldPublishSanity ? "JA" : "NEI (drafts beholdes)"}`);
  console.log(`Git message:    ${commitMessage}\n`);

  const gitOk = commitAndPush();

  let sanityOk = true;
  if (shouldPublishSanity) {
    sanityOk = await publishSanityDrafts();
  }

  if (gitOk && sanityOk) {
    console.log("\n✅ Alle endringer publisert!");
    console.log("   Verifiser i produksjon: https://www.klarpakke.no");
  } else {
    console.log("\n⚠️ Noen operasjoner feilet. Sjekk loggen ovenfor.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
