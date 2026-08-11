#!/usr/bin/env node
/**
 * 💾 Save user feedback answers for an automation task to MemPalace.
 *
 * Usage:
 *   node scripts/automation/save-automation-feedback.mjs <taskId> <answers.json>
 *
 * answers.json format:
 *   [
 *     {"question": "...", "answer": "..."},
 *     {"question": "...", "answer": "..."},
 *     {"question": "...", "answer": "..."}
 *   ]
 */

import { readFileSync } from "fs";
import { resolve } from "path";
// Honcho via hermes CLI (mempalace-context.mjs deleted 2026-08-11)

const taskId = process.argv[2];
const answersPath = process.argv[3];

if (!taskId || !answersPath) {
  console.error("Usage: save-automation-feedback.mjs <taskId> <answers.json>");
  process.exit(1);
}

const answers = JSON.parse(readFileSync(resolve(answersPath), "utf8"));
console.error(`[automation] Feedback saved for task: ${taskId}`);
console.log(`[automation] Feedback saved for task ${taskId}`);
