#!/usr/bin/env node
/**
 * Chrome Control MCP Server v2.1
 *
 * Local stdio MCP server that exposes Playwright-based Chrome control tools.
 * Uses a persistent profile under .chrome-profile/ so logins survive restarts.
 * Optionally reuses the user's real Chrome profile (passwords, cookies, sessions)
 * via copy or CDP attach modes.
 *
 * Design goals:
 * - Low token usage: accessibility snapshot + concise responses
 * - Secure: approval gate for writes, URL allowlist, HTTPS-only
 * - Fast: local stdio, no npx startup
 *
 * Tools:
 *   chrome_start      — launch Chrome
 *   chrome_stop       — close Chrome
 *   chrome_navigate   — navigate to HTTPS URL (allowlist / approval gate)
 *   chrome_snapshot   — accessibility tree of the page
 *   chrome_screenshot — viewport screenshot as base64 PNG
 *   chrome_extract    — extract text/attribute from element(s)
 *   chrome_click      — click element (confirm-class)
 *   chrome_fill       — fill input (confirm-class)
 *   chrome_type       — type text character by character (confirm-class)
 *   chrome_select     — select option (confirm-class)
 *   chrome_press      — press a key (confirm-class)
 *   chrome_hover      — hover element (confirm-class)
 *   chrome_scroll     — scroll page or element (confirm-class)
 *   chrome_wait       — wait for selector / timeout / networkidle
 *   chrome_evaluate   — run JS in page context (confirm-class)
 *   chrome_pdf        — generate PDF of page
 *   chrome_console    — recent console messages
 *   chrome_approve    — resolve pending confirm action
 *   chrome_get_info   — show server/profile info
 *   chrome_import_session — re-import system profile/session into local profile
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";
import {
  mkdirSync,
  appendFileSync,
  existsSync,
  cpSync,
  rmSync,
  renameSync,
  readFileSync,
  statSync,
  readdirSync,
} from "fs";

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

const DEFAULT_CDP_URL = "http://127.0.0.1:9222";

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

function isChromeRunning(profilePath) {
  const lock = resolve(profilePath, "SingletonLock");
  if (!existsSync(lock)) return false;
  try {
    const contents = readFileSync(lock, "utf8").trim();
    return contents.length > 0;
  } catch {
    return false;
  }
}

function getProfileDirSize(dirPath) {
  if (!existsSync(dirPath)) return 0;
  let total = 0;
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const parent = entry.parentPath || entry.path || dirPath;
        total += statSync(resolve(parent, entry.name)).size;
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
  return total;
}

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log10(bytes) / 3);
  const value = bytes / Math.pow(1000, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

function copySystemProfile(options = {}) {
  const src = systemChromeProfilePath();
  if (!src || !existsSync(src)) {
    throw new Error(
      `System Chrome profile not found at ${src} (platform: ${process.platform})`,
    );
  }

  if (isChromeRunning(src)) {
    const lock = resolve(src, "SingletonLock");
    const pid = existsSync(lock)
      ? readFileSync(lock, "utf8").trim()
      : "unknown";
    throw new Error(
      `Chrome appears to be running with the system profile (SingletonLock found, pid=${pid}). ` +
        `Close Chrome first, or use profileMode='cdp' to connect to the running instance.`,
    );
  }

  let backupDir = null;
  if (existsSync(PROFILE_DIR)) {
    if (options.backup !== false) {
      backupDir = `${PROFILE_DIR}.backup-${Date.now()}`;
      renameSync(PROFILE_DIR, backupDir);
    } else {
      rmSync(PROFILE_DIR, { recursive: true, force: true });
    }
  }

  // Keep lock files and large transient caches out, but keep storage,
  // service workers, network cookies and password DBs.
  const skip = new Set([
    "SingletonLock",
    "SingletonCookie",
    "SingletonSocket",
    "lockfile",
    // Caches that are large and safe to rebuild
    "Code Cache",
    "GPUCache",
    "Cache",
    "GrShaderCache",
    "ShaderCache",
    "blob_storage",
  ]);

  cpSync(src, PROFILE_DIR, {
    recursive: true,
    filter: (srcPath) => {
      const name = basename(srcPath);
      return !skip.has(name);
    },
  });

  return { src, dest: PROFILE_DIR, backupDir };
}

function resolveProfileMode(args) {
  // Backwards compatibility: useSystemProfile:true maps to copy mode.
  if (args.profileMode) {
    const mode = String(args.profileMode).toLowerCase();
    if (!["clean", "copy", "cdp", "storage"].includes(mode)) {
      throw new Error(
        `Invalid profileMode: ${mode}. Allowed: clean, copy, cdp, storage`,
      );
    }
    return mode;
  }
  if (args.useSystemProfile === true) return "copy";
  return "clean";
}

// ── STATE ────────────────────────────────────────────────────────────────────

/** @type {import("playwright").Browser | null} */
let browser = null;
/** @type {import("playwright").BrowserContext | null} */
let browserContext = null;
/** @type {string | null} */
let sessionId = null;
/** @type {string | null} */
let currentProfileMode = null;
const sessionApprovedHosts = new Set();

/** @type {{ type: string; args: Record<string, any> } | null} */
let pendingAction = null;

const consoleMessages = [];

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
      pending: true,
      urlObj,
    };
  }
  return { ok: true, urlObj };
}

// ── DOM SNAPSHOT ────────────────────────────────────────────────────────────

let refCounter = 1;
const refMap = new Map();

function resetRefs() {
  refCounter = 1;
  refMap.clear();
}

async function buildSnapshot(page) {
  resetRefs();
  const snapshot = await page.evaluate(() => {
    const INTERACTIVE_ROLES = new Set([
      "button", "link", "textbox", "checkbox", "radio", "combobox", "menuitem",
      "tab", "searchbox", "spinbutton", "slider", "switch", "progressbar",
    ]);
    const INTERACTIVE_TAGS = new Set([
      "a", "button", "input", "select", "textarea", "summary", "details",
    ]);

    function isInteractive(el) {
      const role = el.getAttribute("role") || "";
      const tag = el.tagName.toLowerCase();
      if (role && INTERACTIVE_ROLES.has(role)) return true;
      if (INTERACTIVE_TAGS.has(tag)) return true;
      if (el.onclick || el.getAttribute("tabindex") === "0") return true;
      return false;
    }

    function getRole(el) {
      const explicit = el.getAttribute("role");
      if (explicit) return explicit;
      const tag = el.tagName.toLowerCase();
      if (tag === "a") return "link";
      if (tag === "button") return "button";
      if (tag === "input") return el.type || "textbox";
      if (tag === "select") return "combobox";
      if (tag === "textarea") return "textbox";
      return tag;
    }

    function getName(el) {
      return (
        el.getAttribute("aria-label") ||
        el.getAttribute("placeholder") ||
        el.getAttribute("title") ||
        el.innerText?.replace(/\s+/g, " ").trim().slice(0, 120) ||
        el.value?.slice(0, 120) ||
        ""
      );
    }

    function buildSelector(el) {
      const parts = [];
      let current = el;
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        if (current.id) {
          selector += `#${CSS.escape(current.id)}`;
          parts.unshift(selector);
          break;
        }
        const classes = Array.from(current.classList)
          .filter((c) => /^[a-zA-Z0-9_-]+$/.test(c) && c.length < 40)
          .slice(0, 2)
          .map((c) => CSS.escape(c))
          .join(".");
        if (classes) selector += `.${classes}`;
        if (current.getAttribute("data-testid")) {
          selector += `[data-testid="${CSS.escape(current.getAttribute("data-testid"))}"]`;
        } else if (current.getAttribute("name")) {
          selector += `[name="${CSS.escape(current.getAttribute("name"))}"]`;
        } else {
          const siblings = Array.from(current.parentElement?.children || []);
          const sameTag = siblings.filter((s) => s.tagName === current.tagName);
          if (sameTag.length > 1) {
            const index = sameTag.indexOf(current) + 1;
            selector += `:nth-of-type(${index})`;
          }
        }
        parts.unshift(selector);
        current = current.parentElement;
      }
      return parts.join(" > ");
    }

    const nodes = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let el;
    while ((el = walker.nextNode())) {
      if (isInteractive(el)) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          nodes.push({
            tag: el.tagName.toLowerCase(),
            role: getRole(el),
            name: getName(el),
            selector: buildSelector(el),
            type: el.type || undefined,
            href: el.getAttribute("href") || undefined,
            value: el.value || undefined,
          });
        }
      }
    }
    return nodes.slice(0, 200);
  });

  const compacted = snapshot.map((node) => {
    const ref = `e${refCounter++}`;
    refMap.set(ref, node);
    return { ref, ...node };
  });

  return {
    title: await page.title().catch(() => ""),
    url: page.url(),
    snapshot: compacted,
  };
}

function findElementByRef(ref) {
  return refMap.get(ref) || null;
}

// ── TOOL HANDLERS ───────────────────────────────────────────────────────────

async function handleStart(args) {
  const { chromium } = await import("playwright");
  const mode = resolveProfileMode(args);

  if (browserContext) {
    const pages = browserContext.pages();
    return {
      ok: true,
      browserVersion: browser?.version?.() || browserContext.browser()?.version?.(),
      pagesCount: pages.length,
      sessionId,
      profileMode: currentProfileMode,
      message: "Chrome was already running; reused existing session.",
    };
  }

  if (mode === "cdp") {
    const cdpUrl = process.env.CHROME_CDP_URL || args.cdpUrl || DEFAULT_CDP_URL;
    try {
      browser = await chromium.connectOverCDP(cdpUrl);
    } catch (err) {
      throw new Error(
        `Could not connect to Chrome at ${cdpUrl}. ` +
          `Make sure Chrome is started with --remote-debugging-port=${new URL(cdpUrl).port || "9222"}. ` +
          `Error: ${err?.message || String(err)}`,
      );
    }
    browserContext = browser.defaultBrowserContext();
  } else if (mode === "copy" || mode === "storage") {
    const copyResult = copySystemProfile({ backup: true });
    if (mode === "storage") {
      // In storage mode we still copy the whole profile, because Chrome's
      // encrypted password DB (Login Data) and network cookies require the
      // surrounding profile state. Copy is the only reliable way to reuse
      // existing passwords.
      copyResult.note =
        "storage mode copies the full profile because Chrome encrypts passwords " +
        "against the OS keychain and the encrypted DB must stay with its profile state.";
    }
    mkdirSync(PROFILE_DIR, { recursive: true });
    browserContext = await chromium.launchPersistentContext(PROFILE_DIR, buildLaunchOptions(args));
  } else {
    // clean mode
    mkdirSync(PROFILE_DIR, { recursive: true });
    browserContext = await chromium.launchPersistentContext(PROFILE_DIR, buildLaunchOptions(args));
  }

  // Collect console messages from all pages
  browserContext.on("page", (page) => {
    page.on("console", (msg) => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        time: new Date().toISOString(),
      });
      if (consoleMessages.length > 200) consoleMessages.shift();
    });
    page.on("pageerror", (err) => {
      consoleMessages.push({
        type: "pageerror",
        text: err.message,
        time: new Date().toISOString(),
      });
      if (consoleMessages.length > 200) consoleMessages.shift();
    });
  });

  sessionId = `chrome-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  currentProfileMode = mode;

  const pages = browserContext.pages();
  return {
    ok: true,
    browserVersion: browser?.version?.() || browserContext.browser()?.version?.(),
    pagesCount: pages.length,
    sessionId,
    headless: args.headless === true,
    profileMode: mode,
    cdpUrl: mode === "cdp" ? (process.env.CHROME_CDP_URL || args.cdpUrl || DEFAULT_CDP_URL) : undefined,
  };
}

function buildLaunchOptions(args) {
  const headless = args.headless === true;
  return {
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
  };
}

async function handleStop() {
  if (!browserContext) {
    return { ok: true, message: "Chrome was not running." };
  }
  await browserContext.close();
  if (browser) {
    try {
      await browser.close();
    } catch {
      // ignore
    }
    browser = null;
  }
  browserContext = null;
  sessionId = null;
  currentProfileMode = null;
  sessionApprovedHosts.clear();
  resetRefs();
  return { ok: true, message: "Chrome closed." };
}

async function handleGetInfo() {
  const sysPath = systemChromeProfilePath();
  const sysExists = sysPath ? existsSync(sysPath) : false;
  const sysRunning = sysPath ? isChromeRunning(sysPath) : false;
  const localExists = existsSync(PROFILE_DIR);
  const localSize = getProfileDirSize(PROFILE_DIR);

  const backups = [];
  try {
    const parent = dirname(PROFILE_DIR);
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith(".chrome-profile.backup-")) {
        backups.push(resolve(parent, entry.name));
      }
    }
  } catch {
    // ignore
  }

  return {
    ok: true,
    platform: process.platform,
    systemProfilePath: sysPath,
    systemProfileExists: sysExists,
    systemProfileRunning: sysRunning,
    localProfilePath: PROFILE_DIR,
    localProfileExists: localExists,
    localProfileSize: formatBytes(localSize),
    localProfileSizeBytes: localSize,
    currentSession: browserContext
      ? { sessionId, profileMode: currentProfileMode, pagesCount: browserContext.pages().length }
      : null,
    env: {
      CHROME_MCP_ALLOWLIST: process.env.CHROME_MCP_ALLOWLIST || null,
      CHROME_MCP_PROFILE_MODE: process.env.CHROME_MCP_PROFILE_MODE || null,
      CHROME_CDP_URL: process.env.CHROME_CDP_URL || null,
    },
    backups,
    allowlist: Array.from(ALLOWLIST),
  };
}

async function handleImportSession(args) {
  if (browserContext) {
    throw new Error(
      "Chrome is currently running. Stop Chrome with chrome_stop before importing a session.",
    );
  }
  const mode = args.mode || "copy";
  if (!["copy", "storage"].includes(mode)) {
    throw new Error(`Invalid import mode: ${mode}. Allowed: copy, storage`);
  }
  const result = copySystemProfile({ backup: true });
  return {
    ok: true,
    mode,
    ...result,
    message:
      `Imported system profile into ${result.dest}. ` +
      `Start Chrome with chrome_start({profileMode: "${mode}"}) to use it.`,
  };
}

async function handleNavigate(args) {
  const url = String(args.url || "");
  const validation = validateNavigateUrl(url);

  if (!validation.ok) {
    if (validation.pending) {
      pendingAction = { type: "navigate", args: { url, waitUntil: args.waitUntil || "domcontentloaded" } };
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
  await page.goto(url, { waitUntil: args.waitUntil || "domcontentloaded" });
  const title = await page.title().catch(() => "");
  const finalUrl = page.url();
  return { ok: true, title, url: finalUrl };
}

async function handleSnapshot() {
  const page = getCurrentPage();
  const snap = await buildSnapshot(page);
  return { ok: true, ...snap };
}

async function handleScreenshot(args) {
  const page = getCurrentPage();
  const opts = { type: "png" };
  if (args.fullPage === true) opts.fullPage = true;
  else opts.fullPage = false;
  const buffer = await page.screenshot(opts);
  return {
    ok: true,
    base64: buffer.toString("base64"),
    mimeType: "image/png",
    fullPage: opts.fullPage,
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
  const userScript = String(args.script || "");
  pendingAction = { type: "evaluate", args: { script: userScript } };
  return {
    ok: true,
    pending: true,
    message:
      `Pending approval: evaluate(${safeJson({ script: userScript })}). ` +
      `Run chrome_approve({approve:true}) to execute, or chrome_approve({approve:false}) to reject.`,
  };
}

async function handleClick(args) {
  const target = String(args.selector || args.ref || "");
  if (!target) throw new Error("selector or ref is required");
  return createPendingAction("click", { target });
}

async function handleFill(args) {
  const target = String(args.selector || args.ref || "");
  const value = String(args.value ?? "");
  if (!target) throw new Error("selector or ref is required");
  return createPendingAction("fill", { target, value });
}

async function handleType(args) {
  const target = String(args.selector || args.ref || "");
  const text = String(args.text || "");
  const delay = typeof args.delay === "number" ? args.delay : 10;
  if (!target) throw new Error("selector or ref is required");
  return createPendingAction("type", { target, text, delay });
}

async function handleSelect(args) {
  const target = String(args.selector || args.ref || "");
  const value = String(args.value ?? "");
  if (!target) throw new Error("selector or ref is required");
  return createPendingAction("select", { target, value });
}

async function handlePress(args) {
  const key = String(args.key || "");
  if (!key) throw new Error("key is required");
  return createPendingAction("press", { key });
}

async function handleHover(args) {
  const target = String(args.selector || args.ref || "");
  if (!target) throw new Error("selector or ref is required");
  return createPendingAction("hover", { target });
}

async function handleScroll(args) {
  const direction = args.direction || "down";
  const amount = typeof args.amount === "number" ? args.amount : 500;
  const target = args.selector || args.ref || null;
  return createPendingAction("scroll", { direction, amount, target });
}

async function handleWait(args) {
  const page = getCurrentPage();
  const selector = args.selector ? String(args.selector) : null;
  const timeout = typeof args.timeout === "number" ? args.timeout : 5000;
  const waitUntil = args.waitUntil || null;

  if (selector) {
    await page.waitForSelector(selector, { timeout, state: args.state || "visible" });
    return { ok: true, waitedFor: "selector", selector, timeout };
  }
  if (waitUntil === "networkidle") {
    await page.waitForLoadState("networkidle", { timeout });
    return { ok: true, waitedFor: "networkidle", timeout };
  }
  if (waitUntil === "load") {
    await page.waitForLoadState("load", { timeout });
    return { ok: true, waitedFor: "load", timeout };
  }

  await page.waitForTimeout(timeout);
  return { ok: true, waitedFor: "timeout", timeout };
}

async function handlePdf(args) {
  const page = getCurrentPage();
  const buffer = await page.pdf({
    format: args.format || "A4",
    printBackground: true,
  });
  return {
    ok: true,
    base64: buffer.toString("base64"),
    mimeType: "application/pdf",
  };
}

async function handleConsole(args) {
  const limit = typeof args.limit === "number" ? args.limit : 50;
  const type = args.type || null;
  let messages = consoleMessages.slice(-limit);
  if (type) {
    messages = messages.filter((m) => m.type === type);
  }
  return { ok: true, count: messages.length, messages };
}

// ── PENDING ACTION HELPERS ──────────────────────────────────────────────────

function createPendingAction(type, actionArgs) {
  pendingAction = { type, args: actionArgs };
  return {
    ok: true,
    pending: true,
    message:
      `Pending approval: ${type}(${safeJson(actionArgs)}). ` +
      `Run chrome_approve({approve:true}) to execute, or chrome_approve({approve:false}) to reject.`,
  };
}

function resolveTarget(target) {
  // If target looks like a ref (e.g. "e42"), resolve to the stored CSS selector
  if (typeof target === "string" && /^e\d+$/i.test(target)) {
    const node = findElementByRef(target);
    if (node?.selector) {
      return node.selector;
    }
    throw new Error(`Ref ${target} not found in current snapshot. Call chrome_snapshot first.`);
  }
  return target;
}

async function executePendingAction(action) {
  const page = getCurrentPage();
  switch (action.type) {
    case "navigate": {
      const url = action.args.url;
      const urlObj = parseUrl(url);
      if (urlObj && urlObj.hostname) {
        sessionApprovedHosts.add(urlObj.hostname);
      }
      return await handleNavigate(action.args);
    }
    case "evaluate": {
      const userScript = action.args.script;
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
      return { ok: true, executed: "evaluate", result: value?.result ?? value };
    }
    case "click": {
      const target = resolveTarget(action.args.target);
      await page.click(target);
      return { ok: true, executed: "click", target };
    }
    case "fill": {
      const target = resolveTarget(action.args.target);
      await page.fill(target, action.args.value);
      return { ok: true, executed: "fill", target };
    }
    case "type": {
      const target = resolveTarget(action.args.target);
      await page.type(target, action.args.text, { delay: action.args.delay });
      return { ok: true, executed: "type", target, text: action.args.text };
    }
    case "select": {
      const target = resolveTarget(action.args.target);
      await page.selectOption(target, action.args.value);
      return { ok: true, executed: "select", target, value: action.args.value };
    }
    case "press": {
      await page.keyboard.press(action.args.key);
      return { ok: true, executed: "press", key: action.args.key };
    }
    case "hover": {
      const target = resolveTarget(action.args.target);
      await page.hover(target);
      return { ok: true, executed: "hover", target };
    }
    case "scroll": {
      const { direction, amount, target } = action.args;
      let x = 0;
      let y = 0;
      if (direction === "up") y = -amount;
      else if (direction === "down") y = amount;
      else if (direction === "left") x = -amount;
      else if (direction === "right") x = amount;

      if (target) {
        const resolved = resolveTarget(target);
        await page.locator(resolved).evaluate((el, { x, y }) => el.scrollBy(x, y), { x, y });
      } else {
        await page.evaluate(({ x, y }) => window.scrollBy(x, y), { x, y });
      }
      return { ok: true, executed: "scroll", direction, amount, target };
    }
    default:
      throw new Error(`Unknown pending action type: ${action.type}`);
  }
}

async function handleApprove(args) {
  const approved = args.approve === true;

  if (!approved) {
    const rejected = pendingAction;
    pendingAction = null;
    return { ok: true, approved: false, message: rejected ? "Action rejected." : "Nothing to reject." };
  }

  if (pendingAction) {
    const action = pendingAction;
    pendingAction = null;
    const result = await executePendingAction(action);
    return { ok: true, approved: true, ...result };
  }

  return { ok: true, approved: true, message: "Nothing pending to approve." };
}

// ── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "chrome_start",
    description:
      "Launch Chrome with a persistent user profile. Default is headed (headless:false) and uses a clean local profile. " +
      "Use profileMode='copy' (or the legacy useSystemProfile:true) to import your existing Chrome profile with saved passwords/logins. " +
      "Use profileMode='cdp' to attach to an already running Chrome via CDP (requires --remote-debugging-port). " +
      "Use profileMode='storage' for the same as copy but documented as storage/session focused.",
    inputSchema: {
      type: "object",
      properties: {
        headless: { type: "boolean", description: "Run Chrome headless" },
        useSystemProfile: {
          type: "boolean",
          description: "Legacy: copy the system Chrome profile into the local profile before launching (same as profileMode='copy')",
        },
        profileMode: {
          type: "string",
          enum: ["clean", "copy", "cdp", "storage"],
          description:
            "Profile mode: clean (default, isolated), copy (import system Chrome profile), " +
            "cdp (attach to running Chrome), storage (copy system profile for session reuse)",
        },
        cdpUrl: {
          type: "string",
          description: "CDP endpoint URL when profileMode='cdp'. Defaults to CHROME_CDP_URL env or http://127.0.0.1:9222",
        },
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
    name: "chrome_get_info",
    description:
      "Return information about the server, detected system Chrome profile, local profile, current session, and environment.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "chrome_import_session",
    description:
      "Import/copy the system Chrome profile into the local .chrome-profile/ directory. Requires Chrome to be stopped. " +
      "After importing, start Chrome with profileMode='copy' or 'storage' to use the imported session.",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["copy", "storage"],
          description: "Import mode. copy imports the whole profile; storage does the same but is documented for session reuse.",
        },
      },
      required: [],
    },
  },
  {
    name: "chrome_navigate",
    description:
      "Navigate to a URL. HTTPS only (or about:blank). Domain must be in allowlist or session-approved; otherwise the navigation is set to pending approval.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to navigate to" },
        waitUntil: { type: "string", enum: ["load", "domcontentloaded", "networkidle", "commit"], description: "Navigation wait condition" },
      },
      required: ["url"],
    },
  },
  {
    name: "chrome_snapshot",
    description: "Return an accessibility tree snapshot of the current page. Use refs from the snapshot when asking for clicks/fills, or use CSS selectors.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "chrome_screenshot",
    description: "Capture the current page viewport (or full page) as a base64 PNG.",
    inputSchema: {
      type: "object",
      properties: {
        fullPage: { type: "boolean", description: "Capture full scrollable page" },
      },
      required: [],
    },
  },
  {
    name: "chrome_extract",
    description:
      "Extract text or an attribute from element(s). If no selector is given, returns page title + visible text.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        attribute: { type: "string", description: "Attribute name to extract instead of text" },
      },
      required: [],
    },
  },
  {
    name: "chrome_click",
    description: "Click an element. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        ref: { type: "string", description: "Reference from chrome_snapshot" },
      },
      required: [],
    },
  },
  {
    name: "chrome_fill",
    description: "Fill an input. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        ref: { type: "string", description: "Reference from chrome_snapshot" },
        value: { type: "string", description: "Value to fill" },
      },
      required: ["value"],
    },
  },
  {
    name: "chrome_type",
    description: "Type text into an input character by character. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        ref: { type: "string", description: "Reference from chrome_snapshot" },
        text: { type: "string", description: "Text to type" },
        delay: { type: "number", description: "Delay between keystrokes in ms (default 10)" },
      },
      required: ["text"],
    },
  },
  {
    name: "chrome_select",
    description: "Select an option. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        ref: { type: "string", description: "Reference from chrome_snapshot" },
        value: { type: "string", description: "Option value" },
      },
      required: ["value"],
    },
  },
  {
    name: "chrome_press",
    description: "Press a key (e.g. Enter, Tab, Escape). Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key to press" },
      },
      required: ["key"],
    },
  },
  {
    name: "chrome_hover",
    description: "Hover over an element. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector" },
        ref: { type: "string", description: "Reference from chrome_snapshot" },
      },
      required: [],
    },
  },
  {
    name: "chrome_scroll",
    description: "Scroll the page or an element. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["up", "down", "left", "right"], description: "Scroll direction" },
        amount: { type: "number", description: "Pixels to scroll (default 500)" },
        selector: { type: "string", description: "CSS selector of element to scroll" },
        ref: { type: "string", description: "Reference from chrome_snapshot" },
      },
      required: [],
    },
  },
  {
    name: "chrome_wait",
    description: "Wait for a selector, navigation state, or a fixed timeout.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "CSS selector to wait for" },
        state: { type: "string", enum: ["attached", "detached", "visible", "hidden"], description: "Selector state" },
        waitUntil: { type: "string", enum: ["load", "networkidle"], description: "Navigation state" },
        timeout: { type: "number", description: "Timeout in ms (default 5000)" },
      },
      required: [],
    },
  },
  {
    name: "chrome_evaluate",
    description: "Run JavaScript in the page context and return a serializable result. Confirm-class: requires chrome_approve before execution.",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string", description: "JavaScript expression or function body" },
      },
      required: ["script"],
    },
  },
  {
    name: "chrome_pdf",
    description: "Generate a PDF of the current page and return it as base64.",
    inputSchema: {
      type: "object",
      properties: {
        format: { type: "string", description: "PDF format (default A4)" },
      },
      required: [],
    },
  },
  {
    name: "chrome_console",
    description: "Get recent console messages from the browser.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max messages to return (default 50)" },
        type: { type: "string", description: "Filter by message type (log, warn, error, pageerror)" },
      },
      required: [],
    },
  },
  {
    name: "chrome_approve",
    description:
      "Approve or reject a pending confirm-class action or pending navigation approval. Uses a unified pending-action queue.",
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
  { name: "klarpakke-chrome-control", version: "2.1.0" },
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
      case "chrome_get_info":
        result = await handleGetInfo();
        break;
      case "chrome_import_session":
        result = await handleImportSession(args || {});
        break;
      case "chrome_navigate":
        result = await handleNavigate(args || {});
        break;
      case "chrome_snapshot":
        result = await handleSnapshot();
        break;
      case "chrome_screenshot":
        result = await handleScreenshot(args || {});
        break;
      case "chrome_extract":
        result = await handleExtract(args || {});
        break;
      case "chrome_click":
        result = await handleClick(args || {});
        break;
      case "chrome_fill":
        result = await handleFill(args || {});
        break;
      case "chrome_type":
        result = await handleType(args || {});
        break;
      case "chrome_select":
        result = await handleSelect(args || {});
        break;
      case "chrome_press":
        result = await handlePress(args || {});
        break;
      case "chrome_hover":
        result = await handleHover(args || {});
        break;
      case "chrome_scroll":
        result = await handleScroll(args || {});
        break;
      case "chrome_wait":
        result = await handleWait(args || {});
        break;
      case "chrome_evaluate":
        result = await handleEvaluate(args || {});
        break;
      case "chrome_pdf":
        result = await handlePdf(args || {});
        break;
      case "chrome_console":
        result = await handleConsole(args || {});
        break;
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
