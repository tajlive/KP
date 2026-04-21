#!/usr/bin/env node
/**
 * Super Editor Changeset Tool
 *
 * Genererer en rapport over endringer (kode + Sanity + screenshots).
 * Brukes av super-editor-agenten før bruker-godkjenning.
 *
 * Bruk:
 *   node scripts/super-editor-changeset.mjs [--title="Min endring"]
 *
 * Output: .changeset/<timestamp>/REPORT.md
 */

import { execSync } from "node:child_process";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const titleArg = args.find((a) => a.startsWith("--title="));
const title = titleArg ? titleArg.replace("--title=", "") : "Endringsforslag";

// ─── Hent git diff ───
function getGitDiff() {
  try {
    return execSync("git diff --stat", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "(ingen git diff tilgjengelig)";
  }
}

function getGitDiffDetailed() {
  try {
    return execSync("git diff", { cwd: ROOT, encoding: "utf-8" }).trim();
  } catch {
    return "";
  }
}

// ─── Hent Sanity drafts (hvis token finnes) ───
async function getSanityDrafts() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_READ_TOKEN;

  if (!projectId || !token) {
    return null; // Sanity ikke konfigurert for denne kjøringen
  }

  try {
    const query = encodeURIComponent(`*[_id in path("drafts.**")]{_id,_type,_updatedAt}`);
    const url = `https://${projectId}.api.sanity.io/v2024-04-07/data/query/${dataset}?query=${query}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return json.result || [];
  } catch (err) {
    console.warn("[Changeset] Kunne ikke hente Sanity drafts:", err.message);
    return null;
  }
}

// ─── Finn screenshots ───
async function findScreenshots(changesetDir) {
  try {
    const files = await readdir(changesetDir);
    return files
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => join(changesetDir, f));
  } catch {
    return [];
  }
}

// ─── Hovedlogikk ───
async function main() {
  const now = new Date().toISOString().slice(0, 10);
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const changesetDir = join(ROOT, ".changeset", now);
  await mkdir(changesetDir, { recursive: true });

  const gitStat = getGitDiff();
  const gitDetailed = getGitDiffDetailed();
  const drafts = await getSanityDrafts();
  const screenshots = await findScreenshots(changesetDir);

  // Bygg rapport
  let report = `# ${title}\n\n`;
  report += `**Generert:** ${new Date().toLocaleString("no-NO")}\n\n`;
  report += `---\n\n`;

  // Kode-endringer
  report += `## 📝 Kode-endringer\n\n`;
  if (gitStat && gitStat !== "(ingen git diff tilgjengelig)") {
    report += `### Oppsummering\n\n\`\`\`\n${gitStat}\n\`\`\`\n\n`;
    if (gitDetailed) {
      report += `### Detaljert diff\n\n<details>\n<summary>Klikk for å se full diff</summary>\n\n\`\`\`diff\n${gitDetailed.slice(0, 5000)}${gitDetailed.length > 5000 ? "\n... (truncated)" : ""}\n\`\`\`\n</details>\n\n`;
    }
  } else {
    report += `*Ingen kode-endringer oppdaget.*\n\n`;
  }

  // Sanity-endringer
  report += `## 🎨 Sanity-endringer\n\n`;
  if (drafts && drafts.length > 0) {
    report += `| Dokument ID | Type | Sist oppdatert |\n`;
    report += `|-------------|------|----------------|\n`;
    for (const d of drafts) {
      const docId = d._id.replace("drafts.", "");
      report += `| \`${docId}\` | ${d._type} | ${d._updatedAt?.slice(0, 16) || "?"} |\n`;
    }
    report += `\n> ⚠️ Disse dokumentene er **drafts** — de er IKKE publisert ennå.\n\n`;
  } else if (drafts === null) {
    report += `*Kunne ikke hente Sanity-data (mangler token eller prosjekt ikke konfigurert).*\n\n`;
  } else {
    report += `*Ingen Sanity draft-endringer oppdaget.*\n\n`;
  }

  // Screenshots
  report += `## 📸 Screenshots\n\n`;
  if (screenshots.length > 0) {
    for (const path of screenshots) {
      const name = path.split("/").pop();
      report += `- **${name}**\n`;
    }
    report += `\nScreenshots ligger i: \`${changesetDir}\`\n\n`;
  } else {
    report += `*Ingen screenshots funnet. Kjør \`node scripts/super-editor-screenshot.mjs <url>\` for å ta screenshots.*\n\n`;
  }

  // Risiko-vurdering
  report += `## ⚠️ Risiko-vurdering\n\n`;
  const hasCode = gitStat && gitStat !== "(ingen git diff tilgjengelig)";
  const hasSanity = drafts && drafts.length > 0;
  if (hasCode && hasSanity) {
    report += `- **Medium**: Endringer både i kode og CMS-innhold. Kode-endringer kan påvirke rendering av Sanity-data.\n`;
  } else if (hasCode) {
    report += `- **Lav til Medium**: Kun kode-endringer. Avhengig av omfanget kan det påvirke layout/funksjonalitet.\n`;
  } else if (hasSanity) {
    report += `- **Lav**: Kun innholds-endringer i Sanity. Ingen kode-endringer betyr lav teknisk risiko.\n`;
  } else {
    report += `- **Ingen endringer oppdaget.**\n`;
  }
  report += `\n`;

  // Neste steg
  report += `---\n\n`;
  report += `## Neste steg\n\n`;
  report += `1. **Gå gjennom rapporten ovenfor**\n`;
  report += `2. **Sjekk screenshots** i \`${changesetDir}\`\n`;
  report += `3. **Godkjenn eller avslå**\n`;
  report += `4. Hvis godkjent: Kjør \`node scripts/super-editor-apply.mjs --publish\`\n\n`;
  report += `## Status: ⏳ VENTER PÅ GODKJENNING\n`;

  const reportPath = join(changesetDir, `REPORT-${timestamp}.md`);
  await writeFile(reportPath, report, "utf-8");

  console.log(`📋 Changeset-rapport generert:`);
  console.log(`   ${reportPath}`);
  console.log("\n" + "=".repeat(60));
  console.log(report);
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
