#!/usr/bin/env node
/**
 * Playwright MCP proxy for Klarpakke.
 *
 * Spawns the official @playwright/mcp backend and exposes the same chrome_*
 * tool namespace the existing prompts and smoke tests rely on. Write/eval
 * tools are gated through a pending-action queue that requires chrome_approve.
 */

import { spawn } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from "fs";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ReadBuffer, serializeMessage } from "@modelcontextprotocol/sdk/shared/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

/**
 * A stdio client transport that uses an already-spawned child process instead of
 * spawning a second copy. The stock StdioClientTransport would call start() and
 * spawn another backend, which collides with the process we already launched and
 * causes the "already started" crash. This transport only wires up the existing
 * stdio pipes and does not spawn on start().
 */
class PreSpawnedStdioTransport {
  constructor(child) {
    this._process = child;
    this._readBuffer = new ReadBuffer();
    this.onmessage = null;
    this.onerror = null;
    this.onclose = null;
  }

  async start() {
    if (this._started) {
      return Promise.resolve();
    }
    if (!this._process) {
      throw new Error("PreSpawnedStdioTransport: process already closed");
    }
    this._started = true;
    const proc = this._process;
    proc.stdout.on("data", (chunk) => {
      this._readBuffer.append(chunk);
      while (true) {
        const message = this._readBuffer.readMessage();
        if (message === null) break;
        try {
          this.onmessage?.(message);
        } catch (err) {
          this.onerror?.(err);
        }
      }
    });
    proc.stdout.on("error", (err) => this.onerror?.(err));
    proc.stdin.on("error", (err) => this.onerror?.(err));
    proc.on("error", (err) => this.onerror?.(err));
    proc.on("close", () => {
      this._process = null;
      this._started = false;
      this.onclose?.();
    });
    return Promise.resolve();
  }

  async close() {
    const proc = this._process;
    this._process = null;
    this._started = false;
    this._readBuffer.clear();
    if (proc && !proc.killed) {
      try {
        proc.stdin?.end();
      } catch {
        // ignore
      }
      try {
        proc.kill("SIGTERM");
      } catch {
        // ignore
      }
    }
  }

  send(message) {
    return new Promise((resolve, reject) => {
      const proc = this._process;
      if (!proc || proc.killed || !proc.stdin) {
        reject(new Error("PreSpawnedStdioTransport: not connected"));
        return;
      }
      const json = serializeMessage(message);
      if (proc.stdin.write(json)) {
        resolve();
      } else {
        proc.stdin.once("drain", resolve);
      }
    });
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outputDir = process.env.PLAYWRIGHT_MCP_OUTPUT_DIR || resolve(root, "logs", "browser-qa");
mkdirSync(outputDir, { recursive: true });

const backendCli = resolve(root, "node_modules", "@playwright", "mcp", "cli.js");
if (!existsSync(backendCli)) {
  console.error(`[chrome-proxy] Backend not found: ${backendCli}`);
  process.exit(1);
}

const backendProc = spawn("node", [backendCli], {
  env: { ...process.env },
  stdio: ["pipe", "pipe", "inherit"],
  cwd: root,
});

backendProc.on("error", (err) => {
  console.error("[chrome-proxy] Backend process error:", err?.message || err);
});

backendProc.on("exit", (code, signal) => {
  console.error(`[chrome-proxy] Backend process exited (code=${code ?? "n/a"}, signal=${signal ?? "n/a"}).`);
});

const backendClient = new Client({ name: "chrome-proxy-client", version: "1.0.0" }, { capabilities: {} });
const backendTransport = new PreSpawnedStdioTransport(backendProc);

// Map chrome tool names to the official backend tool names.
const TOOL_MAP = {
  chrome_start: null,
  chrome_stop: "browser_close",
  chrome_navigate: "browser_navigate",
  chrome_navigate_back: "browser_navigate_back",
  chrome_navigate_forward: "browser_navigate_forward",
  chrome_reload: "browser_reload",
  chrome_snapshot: "browser_snapshot",
  chrome_screenshot: "browser_take_screenshot",
  chrome_extract: "browser_evaluate",
  chrome_click: "browser_click",
  chrome_fill: "browser_type",
  chrome_type: "browser_type",
  chrome_select: "browser_select_option",
  chrome_press: "browser_press_key",
  chrome_hover: "browser_hover",
  chrome_wait: "browser_wait_for",
  chrome_evaluate: "browser_evaluate",
  chrome_pdf: "browser_pdf_save",
  chrome_console: "browser_console_messages",
  chrome_console_clear: "browser_console_clear",
  chrome_resize: "browser_resize",
  chrome_network_requests: "browser_network_requests",
  chrome_network_clear: "browser_network_clear",
  chrome_file_upload: "browser_file_upload",
  chrome_tabs: "browser_tabs",
  chrome_import_auth_storage: "browser_set_storage_state",
};

// Tools that require user approval before they are forwarded to the backend.
const WRITE_TOOLS = new Set([
  "browser_click",
  "browser_type",
  "browser_select_option",
  "browser_press_key",
  "browser_hover",
  "browser_evaluate",
  "browser_file_upload",
  "browser_set_storage_state",
]);

// Proxy-only tools
const PROXY_TOOLS = new Set(["chrome_start", "chrome_approve", "chrome_import_auth_storage"]);

let pendingAction = null;

/** Convert an old chrome_* result into a backward-compatible JSON text result. */
function makeResult(obj) {
  return {
    content: [{ type: "text", text: JSON.stringify(obj) }],
    isError: obj && obj.ok === false,
  };
}

function makeError(message) {
  return makeResult({ ok: false, error: message });
}

/** Map chrome_* arguments to backend-compatible arguments. */
function mapArgs(chromeName, args) {
  const a = args || {};
  switch (chromeName) {
    case "chrome_fill":
    case "chrome_type": {
      const mapped = { text: String(a.value ?? a.text ?? "") };
      if (a.ref) mapped.ref = String(a.ref);
      if (a.selector) mapped.selector = String(a.selector);
      if (a.element || a.name) mapped.element = String(a.element || a.name || "input");
      return mapped;
    }
    case "chrome_click":
    case "chrome_hover": {
      const mapped = {};
      if (a.ref) mapped.ref = String(a.ref);
      if (a.selector) mapped.selector = String(a.selector);
      if (a.element || a.name) mapped.element = String(a.element || a.name || "element");
      return mapped;
    }
    case "chrome_select": {
      const mapped = { values: Array.isArray(a.value) ? a.value : [String(a.value)] };
      if (a.ref) mapped.ref = String(a.ref);
      if (a.selector) mapped.selector = String(a.selector);
      if (a.element || a.name) mapped.element = String(a.element || a.name || "dropdown");
      return mapped;
    }
    case "chrome_evaluate":
    case "chrome_extract": {
      return { function: String(a.script || a.function || "() => {}") };
    }
    case "chrome_wait": {
      const mapped = {};
      if (typeof a.timeout === "number") mapped.time = Math.min(30, Math.max(0, a.timeout / 1000));
      else if (a.waitUntil === "networkidle") mapped.time = 2;
      else if (a.selector) mapped.time = 2;
      return mapped;
    }
    case "chrome_screenshot": {
      const mapped = { type: "png" };
      if (a.fullPage === true) mapped.fullPage = true;
      if (a.filename) mapped.filename = String(a.filename);
      return mapped;
    }
    case "chrome_pdf": {
      const mapped = {};
      if (a.format) mapped.format = String(a.format);
      if (a.filename) mapped.filename = String(a.filename);
      return mapped;
    }
    case "chrome_console": {
      const mapped = { level: "info", all: true };
      if (a.type) mapped.level = String(a.type);
      if (typeof a.limit === "number" && a.limit < 100) mapped.level = String(a.type || "info");
      return mapped;
    }
    case "chrome_network_requests": {
      const mapped = { static: true, requestBody: false, requestHeaders: false, limit: 50 };
      if (a.static === false) mapped.static = false;
      if (a.requestBody === true) mapped.requestBody = true;
      if (a.requestHeaders === true) mapped.requestHeaders = true;
      if (a.filter) mapped.filter = String(a.filter);
      if (typeof a.limit === "number") mapped.limit = a.limit;
      return mapped;
    }
    case "chrome_resize": {
      return { width: Number(a.width), height: Number(a.height) };
    }
    case "chrome_file_upload": {
      const mapped = { paths: Array.isArray(a.filePaths) ? a.filePaths : [String(a.filePath || "")] };
      if (a.ref) mapped.ref = String(a.ref);
      if (a.selector) mapped.selector = String(a.selector);
      if (a.element) mapped.element = String(a.element);
      return mapped;
    }
    case "chrome_tabs": {
      const mapped = { action: String(a.action || "list") };
      if (typeof a.index === "number") mapped.index = a.index;
      return mapped;
    }
    case "chrome_import_auth_storage": {
      const source = resolve(root, "e2e", ".auth", "user.json");
      const dest = resolve(outputDir, "imported-auth.json");
      if (!existsSync(source)) {
        throw new Error("Auth fixture not found. Run npm run test:e2e:provision:primary first.");
      }
      // Copy into output dir so the backend can resolve the filename.
      copyFileSync(source, dest);
      return { filename: "imported-auth.json" };
    }
    case "chrome_navigate": {
      const mapped = { url: String(a.url) };
      if (a.waitUntil) mapped.waitUntil = String(a.waitUntil);
      return mapped;
    }
    default:
      return a;
  }
}

/** Transform a backend result into the old chrome_* response shape. */
function transformResult(chromeName, backendResult) {
  const content = backendResult?.content || [];
  const text = content.find((c) => c.type === "text")?.text || "";
  const image = content.find((c) => c.type === "image");

  if (chromeName === "chrome_screenshot" && image?.data) {
    return makeResult({ ok: true, base64: image.data, mimeType: "image/png", fullPage: false });
  }

  if (chromeName === "chrome_pdf") {
    // PDFs are returned as a file reference in text; keep text for now.
    return makeResult({ ok: true, text });
  }

  if (chromeName === "chrome_snapshot" || chromeName === "chrome_console" || chromeName === "chrome_network_requests") {
    return makeResult({ ok: true, text });
  }

  if (chromeName === "chrome_start") {
    return makeResult({ ok: true, message: "Chrome backend is ready.", profileMode: "clean" });
  }

  if (chromeName === "chrome_stop") {
    return makeResult({ ok: true, message: "Chrome closed." });
  }

  return makeResult({ ok: true, text });
}

async function executeOnBackend(toolName, args) {
  try {
    return await backendClient.callTool({ name: toolName, arguments: args });
  } catch (err) {
    return makeError(err?.message || String(err));
  }
}

async function executePendingAction(action) {
  const { backendTool, args } = action;

  // Scroll is implemented via evaluate on the backend.
  if (action.chromeName === "chrome_scroll") {
    const { direction, amount, selector } = args;
    let dx = 0;
    let dy = 0;
    if (direction === "up") dy = -amount;
    else if (direction === "down") dy = amount;
    else if (direction === "left") dx = -amount;
    else if (direction === "right") dx = amount;

    let fn;
    if (selector) {
      fn = `(el) => { const e = document.querySelector(${JSON.stringify(selector)}); if (e) e.scrollBy(${dx}, ${dy}); return { ok: true }; }`;
    } else {
      fn = `() => { window.scrollBy(${dx}, ${dy}); return { ok: true }; }`;
    }
    return executeOnBackend("browser_evaluate", { function: fn });
  }

  return executeOnBackend(backendTool, args);
}

async function handleChromeTool(name, args) {
  if (name === "chrome_start") {
    return makeResult({ ok: true, message: "Chrome backend is ready.", profileMode: "clean" });
  }

  if (name === "chrome_approve") {
    const approved = args?.approve === true;
    if (!approved) {
      const rejected = pendingAction;
      pendingAction = null;
      return makeResult({ ok: true, approved: false, message: rejected ? "Action rejected." : "Nothing to reject." });
    }
    if (!pendingAction) {
      return makeResult({ ok: true, approved: true, message: "Nothing pending to approve." });
    }
    const action = pendingAction;
    pendingAction = null;
    const result = await executePendingAction(action);
    const textObj = JSON.parse(result.content?.[0]?.text || "{}") || {};
    return makeResult({ ok: true, approved: true, ...textObj });
  }

  const backendTool = TOOL_MAP[name];
  if (!backendTool && !PROXY_TOOLS.has(name)) {
    return makeError(`Unknown tool: ${name}`);
  }

  const mappedArgs = mapArgs(name, args);

  if (WRITE_TOOLS.has(backendTool)) {
    if (pendingAction) {
      return makeError("A pending action already exists; approve or reject it first.");
    }
    pendingAction = { chromeName: name, backendTool, args: mappedArgs };
    return makeResult({
      ok: true,
      pending: true,
      message: `Pending approval: ${name}(${JSON.stringify(args)}). Run chrome_approve({approve:true}) to execute, or chrome_approve({approve:false}) to reject.`,
    });
  }

  const result = await executeOnBackend(backendTool, mappedArgs);
  return transformResult(name, result);
}

async function main() {
  await backendClient.connect(backendTransport);

  const backendTools = await backendClient.listTools();
  const chromeToolDefs = [];
  const knownChromeNames = Object.keys(TOOL_MAP);
  const seen = new Set();

  // Add explicit mappings.
  for (const chromeName of knownChromeNames) {
    const backendName = TOOL_MAP[chromeName];
    const backendDef = backendTools.tools.find((t) => t.name === backendName);
    seen.add(chromeName);
    chromeToolDefs.push({
      name: chromeName,
      description: backendDef?.description || `Proxy for ${backendName}`,
      inputSchema: backendDef?.inputSchema || { type: "object", properties: {} },
    });
  }

  // Add generic chrome aliases for any remaining backend tools (browser_* -> chrome_*).
  for (const tool of backendTools.tools) {
    if (!tool.name.startsWith("browser_")) continue;
    const chromeName = "chrome_" + tool.name.slice(8);
    if (seen.has(chromeName)) continue;
    seen.add(chromeName);
    TOOL_MAP[chromeName] = tool.name;
    chromeToolDefs.push({
      name: chromeName,
      description: tool.description || `Proxy for ${tool.name}`,
      inputSchema: tool.inputSchema || { type: "object", properties: {} },
    });
  }

  // Proxy-only tools
  chromeToolDefs.push({
    name: "chrome_approve",
    description: "Approve or reject a pending confirm-class action. Uses a unified pending-action queue.",
    inputSchema: { type: "object", properties: { approve: { type: "boolean", description: "true to approve, false to reject" } }, required: ["approve"] },
  });

  const server = new Server({ name: "klarpakke-chrome-proxy", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: chromeToolDefs }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};
    return await handleChromeTool(name, args);
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[chrome-proxy] Fatal error:", err);
  process.exit(1);
});
