#!/usr/bin/env node
/**
 * KIMI Bridge — Optimalisert lokal MCP-wrapper v2.2
 *
 * Ytelsesforbedringer:
 *   - Pre-kompilerbar (ingen tsx-overhead i produksjon)
 *   - Dual transport: stdio (lokal) + HTTP (persistent / remote)
 *   - TTL-cache på read-only kall (monitor, db_status)
 *   - Single-flight dedupe (identiske kall deler Promise)
 *   - Concurrency semaphore (kimi_code/ci maks 1 samtidig)
 *   - Fast-path: health:full og db:status uten npm-overhead
 *   - Kompakte responser som default (verbose for full output)
 *   - Strukturert JSON-logging til logs/mcp-bridge.log
 *
 * Bygg:
 *   node scripts/mcp/build-bridge.mjs
 *
 * Start stdio (default):
 *   node scripts/mcp/dist/kimi-bridge.js
 *
 * Start HTTP:
 *   TRANSPORT=http PORT=3100 MCP_API_KEY=xxx node scripts/mcp/dist/kimi-bridge.js
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { spawn } from "child_process";
import { createServer } from "http";
import { resolve } from "path";
import { mkdirSync, appendFileSync } from "fs";

const REPO_ROOT = "/Users/taj/klarpakke";
const MAX_PAYLOAD = 200_000;
const DEFAULT_TRUNCATE = 2_000;
const CACHE_TTL_MS = 60_000;

// ── OBSERVABILITY ───────────────────────────────────────────────────────────

interface LogEntry {
  tool_name: string;
  queue_ms: number;
  exec_ms: number;
  payload_in_bytes: number;
  payload_out_bytes: number;
  cache_hit: boolean;
  dedupe_hit: boolean;
  exit_code: number | null;
  timestamp: string;
  status: "ok" | "error";
  tool_mode: "fast-path" | "kimi";
  verbose: boolean;
  schema_version: string;
}

function writeLog(entry: LogEntry) {
  try {
    const logDir = resolve(REPO_ROOT, "logs");
    const logPath = resolve(logDir, "mcp-bridge.log");
    mkdirSync(logDir, { recursive: true });
    appendFileSync(logPath, JSON.stringify(entry) + "\n");
  } catch {
    // logging skal aldri knekke verktøykall
  }
}

// ── CACHE ───────────────────────────────────────────────────────────────────

class Cache {
  private store = new Map<string, { value: StructuredResult; ts: number }>();
  hits = 0;
  misses = 0;

  constructor(private ttlMs: number) {}

  get(key: string): StructuredResult | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }
    if (Date.now() - entry.ts > this.ttlMs) {
      this.store.delete(key);
      this.misses++;
      return undefined;
    }
    this.hits++;
    return entry.value;
  }

  set(key: string, value: StructuredResult): void {
    this.store.set(key, { value, ts: Date.now() });
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.store.clear();
      return;
    }
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) this.store.delete(key);
    }
  }

  stats() {
    return { entries: this.store.size, hits: this.hits, misses: this.misses };
  }
}

const cache = new Cache(CACHE_TTL_MS);

// ── SINGLE-FLIGHT DEDUPE ────────────────────────────────────────────────────

const inFlight = new Map<string, Promise<StructuredResult>>();

function dedupeKey(name: string, args: Record<string, any>): string {
  // Strip verbose og timeout fra dedupe-nøkkel siden de ikke endrer resultatet
  const { verbose: _v, timeout: _t, refresh: _r, ...core } = args;
  return `${name}:${JSON.stringify(core)}`;
}

async function withDedupe(
  key: string,
  fn: () => Promise<StructuredResult>
): Promise<StructuredResult> {
  if (inFlight.has(key)) {
    const result = await inFlight.get(key)!;
    return { ...result, dedupe: true };
  }
  const promise = fn().finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ── CONCURRENCY SEMAPHORE ───────────────────────────────────────────────────

type ReleaseFn = () => void;

class Semaphore {
  private queue: ((release: ReleaseFn) => void)[] = [];
  private count: number;

  constructor(n: number) {
    this.count = n;
  }

  async acquire(): Promise<ReleaseFn> {
    if (this.count > 0) {
      this.count--;
      return () => {
        this.count++;
        this.flush();
      };
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private flush() {
    if (this.queue.length > 0 && this.count > 0) {
      this.count--;
      const resolve = this.queue.shift()!;
      resolve(() => {
        this.count++;
        this.flush();
      });
    }
  }
}

const codeSemaphore = new Semaphore(1);
const ciSemaphore = new Semaphore(1);

// ── VERKTØYDEFINISJONER ─────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "kimi_code",
    description:
      "Be KIMI om å lese/skrive kode i Klarpakke-repoet. Filoperasjoner er begrenset til repo-root. Maks 1 samtidig.",
    inputSchema: {
      type: "object" as const,
      properties: {
        instruction: {
          type: "string" as const,
          description: "Hva som skal gjøres",
        },
        filePath: {
          type: "string" as const,
          description: "Målfil (valgfri, men anbefalt)",
        },
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 300000)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "kimi_ci",
    description:
      "Kjør CI-gate: lint og type-check parallelt, deretter unit-test. Maks 1 samtidig.",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 300000)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "kimi_db_status",
    description:
      "Sjekk database-migrasjonsstatus (cachet 60s, deduplisert, fast-path uten npm-overhead).",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 60000)",
        },
        refresh: {
          type: "boolean" as const,
          description: "Tving nytt oppslag (ignorer cache)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "kimi_monitor_full",
    description:
      "Kjør full helsecheck for prod, API, supabase, signals, trading (cachet 60s, deduplisert, fast-path uten npm-overhead).",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 60000)",
        },
        refresh: {
          type: "boolean" as const,
          description: "Tving nytt oppslag (ignorer cache)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "kimi_oauth_check",
    description:
      "Sjekk produksjonskonfigurasjonen for OAuth (Supabase Auth URL + Google provider). Read-only.",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 60000)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "kimi_oauth_fix",
    description:
      "Fiks produksjons-Supabase Auth URL-konfigurasjon (site_url + redirect_urls) automatisk.",
    inputSchema: {
      type: "object" as const,
      properties: {
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 60000)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: [],
    },
  },
  {
    name: "kimi_oauth_enable_google",
    description:
      "Aktiver Google OAuth provider i produksjons-Supabase Auth. Krever Google Client ID og Client Secret.",
    inputSchema: {
      type: "object" as const,
      properties: {
        clientId: {
          type: "string" as const,
          description: "Google OAuth Client ID",
        },
        secret: {
          type: "string" as const,
          description: "Google OAuth Client Secret",
        },
        timeout: {
          type: "number" as const,
          description: "Timeout i ms (default: 60000)",
        },
        verbose: {
          type: "boolean" as const,
          description: "Returner fulle detaljer (default: false)",
        },
      },
      required: ["clientId", "secret"],
    },
  },
  {
    name: "kimi_memory_query",
    description:
      "Søk i Honcho memory om bruker, prosjekt eller tidligere beslutninger. Bruk når du trenger kontekst om hva som er blitt sagt eller bestemt.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const, description: "Hva leter du etter?" },
        peer: { type: "string" as const, default: "user", description: "Hvem søker du om?" },
      },
      required: ["query"],
    },
  },
  {
    name: "kimi_memory_save",
    description:
      "Lagre en konklusjon eller beslutning i Honcho memory. Bruk når du har lært noe nytt om brukeren eller prosjektet.",
    inputSchema: {
      type: "object" as const,
      properties: {
        conclusion: { type: "string" as const, description: "Faktum eller beslutning å lagre" },
        peer: { type: "string" as const, default: "user", description: "Hvem gjelder det?" },
      },
      required: ["conclusion"],
    },
  },
];

// ── HJELPERE ────────────────────────────────────────────────────────────────

interface StructuredResult {
  ok: boolean;
  command: string;
  summary: string;
  details?: string;
  cached?: boolean;
  dedupe?: boolean;
}

function isWithinRepo(filePath: string): boolean {
  const normalized = resolve(REPO_ROOT, filePath);
  return normalized.startsWith(REPO_ROOT);
}

function truncate(
  details: string | undefined,
  verbose: boolean
): string | undefined {
  if (!details) return undefined;
  const limit = verbose ? MAX_PAYLOAD : DEFAULT_TRUNCATE;
  if (details.length <= limit) return details;
  return (
    details.slice(0, limit) +
    `\n... [truncated: ${details.length - limit} chars, use verbose:true for full]`
  );
}

function runCommand(
  cmd: string,
  args: string[] = [],
  timeoutMs = 300_000
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: REPO_ROOT,
      env: { ...process.env, FORCE_COLOR: "0", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: -1 });
    });
  });
}

async function runNpmScript(
  script: string,
  timeoutMs = 300_000
): Promise<StructuredResult> {
  const { stdout, stderr, exitCode } = await runCommand(
    "npm",
    ["run", script],
    timeoutMs
  );
  const text = (stdout || stderr || "(ingen output)").trim();
  const ok = exitCode === 0;
  return {
    ok,
    command: `npm run ${script}`,
    summary: ok ? `${script} OK` : `${script} FEIL (exit ${exitCode})`,
    details: text,
  };
}

// Fast-path: kall node-script direkte uten npm-overhead (~100-150ms spart)
async function runHealthFull(
  timeoutMs = 300_000
): Promise<StructuredResult> {
  const { stdout, stderr, exitCode } = await runCommand(
    "node",
    ["scripts/health-check.mjs", "full"],
    timeoutMs
  );
  const text = (stdout || stderr || "(ingen output)").trim();
  const ok = exitCode === 0;
  return {
    ok,
    command: "node scripts/health-check.mjs full",
    summary: ok ? "health:full OK" : `health:full FEIL (exit ${exitCode})`,
    details: text,
  };
}

// Fast-path: kall supabase CLI direkte uten npm-overhead (~100-150ms spart)
async function runDbStatus(
  timeoutMs = 300_000
): Promise<StructuredResult> {
  const { stdout, stderr, exitCode } = await runCommand(
    "supabase",
    ["migration", "list", "--linked"],
    timeoutMs
  );
  const text = (stdout || stderr || "(ingen output)").trim();
  const ok = exitCode === 0;
  return {
    ok,
    command: "supabase migration list --linked",
    summary: ok ? "db:status OK" : `db:status FEIL (exit ${exitCode})`,
    details: text,
  };
}

async function runOauthCheck(timeoutMs = 60_000): Promise<StructuredResult> {
  const { stdout, stderr, exitCode } = await runCommand(
    "node",
    ["scripts/check-oauth-prod.mjs"],
    timeoutMs
  );
  const text = (stdout || stderr || "(ingen output)").trim();
  const ok = exitCode === 0;
  return {
    ok,
    command: "node scripts/check-oauth-prod.mjs",
    summary: ok ? "oauth:check OK" : `oauth:check FEIL (exit ${exitCode})`,
    details: text,
  };
}

async function runOauthFix(timeoutMs = 60_000): Promise<StructuredResult> {
  const { stdout, stderr, exitCode } = await runCommand(
    "node",
    ["scripts/fix-oauth-prod.mjs"],
    timeoutMs
  );
  const text = (stdout || stderr || "(ingen output)").trim();
  const ok = exitCode === 0;
  return {
    ok,
    command: "node scripts/fix-oauth-prod.mjs",
    summary: ok ? "oauth:fix OK" : `oauth:fix FEIL (exit ${exitCode})`,
    details: text,
  };
}

async function runOauthEnableGoogle(
  clientId: string,
  secret: string,
  timeoutMs = 60_000
): Promise<StructuredResult> {
  const { stdout, stderr, exitCode } = await runCommand(
    "node",
    ["scripts/enable-google-oauth-prod.mjs", "--client-id", clientId, "--secret", secret],
    timeoutMs
  );
  const text = (stdout || stderr || "(ingen output)").trim();
  const ok = exitCode === 0;
  return {
    ok,
    command: "node scripts/enable-google-oauth-prod.mjs --client-id *** --secret ***",
    summary: ok ? "oauth:enable_google OK" : `oauth:enable_google FEIL (exit ${exitCode})`,
    details: text,
  };
}

async function callKimi(
  prompt: string,
  timeoutMs = 300_000
): Promise<StructuredResult> {
  return new Promise((resolve) => {
    const child = spawn("kimi", ["--quiet"], {
      cwd: REPO_ROOT,
      env: { ...process.env, FORCE_COLOR: "0", CI: "true" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    child.stdin.write(prompt + "\n");
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      clearTimeout(timer);
      let text = (stdout || stderr || "(ingen output)").trim();
      text = text.replace(/\n?To resume this session: .*$/m, "").trim();
      const ok = code === 0 && !timedOut;
      resolve({
        ok,
        command: "kimi --quiet",
        summary: timedOut
          ? `KIMI timeout etter ${timeoutMs}ms`
          : ok
            ? "KIMI OK"
            : `KIMI feil (exit ${code})`,
        details: text,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        ok: false,
        command: "kimi --quiet",
        summary: `KIMI feil: ${err.message}`,
        details: stderr,
      });
    });
  });
}

function cacheKey(name: string, args: Record<string, any>): string {
  return `${name}:${JSON.stringify(args)}`;
}

// ── MCP SERVER ──────────────────────────────────────────────────────────────

const server = new Server(
  { name: "klarpakke-kimi-bridge", version: "2.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as {
    name: string;
    arguments: Record<string, any>;
  };

  const start = Date.now();
  const payloadIn = JSON.stringify(args).length;
  let result: StructuredResult;
  let queueMs = 0;
  let execMs = 0;
  let cacheHit = false;
  let dedupeHit = false;
  let exitCode: number | null = null;

  const verbose = args.verbose === true;

  switch (name) {
    case "kimi_code": {
      if (args.filePath && !isWithinRepo(args.filePath)) {
        result = {
          ok: false,
          command: "kimi_code",
          summary: "Path guard avslått",
          details: `${args.filePath} er utenfor ${REPO_ROOT}`,
        };
        execMs = 0;
        exitCode = -1;
        break;
      }

      const prompt = args.filePath
        ? `Arbeid med filen ${args.filePath}. ${args.instruction}`
        : args.instruction;

      const queuedAt = Date.now();
      const release = await codeSemaphore.acquire();
      queueMs = Date.now() - queuedAt;

      try {
        const execStart = Date.now();
        result = await callKimi(prompt, args.timeout);
        execMs = Date.now() - execStart;
        exitCode = result.ok ? 0 : 1;
      } finally {
        release();
      }

      cache.invalidate("kimi_monitor");
      break;
    }

    case "kimi_ci": {
      const t = args.timeout || 300_000;
      const ciQueuedAt = Date.now();
      const release = await ciSemaphore.acquire();
      queueMs = Date.now() - ciQueuedAt;

      try {
        const execStart = Date.now();

        // Parallell kjøring av lint og type-check
        const [lint, tc] = await Promise.all([
          runNpmScript("lint:gate", Math.floor(t / 2)),
          runNpmScript("type-check", Math.floor(t / 2)),
        ]);

        if (!lint.ok) {
          result = {
            ok: false,
            command: "kimi_ci",
            summary: `CI avbrutt ved lint:gate`,
            details: lint.details,
          };
          execMs = Date.now() - execStart;
          exitCode = lint.ok ? 0 : 1;
          break;
        }

        if (!tc.ok) {
          result = {
            ok: false,
            command: "kimi_ci",
            summary: `CI avbrutt ved type-check`,
            details: tc.details,
          };
          execMs = Date.now() - execStart;
          exitCode = tc.ok ? 0 : 1;
          break;
        }

        const test = await runNpmScript(
          "test:unit",
          Math.max(10_000, t - (Date.now() - execStart))
        );

        result = {
          ok: test.ok,
          command: "kimi_ci",
          summary: test.ok
            ? `CI gate OK — lint + type-check + test`
            : `CI feil ved test:unit`,
          details: [lint.details, tc.details, test.details]
            .filter(Boolean)
            .join("\n---\n"),
        };
        execMs = Date.now() - execStart;
        exitCode = test.ok ? 0 : 1;
      } finally {
        release();
      }
      break;
    }

    case "kimi_db_status": {
      const key = cacheKey(name, args);
      if (!args.refresh) {
        const cached = cache.get(key);
        if (cached) {
          result = { ...cached, cached: true };
          cacheHit = true;
          execMs = 0;
          exitCode = 0;
          break;
        }
      }

      const dKey = dedupeKey(name, args);
      const dbStart = Date.now();
      result = await withDedupe(dKey, async () => {
        // Fast-path: kall supabase CLI direkte uten npm-overhead
        const r = await runDbStatus(args.timeout);
        return r;
      });
      execMs = Date.now() - dbStart;
      dedupeHit = !!result.dedupe;

      if (result.ok) cache.set(key, result);
      exitCode = result.ok ? 0 : 1;
      break;
    }

    case "kimi_monitor_full": {
      const key = cacheKey(name, args);
      if (!args.refresh) {
        const cached = cache.get(key);
        if (cached) {
          result = { ...cached, cached: true };
          cacheHit = true;
          execMs = 0;
          exitCode = 0;
          break;
        }
      }

      const dKey = dedupeKey(name, args);
      const monStart = Date.now();
      result = await withDedupe(dKey, async () => {
        // Fast-path: kall node direkte uten npm-overhead
        const r = await runHealthFull(args.timeout);
        return r;
      });
      execMs = Date.now() - monStart;
      dedupeHit = !!result.dedupe;

      if (result.ok) cache.set(key, result);
      exitCode = result.ok ? 0 : 1;
      break;
    }

    case "kimi_oauth_check": {
      const execStart = Date.now();
      result = await runOauthCheck(args.timeout);
      execMs = Date.now() - execStart;
      exitCode = result.ok ? 0 : 1;
      break;
    }

    case "kimi_oauth_fix": {
      const fixStart = Date.now();
      result = await runOauthFix(args.timeout);
      execMs = Date.now() - fixStart;
      exitCode = result.ok ? 0 : 1;
      break;
    }

    case "kimi_oauth_enable_google": {
      const enableStart = Date.now();
      result = await runOauthEnableGoogle(args.clientId, args.secret, args.timeout);
      execMs = Date.now() - enableStart;
      exitCode = result.ok ? 0 : 1;
      break;
    }

    case "kimi_memory_query": {
      const queryStart = Date.now();
      result = {
        ok: true,
        command: name,
        summary: `Søkte etter: ${args.query}`,
        details: `Honcho memory query for peer "${args.peer || 'user'}":\n\nDette er en placeholder — Honcho API må kalles fra Kimi Desktop direkte.\n\nQuery: ${args.query}\nPeer: ${args.peer || 'user'}`,
      };
      execMs = Date.now() - queryStart;
      exitCode = 0;
      break;
    }

    case "kimi_memory_save": {
      const saveStart = Date.now();
      result = {
        ok: true,
        command: name,
        summary: `Lagret: ${args.conclusion.slice(0, 50)}...`,
        details: `Honcho memory save for peer "${args.peer || 'user'}":\n\nDette er en placeholder — Honcho API må kalles fra Kimi Desktop direkte.\n\nConclusion: ${args.conclusion}\nPeer: ${args.peer || 'user'}`,
      };
      execMs = Date.now() - saveStart;
      exitCode = 0;
      break;
    }

    default: {
      result = {
        ok: false,
        command: name,
        summary: "Ukjent kommando",
        details: `${name} er ikke i allowlist`,
      };
      exitCode = -1;
    }
  }

  // Truncer detaljer
  const compactResult: StructuredResult = {
    ok: result.ok,
    command: result.command,
    summary: result.summary,
    details: truncate(result.details, verbose),
    cached: result.cached,
    dedupe: result.dedupe,
  };

  const payloadOut = JSON.stringify(compactResult).length;

  // Logg
  writeLog({
    tool_name: name,
    queue_ms: queueMs,
    exec_ms: execMs,
    payload_in_bytes: payloadIn,
    payload_out_bytes: payloadOut,
    cache_hit: cacheHit,
    dedupe_hit: dedupeHit,
    exit_code: exitCode,
    timestamp: new Date().toISOString(),
    status: compactResult.ok ? "ok" : "error",
    tool_mode:
      name === "kimi_db_status" || name === "kimi_monitor_full"
        ? "fast-path"
        : "kimi",
    verbose,
    schema_version: "2.2.0",
  });

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(compactResult, null, verbose ? 2 : undefined),
      },
    ],
    isError: !compactResult.ok,
  };
});

// ── TRANSPORT SETUP ─────────────────────────────────────────────────────────

const transportMode = process.env.TRANSPORT || "stdio";

async function main() {
  if (transportMode === "http") {
    const port = parseInt(process.env.PORT || "3100", 10);
    const apiKey = process.env.MCP_API_KEY;

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    await server.connect(transport);

    const httpServer = createServer(async (req, res) => {
      // Health check
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            version: "2.2.0",
            transport: "http",
            cache: cache.stats(),
          })
        );
        return;
      }

      // API-key sjekk
      if (apiKey) {
        const authHeader =
          req.headers["x-api-key"] || req.headers["authorization"];
        const providedKey =
          typeof authHeader === "string"
            ? authHeader.replace(/^Bearer\s+/i, "")
            : "";
        if (providedKey !== apiKey) {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }
      }

      // CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-API-Key"
      );

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      await transport.handleRequest(req, res);
    });

    httpServer.listen(port, () => {
      console.error(
        `[kimi-bridge] HTTP transport on http://localhost:${port} (health: /health)`
      );
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  console.error("[kimi-bridge] Fatal error:", err);
  process.exit(1);
});
