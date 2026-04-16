#!/usr/bin/env node
/**
 * KIMI MCP Server - Minimalistisk wrapper for Perplexity Desktop
 * Erstatter run-kimi-mcp-optimized.mjs med ~95% mindre kode.
 * Alt annet (filer, git, shell, db) går via dedikerte MCPs.
 */

import { spawn, execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync, readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// Last .env.local hvis den finnes
function loadEnv() {
  const envPath = resolve(root, ".env.local");
  const env = {};
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const [key, ...val] = line.split("=");
      if (key && val.length > 0 && !key.startsWith("#")) {
        env[key.trim()] = val.join("=").trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
  return env;
}
const env = loadEnv();

// Sjekk at kimi finnes i PATH
try {
  execSync("which kimi", { encoding: "utf-8" });
} catch {
  console.error(JSON.stringify({
    jsonrpc: "2.0", error: { code: -32000, message: "kimi ikke funnet i PATH" }
  }));
  process.exit(1);
}

const TOOLS = [
  {
    name: "kimi_prompt",
    description: "🧠 Send en prompt til KIMI CLI. Bruk for analyse, forklaringer, spørsmål og orkestrering.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Prompt til KIMI" },
        timeout: { type: "number", description: "Timeout i ms (default: 300000)" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "kimi_code",
    description: "💻 Be KIMI om å skrive eller redigere kode. Bruker alltid --yolo.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: { type: "string", description: "Hva som skal gjøres" },
        filePath: { type: "string", description: "Målfil (valgfri)" },
        timeout: { type: "number", description: "Timeout i ms (default: 300000)" }
      },
      required: ["instruction"]
    }
  }
];

function send(id, result) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

async function callKimi(prompt, timeout = 300000) {
  return new Promise((resolve) => {
    // Send prompt via stdin — NOT as a positional arg.
    // kimi --print reads from stdin when piped; positional args open TUI mode and hang.
    const args = ["--quiet"];
    const child = spawn("kimi", args, {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: "0" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    // Write prompt to stdin and close the pipe so KIMI knows input is done
    child.stdin.write(prompt + "\n");
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => { timedOut = true; child.kill("SIGTERM"); }, timeout);

    child.stdout.on("data", d => stdout += d.toString());
    child.stderr.on("data", d => stderr += d.toString());

    child.on("close", (code) => {
      clearTimeout(timer);
      let out = (stdout || stderr || "(ingen output)").trim();
      // Fjern "To resume this session: ..." linje
      out = out.replace(/\n?To resume this session: .*$/m, "").trim();
      const text = timedOut ? `[TIMEOUT etter ${timeout}ms]\n${out}` : out;
      resolve({ content: [{ type: "text", text }], isError: code !== 0 || timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ content: [{ type: "text", text: `Feil: ${err.message}` }], isError: true });
    });
  });
}

async function handleTool(name, args) {
  if (name === "kimi_prompt") {
    return await callKimi(args.prompt, args.timeout);
  }
  if (name === "kimi_code") {
    const prompt = args.filePath
      ? `Arbeid med filen ${args.filePath}. ${args.instruction}`
      : args.instruction;
    return await callKimi(prompt, args.timeout);
  }
  return { content: [{ type: "text", text: `Ukjent verktøy: ${name}` }], isError: true };
}

process.stdin.setEncoding("utf-8");
let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      const { id, method, params } = msg;
      if (method === "initialize") {
        send(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "kimi-mcp-simple", version: "1.0.0" }
        });
      } else if (method === "tools/list") {
        send(id, { tools: TOOLS });
      } else if (method === "tools/call") {
        handleTool(params.name, params.arguments).then(result => send(id, result));
      } else if (method === "notifications/initialized") {
        // no-op
      } else {
        sendError(id, -32601, `Ukjent metode: ${method}`);
      }
    } catch (err) {
      console.error(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: err.message } }));
    }
  }
});
