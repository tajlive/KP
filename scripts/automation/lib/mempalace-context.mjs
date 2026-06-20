#!/usr/bin/env node
/**
 * 🧠 MemPalace context helpers for the Automation Subagent.
 *
 * Loads recent context and relevant KG facts before a task,
 * and persists task results + feedback afterwards.
 *
 * Uses direct file access (not MCP) for reliability in subagent/CLI context.
 */

import { readFileSync, appendFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { kgBatch, kgQuery } from "../../vault/lib/mempalace.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const DIARY_PATH = resolve(ROOT, ".kimi/diary.jsonl");

function nowISO() {
  return new Date().toISOString();
}

function readDiary(limit = 20) {
  if (!existsSync(DIARY_PATH)) return [];
  const lines = readFileSync(DIARY_PATH, "utf8").trim().split("\n").filter(Boolean);
  return lines.slice(-limit).map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  }).filter(Boolean);
}

function searchKGKeywords(queries) {
  const kgPath = resolve(ROOT, ".mempalace/kg.json");
  if (!existsSync(kgPath)) return {};
  const kg = JSON.parse(readFileSync(kgPath, "utf8"));
  const results = {};

  for (const query of queries) {
    const lowerQuery = query.toLowerCase();
    const matches = [];
    for (const [subject, facts] of Object.entries(kg)) {
      if (subject.toLowerCase().includes(lowerQuery)) {
        matches.push({ subject, facts });
        continue;
      }
      for (const fact of facts || []) {
        const text = `${fact.predicate} ${fact.object}`.toLowerCase();
        if (text.includes(lowerQuery)) {
          matches.push({ subject, facts });
          break;
        }
      }
    }
    results[query] = matches.slice(0, 5);
  }

  return results;
}

/**
 * Load recent context + KG facts for a task.
 * @param {string[]} queries - keywords to search for
 * @param {string[]} entities - KG entities to query
 * @returns {{recent: array, kg: object}}
 */
export function loadContext(queries = [], entities = []) {
  const results = {
    recent: readDiary(20),
    kg: {},
  };

  for (const entity of entities) {
    results.kg[entity] = kgQuery(entity);
  }

  if (queries.length > 0) {
    Object.assign(results.kg, searchKGKeywords(queries));
  }

  return results;
}

/**
 * Persist task result to MemPalace KG and diary.
 * @param {object} task
 * @param {string} status - GO / NO-GO / PARTIAL
 * @param {string[]} tags
 */
export function saveTaskResult(task, status, tags = []) {
  const timestamp = nowISO();
  const subject = `automation:${task.taskId}`;

  const kgFacts = [
    { subject, predicate: "name", object: task.name, validFrom: timestamp },
    { subject, predicate: "status", object: status, validFrom: timestamp },
    { subject, predicate: "completed_at", object: timestamp, validFrom: timestamp },
    { subject, predicate: "tags", object: tags.join(","), validFrom: timestamp },
  ];

  if (task.resultSummary) {
    kgFacts.push({ subject, predicate: "summary", object: task.resultSummary, validFrom: timestamp });
  }

  try {
    kgBatch(kgFacts);
  } catch (err) {
    console.error(`[automation] Failed to save KG facts: ${err.message}`);
  }

  try {
    const entry = {
      ts: timestamp,
      type: "AUTO",
      task: task.name,
      agent: "automation-subagent",
      status,
      rating: status === "GO" ? 5 : status === "PARTIAL" ? 3 : 1,
      tags: ["automation-subagent", ...tags],
    };
    appendFileSync(DIARY_PATH, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    console.error(`[automation] Failed to write diary: ${err.message}`);
  }
}

/**
 * Save user feedback answers to MemPalace KG.
 * @param {string} taskId
 * @param {{question: string, answer: string}[]} qa
 */
export function saveFeedback(taskId, qa) {
  const timestamp = nowISO();
  const subject = `automation:${taskId}:feedback`;

  const facts = qa.map((item, index) => ({
    subject,
    predicate: `q${index + 1}`,
    object: `${item.question} => ${item.answer}`,
    validFrom: timestamp,
  }));

  try {
    kgBatch(facts);
  } catch (err) {
    console.error(`[automation] Failed to save feedback: ${err.message}`);
  }
}
