#!/usr/bin/env node
/**
 * 🔧 Tool runner for the Automation Subagent.
 *
 * Executes tools defined in tool-registry.json:
 * - npm scripts
 * - CLI commands
 * - node scripts
 * - MCP tools (via MCP server wrapper)
 * - internal API calls
 */

import { execFileSync, spawn } from "child_process";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../../load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

// Ensure .env.local is loaded for all tool invocations.
const loadedEnv = loadEnvLocal();
for (const [key, value] of Object.entries(loadedEnv)) {
  if (process.env[key] === undefined || process.env[key] === "") {
    process.env[key] = value;
  }
}

let registryCache = null;

function loadRegistry() {
  if (registryCache) return registryCache;
  const path = resolve(ROOT, "scripts/automation/tool-registry.json");
  registryCache = JSON.parse(readFileSync(path, "utf8"));
  return registryCache;
}

function maskSecrets(str) {
  if (typeof str !== "string") return "";
  return str
    .replace(/([a-zA-Z0-9_-]*(?:key|token|secret|password|pat)[a-zA-Z0-9_-]*)\s*=\s*["']?[^\s"']+/gi, "$1=***")
    .replace(/(Bearer\s+)[a-zA-Z0-9._-]+/gi, "$1***")
    .replace(/(eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)/g, "***jwt***");
}

function interpolateTemplate(template, env) {
  if (typeof template !== "string") return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = env[key] ?? process.env[key];
    if (value === undefined) {
      throw new Error(`Missing required env var: ${key}`);
    }
    return value;
  });
}

function runCommand(command, args = [], timeout = 60) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      env: process.env,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Timeout after ${timeout}s`));
    }, timeout * 1000);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: code,
        stdout: stdout.slice(-5000), // limit output
        stderr: stderr.slice(-2000),
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function runNpm(toolDef) {
  const parts = toolDef.command.split(" ");
  const script = parts[2]; // npm run <script>
  const extraArgs = parts.slice(3);
  return runCommand("npm", ["run", script, ...extraArgs], toolDef.timeout);
}

async function runCli(toolDef) {
  const parts = toolDef.command.split(" ");
  return runCommand(parts[0], parts.slice(1), toolDef.timeout);
}

async function runScript(toolDef, overrides = {}) {
  const scriptPath = resolve(ROOT, toolDef.path);
  const extraArgs = overrides.args ?? toolDef.args ?? [];
  return runCommand(process.execPath, [scriptPath, ...extraArgs], toolDef.timeout);
}

async function runMcp(toolDef) {
  // MCP tools require a full JSON-RPC initialize handshake. For the v1
  // automation framework we expose them in the registry for discovery, but
  // direct invocation is not yet implemented. Use equivalent CLI/script/API
  // tools instead, or extend this runner with an MCP client library.
  throw new Error(
    `MCP tool invocation (${toolDef.server}/${toolDef.tool}) requires an MCP client library. ` +
    `Use the equivalent CLI/script/API tool, or implement an MCP client here.`
  );
}

async function runApi(toolDef) {
  const url = interpolateTemplate(toolDef.url, process.env);
  const headers = {};
  for (const [key, value] of Object.entries(toolDef.headers || {})) {
    headers[key] = interpolateTemplate(value, process.env);
  }

  const response = await fetch(url, {
    method: toolDef.method,
    headers,
  });

  const body = await response.text();
  return {
    exitCode: response.ok ? 0 : 1,
    stdout: `HTTP ${response.status}\n${body.slice(0, 2000)}`,
    stderr: response.ok ? "" : `HTTP ${response.status}`,
  };
}

/**
 * Execute a tool by name from the registry.
 * @param {string} toolName
 * @param {object} overrides - optional argument/env overrides
 * @returns {{tool: string, status: string, exitCode: number, stdout: string, stderr: string, error: string|null}}
 */
export async function runTool(toolName, overrides = {}) {
  const registry = loadRegistry();
  const toolDef = registry.tools[toolName];

  if (!toolDef) {
    return {
      tool: toolName,
      status: "NO-GO",
      exitCode: 1,
      stdout: "",
      stderr: `Unknown tool: ${toolName}`,
      error: `Unknown tool: ${toolName}`,
    };
  }

  // Merge env overrides
  if (overrides.env) {
    for (const [key, value] of overrides.env) {
      process.env[key] = value;
    }
  }

  try {
    let result;
    switch (toolDef.type) {
      case "npm":
        result = await runNpm(toolDef);
        break;
      case "cli":
        result = await runCli(toolDef);
        break;
      case "script":
        result = await runScript(toolDef, overrides);
        break;
      case "mcp":
        result = await runMcp(toolDef);
        break;
      case "api":
        result = await runApi(toolDef);
        break;
      default:
        throw new Error(`Unsupported tool type: ${toolDef.type}`);
    }

    const status = result.exitCode === 0 ? "GO" : "NO-GO";
    return {
      tool: toolName,
      status,
      exitCode: result.exitCode,
      stdout: maskSecrets(result.stdout),
      stderr: maskSecrets(result.stderr),
      error: null,
    };
  } catch (err) {
    return {
      tool: toolName,
      status: "NO-GO",
      exitCode: 1,
      stdout: "",
      stderr: maskSecrets(err.message),
      error: err.message,
    };
  }
}

/**
 * Run a workflow (sequence of tools).
 * @param {string} workflowName
 * @returns {{workflow: string, status: string, steps: array}}
 */
export async function runWorkflow(workflowName) {
  const registry = loadRegistry();
  const workflow = registry.workflows[workflowName];

  if (!workflow) {
    return {
      workflow: workflowName,
      status: "NO-GO",
      steps: [{ error: `Unknown workflow: ${workflowName}` }],
    };
  }

  const results = [];
  for (const step of workflow.steps) {
    const result = await runTool(step);
    results.push(result);
    if (result.status !== "GO") {
      return {
        workflow: workflowName,
        status: "NO-GO",
        steps: results,
      };
    }
  }

  return {
    workflow: workflowName,
    status: "GO",
    steps: results,
  };
}
