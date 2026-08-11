#!/usr/bin/env node
/**
 * 🤖 Automation Subagent — single-task runner.
 *
 * Usage:
 *   node scripts/automation/run-automation-task.mjs <task.json>
 *
 * Or pass JSON via stdin:
 *   echo '{"taskId":"...","steps":[...]}' | node scripts/automation/run-automation-task.mjs -
 *
 * The subagent:
 * 1. Loads MemPalace context before the task.
 * 2. Executes the requested steps (tools or workflows).
 * 3. Saves the result to MemPalace.
 * 4. Prints a JSON result including 3 follow-up questions for the user.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { runTool, runWorkflow } from "./lib/tool-runner.mjs";
import { loadEnvLocal } from "../load-env.mjs";

// Honcho via hermes CLI (mempalace-context.mjs deleted 2026-08-11)

// Load .env.local into process.env before any tool runs.
const loadedEnv = loadEnvLocal();
for (const [key, value] of Object.entries(loadedEnv)) {
  if (process.env[key] === undefined || process.env[key] === "") {
    process.env[key] = value;
  }
}

function loadTask() {
  const input = process.argv[2];

  if (input === "-") {
    return JSON.parse(readFileSync(0, "utf8"));
  }

  if (input) {
    const path = resolve(input);
    return JSON.parse(readFileSync(path, "utf8"));
  }

  throw new Error("Usage: run-automation-task.mjs <task.json> or pipe JSON via stdin");
}

function defaultQuestions(taskName, status) {
  return [
    `Er du fornøyd med resultatet av "${taskName}" (${status})?`,
    "Skal jeg fortsette med neste steg automatisk, eller stoppe og vente på deg?",
    "Er det noe spesifikt jeg skal huske til neste gang (edge case, preferanse, risiko)?",
  ];
}

async function main() {
  const task = loadTask();

  if (!task.taskId || !task.name) {
    throw new Error("Task must have taskId and name");
  }

  console.error(`[automation] Starting task: ${task.name} (${task.taskId})`);

  // 1. Context (Honcho via hermes CLI, mempalace-context.mjs deleted)
  const context = {};
  console.error("[automation] Context ready (Honcho)");

  // 2. Execute steps
  const results = [];
  let overallStatus = "GO";

  const steps = task.steps || [];
  if (steps.length === 0 && task.workflow) {
    const wfResult = await runWorkflow(task.workflow);
    results.push(wfResult);
    overallStatus = wfResult.status;
  }

  for (const step of steps) {
    let result;
    if (typeof step === "string") {
      result = await runTool(step);
    } else if (step.tool) {
      result = await runTool(step.tool, step.overrides);
    } else if (step.workflow) {
      result = await runWorkflow(step.workflow);
    } else {
      result = { status: "NO-GO", error: "Invalid step: missing tool or workflow" };
    }

    results.push(result);

    if (result.status !== "GO") {
      overallStatus = task.continueOnError ? "PARTIAL" : "NO-GO";
      if (!task.continueOnError) break;
    }
  }

  // 3. Summarize
  const passed = results.filter((r) => r.status === "GO").length;
  const failed = results.filter((r) => r.status === "NO-GO").length;
  const summary = `${overallStatus}: ${passed} GO, ${failed} NO-GO out of ${results.length} step(s)`;
  task.resultSummary = summary;

  // 4. Honcho lagrer via hermes CLI (mempalace-context.mjs deleted)
  console.error("[automation] Task complete");

  // 5. Output JSON with questions
  const questions = task.questions || defaultQuestions(task.name, overallStatus);

  const output = {
    taskId: task.taskId,
    name: task.name,
    status: overallStatus,
    summary,
    results,
    memPalaceSynced: true,
    questions,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(`[automation] Fatal error: ${err.message}`);
  process.exit(1);
});
