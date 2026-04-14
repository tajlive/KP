#!/usr/bin/env node
/**
 * Kimi CLI MCP Server v2.1 - Korrekt CLI-mapping
 * 
 * Denne serveren eksponerer Kimi CLI-kommandoer som MCP-verktøy via stdio.
 * VIKTIG: Bruker EKSPLOSITTE kommandoer, aldri beskrivende tekst.
 * 
 * Setup:
 * 1. Legg til i Perplexity Desktop MCP-innstillinger:
 *    {
 *      "mcpServers": {
 *        "kimi": {
 *          "command": "node",
 *          "args": ["/Users/taj/klarpakke/scripts/run-kimi-mcp.mjs"]
 *        }
 *      }
 *    }
 * 
 * 2. Restart Perplexity Desktop
 */

import { spawn, execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ============================================================================
// KOMMANDO-MAP: MCP-operasjon -> Eksplisitt CLI-kommando
// ============================================================================

const COMMAND_MAP = {
  db: {
    status: { cmd: "npm", args: ["run", "db:status"], timeout: 30000 },
    push: { cmd: "npm", args: ["run", "db:push"], timeout: 60000 },
    "gen-types": { cmd: "npm", args: ["run", "db:gen-types"], timeout: 60000 },
    migrate: { cmd: "npm", args: ["run", "db:migrate"], timeout: 60000 },
    lint: { cmd: "npm", args: ["run", "db:lint"], timeout: 30000 },
  },
  ci: {
    default: { cmd: "npm", args: ["run", "lint:gate"], timeout: 120000 },
    typecheck: { cmd: "npm", args: ["run", "type-check"], timeout: 120000 },
    test: { cmd: "npm", args: ["run", "test:unit"], timeout: 180000 },
    build: { cmd: "npm", args: ["run", "build"], timeout: 300000 },
  },
  monitor: {
    full: { cmd: "npm", args: ["run", "health:full"], timeout: 60000 },
    prod: { cmd: "npm", args: ["run", "verify:prod"], timeout: 60000 },
    api: { cmd: "npm", args: ["run", "health:api"], timeout: 30000 },
    supabase: { cmd: "npm", args: ["run", "supabase:health"], timeout: 30000 },
    signals: { cmd: "npm", args: ["run", "signals:health"], timeout: 30000 },
    trading: { cmd: "npm", args: ["run", "trading:health"], timeout: 30000 },
  },
};

// ============================================================================
// VALIDERING
// ============================================================================

function validateCommand(tool, action) {
  if (!tool || typeof tool !== "string") {
    return { valid: false, error: `Ugyldig tool: ${tool}` };
  }

  const toolMap = COMMAND_MAP[tool];
  if (!toolMap) {
    return { 
      valid: false, 
      error: `Ukjent tool: ${tool}. Tilgjengelige: ${Object.keys(COMMAND_MAP).join(", ")}` 
    };
  }

  const actualAction = action || "default";
  const mapping = toolMap[actualAction];
  if (!mapping) {
    return { 
      valid: false, 
      error: `Ukjent action: ${actualAction} for tool ${tool}. Tilgjengelige: ${Object.keys(toolMap).join(", ")}` 
    };
  }

  return { valid: true, mapping };
}

// ============================================================================
// EKSEKVERING
// ============================================================================

async function executeMappedCommand(tool, action, env = {}) {
  const startTime = Date.now();
  const steps = [];

  // Step 1: Validering
  const validation = validateCommand(tool, action);
  if (!validation.valid) {
    steps.push({ name: "validering", status: "feil", error: validation.error });
    return {
      success: false,
      steps,
      error: validation.error,
      duration: Date.now() - startTime,
    };
  }
  steps.push({ name: "validering", status: "ok" });

  // Step 2: Eksekver
  const { mapping } = validation;
  const cmdStr = `${mapping.cmd} ${mapping.args.join(" ")}`;
  
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const child = spawn(mapping.cmd, mapping.args, {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: "0", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      stderr += "\n[TIMEOUT]";
    }, mapping.timeout);

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      const success = code === 0;

      steps.push({
        name: "eksekvering",
        status: success ? "ok" : "feil",
        command: cmdStr,
        exitCode: code,
      });

      resolve({
        success,
        steps,
        command: cmdStr,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        duration,
        error: success ? undefined : `Exit code ${code}`,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      steps.push({ name: "eksekvering", status: "feil", error: err.message });
      resolve({
        success: false,
        steps,
        command: cmdStr,
        stdout,
        stderr,
        duration: Date.now() - startTime,
        error: err.message,
      });
    });
  });
}

// ============================================================================
// MCP SERVER
// ============================================================================

const serverInfo = {
  name: "kimi-cli-server",
  version: "2.1.0",
};

const tools = [
  {
    name: "kimi_ask",
    description: "Send en forespørsel til Kimi CLI og få svar. Bruk dette for generelle spørsmål, analyse, eller diskusjon.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Spørsmål eller instruksjon til Kimi" },
        context: { type: "string", description: "Ekstra kontekst (valgfri)" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "kimi_code",
    description: "Be Kimi om å skrive, redigere eller analysere kode. Kimi vil automatisk bruke verktøy for å endre filer.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: { type: "string", description: "Hva Kimi skal gjøre" },
        filePath: { type: "string", description: "Spesifikk fil (valgfri)" },
      },
      required: ["instruction"],
    },
  },
  {
    name: "kimi_db",
    description: "Database-operasjoner: status, push, gen-types, migrate, lint. EKSPLOSITTE kommandoer, ikke beskrivende tekst.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["status", "push", "gen-types", "migrate", "lint"],
          description: "Handling å utføre",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "kimi_ci",
    description: "Kjør CI-pipeline. EKSPLOSITTE kommandoer, ikke beskrivende tekst.",
    inputSchema: {
      type: "object",
      properties: {
        skipTests: { type: "boolean", description: "Hopp over tester (valgfri)" },
      },
    },
  },
  {
    name: "kimi_monitor",
    description: "Health checks: full, prod, api, supabase, signals, trading. EKSPLOSITTE kommandoer.",
    inputSchema: {
      type: "object",
      properties: {
        check: {
          type: "string",
          enum: ["full", "prod", "api", "supabase", "signals", "trading"],
          description: "Hva som sjekkes",
        },
      },
      required: ["check"],
    },
  },
];

// ============================================================================
// HÅNDTERE MELDINGER
// ============================================================================

process.stdin.setEncoding("utf-8");
let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  
  for (const line of lines) {
    if (line.trim()) handleMessage(line.trim());
  }
});

async function handleMessage(line) {
  try {
    const message = JSON.parse(line);
    const { id, method, params } = message;
    
    if (method === "initialize") {
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo,
      });
    } else if (method === "tools/list") {
      sendResponse(id, { tools });
    } else if (method === "tools/call") {
      const result = await handleToolCall(params.name, params.arguments);
      sendResponse(id, result);
    } else if (method === "notifications/initialized") {
      // Acknowledge
    } else {
      sendError(id, -32601, `Ukjent metode: ${method}`);
    }
  } catch (err) {
    console.error(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: err.message } }));
  }
}

async function handleToolCall(name, args) {
  switch (name) {
    case "kimi_ask": {
      const prompt = args.context ? `[Kontekst: ${args.context}]\n\n${args.prompt}` : args.prompt;
      return await callKimi(prompt);
    }
    
    case "kimi_code": {
      const prompt = args.filePath
        ? `Arbeid med filen ${args.filePath}. ${args.instruction}`
        : args.instruction;
      return await callKimi(prompt, ["--yolo"]);
    }
    
    // === KORREKT IMPLEMENTERING: Bruker eksplisitte kommandoer ===
    case "kimi_db": {
      const action = args.action || "status";
      const result = await executeMappedCommand("db", action);
      
      return {
        content: [{
          type: "text",
          text: result.success
            ? `✅ DB ${action} fullført (${result.duration}ms)\n\nKommando: ${result.command}\n\n${result.stdout.substring(0, 2000)}`
            : `❌ DB ${action} feilet\n\nFeil: ${result.error}\n\nStdout: ${result.stdout}\n\nStderr: ${result.stderr}`,
        }],
        isError: !result.success,
      };
    }
    
    case "kimi_ci": {
      const mode = args.skipTests ? "quick" : "default";
      const result = await executeMappedCommand("ci", mode);
      
      return {
        content: [{
          type: "text",
          text: result.success
            ? `✅ CI fullført (${result.duration}ms)\n\nKommando: ${result.command}\n\n${result.stdout.substring(0, 3000)}`
            : `❌ CI feilet\n\nFeil: ${result.error}\n\nStdout: ${result.stdout}\n\nStderr: ${result.stderr}`,
        }],
        isError: !result.success,
      };
    }
    
    case "kimi_monitor": {
      const check = args.check || "full";
      const result = await executeMappedCommand("monitor", check);
      
      return {
        content: [{
          type: "text",
          text: result.success
            ? `✅ Health check ${check} fullført (${result.duration}ms)\n\nKommando: ${result.command}\n\n${result.stdout.substring(0, 2000)}`
            : `❌ Health check ${check} feilet\n\nFeil: ${result.error}\n\nStdout: ${result.stdout}\n\nStderr: ${result.stderr}`,
        }],
        isError: !result.success,
      };
    }
    
    default:
      return { content: [{ type: "text", text: `Ukjent verktøy: ${name}` }] };
  }
}

// ==========================================================================
// callKimi: Sender prompt via STDIN (ikke som posisjonelt argument).
// Kimi CLI er Click-basert og aksepterer IKKE fritekst som CLI-arg.
// Stdin-modus brukes i interaktiv modus. Fallback: tmpfile-basert eksekvering.
// ==========================================================================
async function callKimi(prompt, extraArgs = []) {
  return new Promise((resolve) => {
    // RIKTIG: Send prompt via stdin, ikke som CLI-arg
    // FEIL var: kimiArgs = ["--yolo", ...extraArgs, prompt]  ← krasjer (Click CLI)
    const kimiArgs = ["--yolo", ...extraArgs];

    const child = spawn("kimi", kimiArgs, {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0", KIMI_NON_INTERACTIVE: "0" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, 300000);

    child.stdout.on("data", (data) => { stdout += data.toString(); });
    child.stderr.on("data", (data) => { stderr += data.toString(); });

    child.on("close", (code) => {
      clearTimeout(timeout);
      if (timedOut) {
        resolve({
          content: [{ type: "text", text: "❌ Kimi tidsavbrudd etter 5 min" }],
          isError: true,
        });
        return;
      }
      // Detect Click CLI-feil ("No such command") og gi meningsfull melding
      const output = stdout || stderr || "Ingen output fra Kimi";
      const isClickError = output.includes("No such command") || output.includes("Usage: kimi");
      if (isClickError) {
        resolve({
          content: [{ type: "text", text: `⚠️ kimi_ask/kimi_code støttes ikke av denne kimi-installasjonen.\n\nBrukt kommando: kimi ${kimiArgs.join(" ")}\n\nKimi CLI er en task-runner (db/ci/monitor/deploy) — ikke en AI chat-klient.\nBruk Perplexity sine egne filverktøy (read_file, write_file, edit_file) for kodeendringer.\n\nOriginal feil:\n${output.substring(0, 500)}` }],
          isError: true,
        });
        return;
      }
      resolve({
        content: [{ type: "text", text: output }],
        isError: code !== 0,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        content: [{ type: "text", text: `❌ Kimi start-feil: ${err.message}\n\nSjekk at kimi er installert: which kimi` }],
        isError: true,
      });
    });

    // Skriv prompt til stdin (interaktiv modus)
    child.stdin.write(prompt + "\n");
    child.stdin.end();
  });
}

function sendResponse(id, result) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

console.error("[kimi-mcp] Server startet. Venter på tilkoblinger...");
