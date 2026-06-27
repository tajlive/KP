#!/usr/bin/env node
/**
 * Chrome Control MCP Server
 *
 * Local stdio MCP server that exposes Playwright-based Chrome control tools.
 * Uses a persistent profile under .chrome-profile/ so logins survive restarts.
 *
 * Tools:
 *   chrome_start     — launch Chrome
 *   chrome_stop      — close Chrome
 *   chrome_navigate  — navigate to HTTPS URL (allowlist/session-approval gate)
 *   chrome_screenshot— viewport screenshot as base64 PNG
 *   chrome_extract   — extract text/attribute from element(s)
 *   chrome_evaluate  — run JS in page context
 *   chrome_click     — click element (confirm-class)
 *   chrome_fill      — fill input (confirm-class)
 *   chrome_select    — select option (confirm-class)
 *   chrome_approve   — resolve pending confirm/URL action
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import { mkdirSync, appendFileSync, existsSync, cpSync, rmSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PROFILE_DIR = resolve(ROOT, ".chrome-profile");
const LOG_DIR = resolve(ROOT, "logs");
const LOG_PATH = resolve(LOG_DIR, "chrome-mcp.log");

const DEFAULT_ALLOWLIST = ["klarpakke.no", "www.klarpakke.no"];
const ALLOWLIST = new Set([
  ...DEFAULT_ALLOWLIST,
  ...(process.env.CHROME_MCP_ALLOWLIST?.split(",").map((d) => d.trim()).filter(
    Boolean,
  ) || []),
]);

// ── SYSTEM PROFILE IMPORT ───────────────────────────────────────────────────

function systemChromeProfilePath() {
  if (process.platform === "darwin") {
    return resolve(process.env.HOME, "Library/Application Support/Google/Chrome");
  }
  if (process.platform === "linux") {
    return resolve(process.env.HOME, ".config/google-chrome");
  }
  if (process.platform === "win32") {
    return resolve(process.env.LOCALAPPDATA || "", "Google/Chrome/User Data");
  }
  return null;
}

function copySystemProfile() {
  const src = systemChromeProfilePath();
  if (!src || !existsSync(src)) {
    throw new Error(`System Chrome profile not found at ${src}`);
  }
  if (existsSync(PROFILE_DIR)) {
    rmSync(PROFILE_DIR, { recursive: true, force: true });
  }
  const skip = new Set([
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "lockfile",
    "Crashpad",
    "Code Cache",
    "GPUCache",
    "Service Worker",
    "Storage",
    "SharedStorage",
  ]);
  cpSync(src, PROFILE_DIR, {
    recursive: true,
    filter: (srcPath) => {
      const name = basename(srcPath);
      return !skip.has(name);
    },
  });
  return true;
}

// ── STATE ───────────────────────────────────────────────────────────────────

/** @type {import("playwright").BrowserContext | null} */
let browserContext = null;
/** @type {string | null} */
let sessionId = null;
const sessionApprovedHosts = new Set();

/** @type {{ type: string; args: Record<string, any> } | null} */
let pendingConfirm = null;
/** @type {string | null} */
let pendingNavigateUrl = null;

// ── HELPERS ─────────────────────────────────────────────────────────────────

function ensureLogDir() {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

function logEntry(entry) {
  ensureLogDir();
  try {
    appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  } catch {
    // logging must never break a tool call
  }
}

function textContent(text, isError = false) {
  return {
    content: [{ type: "text", text }],
    isError,
  };
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function getCurrentPage() {
  if (!browserContext) throw new Error("Chrome is not running. Call chrome_start first.");
  const pages = browserContext.pages();
  const page = pages[pages.length - 1];
  if (!page) throw new Error("No page available in Chrome.");
  return page;
}

function parseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isUrlAllowed(urlObj) {
  if (urlObj.protocol === "about:" && urlObj.href === "about:blank") return true;
  if (urlObj.protocol !== "https:") return false;
  return ALLOWLIST.has(urlObj.hostname) || sessionApprovedHosts.has(urlObj.hostname);
}

function validateNavigateUrl(url) {
  const urlObj = parseUrl(url);
  if (!urlObj) return { ok: false, error: `Invalid URL: ${url}` };
  if (urlObj.protocol === "file:") return { ok: false, error: "file:// URLs are not allowed." };
  if (urlObj.protocol === "ftp:" || urlObj.protocol === "ftps:") {
    return { ok: false, error: "ftp:// / ftps:// URLs are not allowed." };
  }
  if (!isUrlAllowed(urlObj)) {
    return {
      ok: false,
      error:
        `Domain ${urlObj.hostname} is not in the allowlist or session-approved. ` +
        `Run chrome_approve({approve:true}) to approve this URL for the session, ` +
        `or add the domain to CHROME_MCP_ALLOWLIST env var.`,
      pendingUrl: url,
    };
  }
  return { ok: true, urlObj };
}

// ── TOOL HANDLERS ───────────────────────────────────────────────────────────

async function handleStart(args) {
  const { chromium } = await import("playwright");

  if (browserContext) {
    const pages = browserContext.pages();
    return {
      ok: true,
      browserVersion: browserContext.browser()?.version(),
      pagesCount: pages.length,
      sessionId,
      message: "Chrome was already running; reused existing session.",
    };
  }

  if (args.useSystemProfile === true) {
    copySystemProfile();
  } else {
    mkdirSync(PROFILE_DIR, { recursive: true });
  }

  const headless = args.headless === true;
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless,
    args: [
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--disable-site-isolation-trials",
      "--window-size=1920,1080",
    ],
    ignoreDefaultArgs: ["--enable-automation"],
  });

  browserContext = context;
  sessionId = `chrome-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const pages = context.pages();
  return {
    ok: true,
    browserVersion: context.browser()?.version(),
    pagesCount: pages.length,
    sessionId,
    headless,
    useSystemProfile: args.useSystemProfile === true,
  };
}

async function handleStop() {
  if (!browserContext) {
    return { ok: true, message: "Chrome was not running." };
  }
  await browserContext.close();
  browserContext = null;
  return { ok: true, message: "Chrome closed." };
}

async function handleNavigate(args) {
  const url = String(args.url || "");
  const validation = validateNavigateUrl(url);

  if (!validation.ok) {
    if (validation.pendingUrl) {
      pendingNavigateUrl = validation.pendingUrl;
      pendingConfirm = null;
      return {
        ok: true,
        pending: true,
        message:
          `Domain ${validation.urlObj?.hostname || url} is not allowlisted. ` +
          `Run chrome_approve({approve:true}) to approve this domain for the session, ` +
          `or chrome_approve({approve:false}) to reject.`,
      };
    }
    throw new Error(validation.error);
  }

  const page = getCurrentPage();
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const title = await page.title().catch(() => "");
  const finalUrl = page.url();
  return { ok: true, title, url: finalUrl };
}

async function handleScreenshot() {
  const page = getCurrentPage();
  const buffer = await page.screenshot({ type: "png", fullPage: false });
  return {
    ok: true,
    base64: buffer.toString("base64"),
    mimeType: "image/png",
  };
}

async function handleExtract(args) {
  const page = getCurrentPage();
  const selector = args.selector ? String(args.selector) : null;

  if (!selector) {
    const title = await page.title().catch(() => "");
    const text = await page.evaluate(() => {
      const body = document.body;
      if (!body) return "";
      return body.innerText?.replace(/\s+/g, " ").trim() || "";
    });
    return { ok: true, title, text };
  }

  const attribute = args.attribute ? String(args.attribute) : null;

  const results = await page.evaluate(
    ({ sel, attr }) => {
      const nodes = Array.from(document.querySelectorAll(sel));
      if (attr) {
        return nodes.map((el) => el.getAttribute?.(attr) ?? null);
      }
      return nodes.map((el) => el.textContent?.replace(/\s+/g, " ").trim() ?? "");
    },
    { sel: selector, attr: attribute },
  );

  return {
    ok: true,
    selector,
    attribute,
    results,
    count: results.length,
  };
}

async function handleEvaluate(args) {
  const page = getCurrentPage();
  const userScript = String(args.script || "");
  const wrapped = `
    (async () => {
      try {
        return { ok: true, result: await (${userScript}) };
      } catch (err) {
        return { ok: false, error: err?.message || String(err) };
      }
    })()
  `;
  const value = await page.evaluate(wrapped);
  if (value && typeof value === "object" && !value.ok) {
    throw new Error(value.error || "Script evaluation failed");
  }
  return { ok: true, result: value?.result ?? value };
}

async function handleClick(args) {
  const selector = String(args.selector || "");
  if (!selector) throw new Error("selector is required");
  return {
    ok: true,
    pending: true,
    message:
      `Pending approval: click("${selector}"). ` +
      `Run chrome_approve({approve:true}) to execute, or chrome_approve({approve:false}) to reject.`,
    action: { type: "click", args: { selector } },
  };
}

async function handleFill(args) {
  const selector = String(args.selector || "");
  const value = String(args.value ?? "");
  if (!selector) throw new Error("selector is required");
  return {
    ok: true,
    pending: true,
    message:
      `Pending approval: fill("${selector}", "${value}"). ` +
      `Run chrome_approve({approve:true}) to execute, or chrome_approve({approve:false}) to reject.`,
    action: { type: "fill", args: { selector, value } },
  };
}

async function handleSelect(args) {
  const selector = String(args.selector || "");
  const value = String(args.value ?? "");
  if (!selector) throw new Error("selector is required");
  return {
    ok: true,
    pending: true,
    message:
      `Pending approval: select("${selector}", "${value}"). ` +
      `Run chrome_approve({approve:true}) to execute, or chrome_approve({approve:false}) to reject.`,
    action: { type: "select", args: { selector, value } },
  };
}

async function executePendingAction(action) {
  const page = getCurrentPage();
  switch (action.type) {
    case "click": {
      await page.click(action.args.selector);
      return { ok: true, executed: "click", selector: action.args.selector };
    }
    case "fill": {
      await page.fill(action.args.selector, action.args.value);
      return { ok: true, executed: "fill", selector: action.args.selector };
    }
    case "select": {
      await page.selectOption(action.args.selector, action.args.value);
      return { ok: true, executed: "select", selector: action.args.selector };
    }
    default:
      throw new Error(`Unknown pending action type: ${action.type}`);
  }
}

async function handleApprove(args) {
  const approved = args.approve === true;

  if (!approved) {
    const rejected = pendingConfirm || pendingNavigateUrl;
    pendingConfirm = null;
    pendingNavigateUrl = null;
    return { ok: true, approved: false, message: rejected ? "Action rejected." : "Nothing to reject." };
  }

  if (pendingConfirm) {
    const action = pendingConfirm;
    pendingConfirm = null;
    const result = await executePendingAction(action);
    return { ok: true, approved: true, ...result };
  }

  if (pendingNavigateUrl) {
    const url = pendingNavigateUrl;
    pendingNavigateUrl = null;
    const urlObj = parseUrl(url);
    if (urlObj && urlObj.hostname) {
      sessionApprovedHosts.add(urlObj.hostname);
    }
    return await handleNavigate({ url });
  }

  return { ok: true, approved: true, message: "Nothing pending to approve." };
}

// ── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "chrome_start",
    description: "Launch Chrome with a persistent user profile. Default is headed (headless:false). Use useSystemProfile:true to import your existing Chrome profile with saved passwords.",
    inputSchema: {
      type: "object",
      properties: {
        headless: { type: "boolean", description: "Run Chrome headless" },
        useSystemProfile: { type: "boolean", description: "Copy the system Chrome profile (with saved passwords/logins) into the local profile before launching" },
      },
      required: [],
    },
  },
  {
    name: "chrome_stop",
    description: "Close the Chrome browser.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "chrome_navigate",
    description:
      "Navigate to a URL. HTTPS only (or about:blank). Domain must be in allowlist or session-approved.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
      },
      required: ["url"],
    },
  },
  {
    name: "chrome_screenshot",
    description: "Capture the current page viewport as a base64 PNG.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "chrome_extract",
    description:
      "Extract text or an attribute from element(s). If no selector is given, returns page title + visible text.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        text: { type: "boolean", description: "Return textContent (default true)" },
        attribute: { type: "string", description: "Attribute name to extract instead of text" },
      },
      required: [],
    },
  },
  {
    name: "chrome_evaluate",
    description: "Run JavaScript in the page context and return a serializable result.",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript expression or function body" },
      },
      required: ["script"],
    },
  },
  {
    name: "chrome_click",
    description: "Click an element. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
      },
      required: ["selector"],
    },
  },
  {
    name: "chrome_fill",
    description: "Fill an input. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "chrome_select",
    description: "Select an option. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        value: { type: "string", description: "Option value" },
      },
      required: ["selector", "value"],
    },
  },
  {
    name: "chrome_approve",
    description:
      "Approve or reject a pending confirm-class action or pending navigation approval.",
    inputSchema: {
      type: "object",
      properties: {
        approve: { type: "boolean", description: "true to approve, false to reject" },
      },
      required: ["approve"],
    },
  },
];

// ── MCP SERVER ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "klarpakke-chrome-control", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const start = Date.now();
  let status = "ok";
  let error = null;
  let result = null;

  try {
    switch (name) {
      case "chrome_start":
        result = await handleStart(args || {});
        break;
      case "chrome_stop":
        result = await handleStop();
        break;
      case "chrome_navigate":
        result = await handleNavigate(args || {});
        break;
      case "chrome_screenshot":
        result = await handleScreenshot();
        break;
      case "chrome_extract":
        result = await handleExtract(args || {});
        break;
      case "chrome_evaluate":
        result = await handleEvaluate(args || {});
        break;
      case "chrome_click": {
        const clickResult = await handleClick(args || {});
        pendingConfirm = clickResult.action;
        result = { ok: true, pending: true, message: clickResult.message };
        break;
      }
      case "chrome_fill": {
        const fillResult = await handleFill(args || {});
        pendingConfirm = fillResult.action;
        result = { ok: true, pending: true, message: fillResult.message };
        break;
      }
      case "chrome_select": {
        const selectResult = await handleSelect(args || {});
        pendingConfirm = selectResult.action;
        result = { ok: true, pending: true, message: selectResult.message };
        break;
      }
      case "chrome_approve":
        result = await handleApprove(args || {});
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    status = "error";
    error = err?.message || String(err);
    return textContent(error, true);
  } finally {
    logEntry({
      timestamp: new Date().toISOString(),
      tool: name,
      args: args || {},
      status,
      error,
      durationMs: Date.now() - start,
    });
  }

  return textContent(safeJson(result), status === "error");
});

// ── MAIN ────────────────────────────────────────────────────────────────────

if (!process.env.MCP_API_KEY) {
  console.error(
    "[chrome-mcp] Warning: MCP_API_KEY is not set. Ignored for stdio transport, but wrapper scripts may require it.",
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("[chrome-mcp] Fatal error:", err);
  process.exit(1);
});
