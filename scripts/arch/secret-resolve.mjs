#!/usr/bin/env node
/**
 * Arch Secret Governance v1 — resolver (Master Prompt v4.0 §4)
 *
 * Bruk:
 *   node scripts/arch/secret-resolve.mjs <uri> [--check]
 *   node scripts/arch/secret-resolve.mjs --list
 *
 * SIKKERHET: Skriver ALDRI secret-verdier. Default viser Hvor verdien bor
 * og hvordan man henter den. --check verifiserer kun EKSISTENS (v1: kun
 * env.local-stores sjekkes lokalt; eksterne stores = "ikke sjekket lokalt").
 *
 * Registry: .arch/secrets.yaml — KUN flat struktur (se format-kontrakt der).
 * Parser er minimal og håndterer kun dette subsettet (ingen yaml-lib i repoet).
 */
import { readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..");
const REGISTRY_PATH = join(REPO_ROOT, ".arch", "secrets", "registry.yaml");
const ENV_LOCAL_PATH = join(REPO_ROOT, ".env.local");

/** Minimal YAML-subset-parser for secrets.yaml (flat entries-liste). */
function parseRegistry(text) {
  const entries = [];
  let current = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line || line.trim().startsWith("#")) continue;
    if (/^entries:/.test(line)) continue; // sectionsskifte
    const itemMatch = line.match(/^\s+-\s+(\S+):\s*(.*)$/);
    if (itemMatch) {
      current = { [itemMatch[1]]: itemMatch[2].trim() };
      entries.push(current);
      continue;
    }
    const fieldMatch = line.match(/^\s+(\S+):\s*(.*)$/);
    if (fieldMatch && current) current[fieldMatch[1]] = fieldMatch[2].trim();
  }
  return entries;
}

function readEnvLocalKeys() {
  try {
    const text = readFileSync(ENV_LOCAL_PATH, "utf8");
    const keys = new Set();
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=/);
      if (m) keys.add(m[1]);
    }
    return keys;
  } catch {
    return null;
  }
}

function readHermesDotenvKeys() {
  try {
    const text = readFileSync(
      join(process.env.HOME ?? "", ".hermes", ".env"),
      "utf8",
    );
    const keys = new Set();
    for (const line of text.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=/);
      if (m) keys.add(m[1]);
    }
    return keys;
  } catch {
    return null;
  }
}

const args = process.argv.slice(2);

if (args.includes("--list")) {
  const entries = parseRegistry(readFileSync(REGISTRY_PATH, "utf8"));
  console.log("Arch Secret Registry (.arch/secrets.yaml) — referanser, ingen verdier:");
  for (const e of entries) {
    console.log(`  ${e.uri.padEnd(52)} ${e.store.padEnd(10)} [${e.status}]`);
  }
  process.exit(0);
}

const uri = args[0];
if (!uri || !uri.startsWith("secret://")) {
  console.error("Bruk: node scripts/arch/secret-resolve.mjs <secret://…> [--check] | --list");
  process.exit(2);
}

const entries = parseRegistry(readFileSync(REGISTRY_PATH, "utf8"));
const entry = entries.find((e) => e.uri === uri);
if (!entry) {
  console.error(`URI ikke registrert: ${uri}`);
  console.error("Kjør med --list for å se registrerte referanser.");
  process.exit(1);
}

console.log(`URI:        ${entry.uri}`);
console.log(`Store:      ${entry.store}`);
console.log(`Key:        ${entry.key_name ?? "-"}`);
console.log(`Path:       ${entry.path ?? "-"}`);
console.log(`Consumers:  ${entry.consumers ?? "-"}`);
console.log(`Status:     ${entry.status}`);
if (entry.note) console.log(`Note:       ${entry.note}`);

if (args.includes("--check")) {
  if (entry.store === "env.local" || entry.store === "hermes-dotenv") {
    const keys =
      entry.store === "env.local" ? readEnvLocalKeys() : readHermesDotenvKeys();
    const storeLabel =
      entry.store === "env.local" ? ".env.local" : "~/.hermes/.env";
    if (keys === null) {
      console.log(`CHECK:      ${storeLabel} ikke lesbar`);
      process.exit(1);
    }
    const present = keys.has(entry.key_name);
    console.log(`CHECK:      ${entry.key_name} finnes i ${storeLabel}: ${present}`);
    process.exit(present ? 0 : 1);
  }
  console.log(`CHECK:      store «${entry.store}» sjekkes ikke lokalt (v1) — verifiser manuelt/bws/wrangler`);
  process.exit(0);
}
