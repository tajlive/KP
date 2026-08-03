/**
 * verify-i18n-completeness.ts
 *
 * Verifiserer at alle språkfiler har samme nøkkelsett som base-språket (no.json).
 *
 * - Basisspråk:  messages/no.json (alle nøkler må finnes i alle språk)
 * - Sjekkes:     messages/en.json, messages/zh.json
 * - Nøkler ekstraheres rekursivt med dot-notation (f.eks. "dashboard.adaptive.pilotTradeTitle")
 * - Exit-kode 0  = alle språk har alle nøkler (eller bare advarsler)
 * - Exit-kode 1  = minst én nøkkel mangler i et aktivt språk
 *
 * Kjøring:
 *   npx tsx scripts/verify-i18n-completeness.ts
 */
import fs from "fs";
import path from "path";

const MESSAGES_DIR = path.join(process.cwd(), "messages");
const BASE_LANG = "no";
const LANGUAGES = ["no", "en", "zh"] as const;

type Lang = (typeof LANGUAGES)[number];

/** Ekstraher alle nøkler fra et (nested) meldingsobjekt, rekursivt, dot-notation. */
function extractKeys(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...extractKeys(value as Record<string, unknown>, fullKey));
    } else {
      // Leaf: streng, tall, boolean, array, null — alt er en nøkkel
      keys.push(fullKey);
    }
  }
  return keys;
}

function loadMessages(lang: Lang): Record<string, unknown> {
  const filePath = path.join(MESSAGES_DIR, `${lang}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fant ikke ${filePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
}

function main(): void {
  console.log("🌐 i18n-kompletthet");
  console.log("═══════════════════════════════════════════════════\n");

  const base = loadMessages(BASE_LANG);
  const baseKeys = extractKeys(base);
  const baseSet = new Set(baseKeys);
  console.log(`📊 Base-språk: ${BASE_LANG}.json — ${baseSet.size} nøkler\n`);

  let failed = false;

  for (const lang of LANGUAGES) {
    if (lang === BASE_LANG) continue;

    const messages = loadMessages(lang);
    const keys = extractKeys(messages);
    const keySet = new Set(keys);

    const missing = [...baseSet].filter((k) => !keySet.has(k)).sort();
    const extra = [...keySet].filter((k) => !baseSet.has(k)).sort();

    console.log(`── ${lang}.json (${keySet.size}/${baseSet.size} nøkler) ──`);

    if (missing.length === 0) {
      console.log(`   ✅ ${lang}.json har alle nøkler`);
    } else {
      failed = true;
      console.error(`   ❌ ${lang}.json mangler ${missing.length} nøkler:`);
      for (const k of missing) {
        console.error(`      - ${k}`);
      }
    }

    if (extra.length > 0) {
      console.log(`   ℹ️  ${extra.length} ekstra nøkler (ikke i ${BASE_LANG}.json, ignoreres):`);
      for (const k of extra.slice(0, 15)) {
        console.log(`      + ${k}`);
      }
      if (extra.length > 15) {
        console.log(`      … og ${extra.length - 15} flere`);
      }
    }
    console.log("");
  }

  console.log("═══════════════════════════════════════════════════");
  if (failed) {
    console.error("❌ Manglende nøkler funnet — fiks før deploy.");
    process.exit(1);
  }
  console.log("✅ Alle språk er komplette.");
  process.exit(0);
}

main();
