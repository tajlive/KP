#!/usr/bin/env node
/**
 * 🏛️ MemPalace KG wrapper for local vault scripts.
 *
 * The AI runtime normally invokes MCP tools, but these shell scripts read and
 * write `.mempalace/kg.json` directly using the existing on-disk format:
 *
 *   {
 *     "subject": [
 *       { "predicate": "...", "object": "...", "validFrom": "..." },
 *       ...
 *     ]
 *   }
 *
 * New facts are appended. When a fact for the same subject+predicate already
 * exists, it is replaced so the KG stays idempotent per sync run.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, chmodSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const KG_PATH = resolve(ROOT, ".mempalace/kg.json");

function nowISO() {
  return new Date().toISOString();
}

function ensureDir(p) {
  mkdirSync(dirname(p), { recursive: true });
}

function readKG() {
  if (!existsSync(KG_PATH)) {
    return {};
  }
  try {
    const data = readFileSync(KG_PATH, "utf8").trim();
    if (!data) return {};
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      // Normalize legacy array format to the entity-key format.
      const normalized = {};
      for (const fact of parsed) {
        const subject = fact.subject || "unknown";
        if (!normalized[subject]) normalized[subject] = [];
        normalized[subject].push({
          predicate: fact.predicate,
          object: fact.object,
          validFrom: fact.timestamp || fact.validFrom || nowISO(),
        });
      }
      return normalized;
    }
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse ${KG_PATH}: ${err.message}`);
  }
}

function writeKG(kg) {
  ensureDir(KG_PATH);
  const tmpPath = `${KG_PATH}.tmp.${process.pid}`;
  writeFileSync(tmpPath, JSON.stringify(kg, null, 2) + "\n", "utf8");
  chmodSync(tmpPath, 0o600);
  renameSync(tmpPath, KG_PATH);
  chmodSync(KG_PATH, 0o600);
}

/**
 * Add or replace facts in the KG.
 * @param {Array<{subject: string, predicate: string, object: string, validFrom?: string}>} facts
 */
export function kgBatch(facts) {
  if (!Array.isArray(facts) || facts.length === 0) {
    return { written: 0 };
  }

  const kg = readKG();

  for (const fact of facts) {
    const subject = fact.subject;
    const predicate = fact.predicate;
    const object = fact.object;
    const validFrom = fact.validFrom || nowISO();

    if (!kg[subject]) {
      kg[subject] = [];
    }

    // Replace existing fact with same predicate to keep idempotent syncs.
    const existingIndex = kg[subject].findIndex((f) => f.predicate === predicate);
    const newFact = { predicate, object, validFrom };

    if (existingIndex >= 0) {
      kg[subject][existingIndex] = newFact;
    } else {
      kg[subject].push(newFact);
    }
  }

  writeKG(kg);
  return { written: facts.length };
}

/**
 * Query all facts for a given subject.
 * @param {string} subject
 * @returns {Array<{predicate: string, object: string, validFrom: string}> | null}
 */
export function kgQuery(subject) {
  const kg = readKG();
  return kg[subject] || null;
}

/**
 * Find all subjects whose name starts with the given prefix.
 * @param {string} prefix
 * @returns {Array<{subject: string, facts: Array<{predicate: string, object: string, validFrom: string}>}>}
 */
export function kgFindSubjects(prefix) {
  const kg = readKG();
  const results = [];
  for (const subject of Object.keys(kg)) {
    if (subject.startsWith(prefix)) {
      results.push({ subject, facts: kg[subject] });
    }
  }
  return results;
}

/**
 * Path to the local KG file (useful for logging/debugging).
 * @returns {string}
 */
export function getKGPath() {
  return KG_PATH;
}
