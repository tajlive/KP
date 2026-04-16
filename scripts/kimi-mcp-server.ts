#!/usr/bin/env tsx
/**
 * Kimi CLI MCP Server v4.0 — Official SDK Edition
 *
 * Eksponerer Kimi CLI og Klarpakke-spesifikke kommandoer som MCP-verktøy
 * via @modelcontextprotocol/sdk. Støtter både stdio (lokal) og native
 * Streamable HTTP (remote / Perplexity Pro "Bring Your Own Connector").
 *
 * Oppsett:
 *   1. Lokal stdio (for Perplexity Desktop, Cursor, Claude, etc.):
 *      npx tsx scripts/kimi-mcp-server.ts
 *
 *   2. Native HTTP på port 3100:
 *      TRANSPORT=http PORT=3100 npx tsx scripts/kimi-mcp-server.ts
 *
 *   3. HTTP/SSE via mcp-proxy (anbefalt for Perplexity Pro URL):
 *      npx mcp-proxy --port 3100 --apiKey "$MCP_API_KEY" -- \
 *        npx tsx scripts/kimi-mcp-server.ts
 *
 *   4. Med public tunnel (for testing mot Perplexity Pro):
 *      npx mcp-proxy --port 3100 --tunnel --apiKey "$MCP_API_KEY" -- \
 *        npx tsx scripts/kimi-mcp-server.ts
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { spawn, execSync } from "child_process";
import { createServer } from "http";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "./load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── Sjekk at kimi finnes i PATH ─────────────────────────────────────────────
try {
  execSync("which kimi", { encoding: "utf-8" });
} catch {
  console.error("[kimi-mcp-server] FEIL: 'kimi' ikke funnet i PATH");
  process.exit(1);
}

const env = loadEnvLocal();

const server = new Server(
  { name: "klarpakke-kimi", version: "4.0.0" },
  { capabilities: { tools: {} } }
);

// ── TOOL DEFINITIONS ────────────────────────────────────────────────────────

const TOOLS = [
  {
    name: "kimi_prompt",
    description:
      "🧠 Send en prompt til KIMI CLI. Bruk for analyse, forklaringer, spørsmål og orkestrering.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Prompt til KIMI",
        },
        timeout: {
          type: "number",
          description: "Timeout i ms (default: 300000)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "kimi_code",
    description:
      "💻 Be KIMI om å skrive eller redigere kode i Klarpakke-prosjektet. YOLO-modus brukes implisitt for kodeendringer.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "Hva som skal gjøres",
        },
        filePath: {
          type: "string",
          description: "Målfil (valgfri)",
        },
        timeout: {
          type: "number",
          description: "Timeout i ms (default: 300000)",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "kimi_db",
    description:
      "🗄️ DB-operasjoner for Klarpakke (status, push, gen-types, migrate, lint)",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["status", "push", "gen-types", "migrate", "lint"],
          description: "DB-handling",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "kimi_ci",
    description:
      "🔧 Kjør CI-pipeline (default=lint:gate, typecheck, test, build)",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["default", "typecheck", "test", "build"],
          default: "default",
          description: "CI-handling",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "kimi_monitor",
    description:
      "📊 Health check for Klarpakke (full, prod, api, supabase, signals, trading)",
    inputSchema: {
      type: "object",
      properties: {
        check: {
          type: "string",
          enum: ["full", "prod", "api", "supabase", "signals", "trading"],
          description: "Hva som skal sjekkes",
        },
      },
      required: ["check"],
    },
  },
  {
    name: "kimi_deploy",
    description: "🚀 Deploy-operasjoner (preview, prod)",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["preview", "prod"],
          description: "Deploy-handling",
        },
      },
      required: ["action"],
    },
  },
];

// ── COMMAND EXECUTION HELPERS ───────────────────────────────────────────────

function runNpmScript(
  script: string,
  extraArgs: string[] = [],
  timeoutMs = 300000
): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
  return new Promise((resolve) => {
    const args = ["run", script, "--", ...extraArgs];
    const child = spawn("npm", args, {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: "0", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
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

function callKimi(
  prompt: string,
  timeoutMs = 300000
): Promise<{ text: string; isError: boolean }> {
  return new Promise((resolve) => {
    const child = spawn("kimi", ["--quiet"], {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: "0", CI: "true" },
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
      let out = (stdout || stderr || "(ingen output)").trim();
      // Fjern "To resume this session: ..." linje
      out = out.replace(/\n?To resume this session: .*$/m, "").trim();
      const text = timedOut
        ? `[TIMEOUT etter ${timeoutMs}ms]\n${out}`
        : out;
      resolve({ text, isError: code !== 0 || timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ text: `Feil: ${err.message}`, isError: true });
    });
  });
}

// ── REQUEST HANDLERS ────────────────────────────────────────────────────────

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params as {
    name: string;
    arguments: Record<string, any>;
  };

  if (name === "kimi_prompt") {
    const result = await callKimi(args.prompt, args.timeout);
    return {
      content: [{ type: "text" as const, text: result.text }],
      isError: result.isError,
    };
  }

  if (name === "kimi_code") {
    const prompt = args.filePath
      ? `Arbeid med filen ${args.filePath}. ${args.instruction}`
      : args.instruction;
    const result = await callKimi(prompt, args.timeout);
    return {
      content: [{ type: "text" as const, text: result.text }],
      isError: result.isError,
    };
  }

  if (name === "kimi_db") {
    const { stdout, stderr, exitCode } = await runNpmScript(
      "kimi_db",
      [args.action],
      120000
    );
    return {
      content: [{ type: "text" as const, text: stdout || stderr }],
      isError: exitCode !== 0,
    };
  }

  if (name === "kimi_ci") {
    const { stdout, stderr, exitCode } = await runNpmScript(
      "kimi_ci",
      [args.action],
      300000
    );
    return {
      content: [{ type: "text" as const, text: stdout || stderr }],
      isError: exitCode !== 0,
    };
  }

  if (name === "kimi_monitor") {
    const { stdout, stderr, exitCode } = await runNpmScript(
      "kimi_monitor",
      [args.check],
      60000
    );
    return {
      content: [{ type: "text" as const, text: stdout || stderr }],
      isError: exitCode !== 0,
    };
  }

  if (name === "kimi_deploy") {
    const { stdout, stderr, exitCode } = await runNpmScript(
      "kimi_deploy",
      [args.action],
      300000
    );
    return {
      content: [{ type: "text" as const, text: stdout || stderr }],
      isError: exitCode !== 0,
    };
  }

  return {
    content: [{ type: "text" as const, text: `Ukjent verktøy: ${name}` }],
    isError: true,
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
      // Enkel API-key sjekk
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

      // Basis CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      await transport.handleRequest(req, res);
    });

    httpServer.listen(port, () => {
      console.error(
        `[kimi-mcp-server] HTTP transport listening on http://localhost:${port}`
      );
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
  }
}

main().catch((err) => {
  console.error("[kimi-mcp-server] Fatal error:", err);
  process.exit(1);
});
