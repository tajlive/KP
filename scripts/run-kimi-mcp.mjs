#!/usr/bin/env node
/**
 * Kimi CLI MCP Server — gjør Kimi tilgjengelig for Perplexity Desktop
 * 
 * Denne serveren eksponerer Kimi CLI-kommandoer som MCP-verktøy via stdio,
 * slik at Perplexity Desktop kan kalle Kimi direkte.
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
import { loadEnvLocal } from "./load-env.mjs";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const env = loadEnvLocal();

// Valider at Kimi er tilgjengelig
function validateKimi() {
  try {
    const result = execSync("which kimi", { encoding: "utf-8" }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

if (!validateKimi()) {
  console.error(JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Kimi CLI ikke funnet. Installer med: uv tool install kimi-cli"
    }
  }));
  process.exit(1);
}

// MCP Server State
const serverInfo = {
  name: "kimi-cli-server",
  version: "1.0.0",
};

const tools = [
  {
    name: "kimi_ask",
    description: "Send en forespørsel til Kimi CLI og få svar. Bruk dette for generelle spørsmål, analyse, eller diskusjon.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Spørsmål eller instruksjon til Kimi",
        },
        context: {
          type: "string",
          description: "Ekstra kontekst som gir bakgrunn (valgfri)",
        },
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
        instruction: {
          type: "string",
          description: "Hva Kimi skal gjøre (f.eks. 'Lag en React-komponent som viser en handleliste')",
        },
        filePath: {
          type: "string",
          description: "Spesifikk fil som skal opprettes eller redigeres (valgfri)",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "kimi_search",
    description: "Be Kimi søke i kodebasen etter mønstre, funksjoner, eller filer.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Søkeord, funksjonsnavn, eller mønster å finne",
        },
        filePattern: {
          type: "string",
          description: "Fil-mønster som '*.tsx', '*.py' (valgfri)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "kimi_read_file",
    description: "Be Kimi lese og analysere en spesifikk fil.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Sti til filen som skal leses (relativt til prosjektrot)",
        },
        question: {
          type: "string",
          description: "Spesifikt spørsmål om filen (valgfri)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "kimi_run_tests",
    description: "Be Kimi kjøre tester og rapportere resultater.",
    inputSchema: {
      type: "object",
      properties: {
        testPath: {
          type: "string",
          description: "Spesifikk testfil eller pattern (valgfri, ellers kjøres alle tester)",
        },
      },
    },
  },
];

// Håndter innkommende JSON-RPC meldinger
process.stdin.setEncoding("utf-8");

let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  
  // Parse linje-for-linje (JSON-RPC med LSP-lignende framing)
  const lines = buffer.split("\n");
  buffer = lines.pop() || ""; // behold ufullstendig linje
  
  for (const line of lines) {
    if (line.trim()) {
      handleMessage(line.trim());
    }
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
      // Acknowledge, no response needed
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
      const prompt = args.context 
        ? `[Kontekst: ${args.context}]\n\n${args.prompt}` 
        : args.prompt;
      return await callKimi(prompt);
    }
    
    case "kimi_code": {
      const prompt = args.filePath
        ? `Arbeid med filen ${args.filePath}. ${args.instruction}`
        : args.instruction;
      return await callKimi(prompt, ["--yolo"]);
    }
    
    case "kimi_search": {
      const searchPrompt = `Søk i kodebasen etter "${args.query}"${args.filePattern ? ` i filer som matcher "${args.filePattern}"` : ""}. Vis meg alle relevante funn med filstier og kode-snutter.`;
      return await callKimi(searchPrompt, ["--yolo"]);
    }
    
    case "kimi_read_file": {
      const filePath = resolve(root, args.path);
      try {
        const content = readFileSync(filePath, "utf-8");
        const prompt = args.question
          ? `Analyser denne filen og svar på: ${args.question}\n\n\`\`\`\n${content}\n\`\`\``
          : `Les og oppsummer denne filen:\n\n\`\`\`\n${content}\n\`\`\``;
        return await callKimi(prompt);
      } catch (err) {
        return { content: [{ type: "text", text: `Feil ved lesing av fil: ${err.message}` }] };
      }
    }
    
    case "kimi_run_tests": {
      const testCmd = args.testPath 
        ? `npm test -- ${args.testPath}` 
        : "npm test";
      return await callKimi(`Kjør tester med: ${testCmd}. Rapporter resultatene tydelig.`, ["--yolo"]);
    }
    
    default:
      return { content: [{ type: "text", text: `Ukjent verktøy: ${name}` }] };
  }
}

async function callKimi(prompt, extraArgs = []) {
  return new Promise((resolve) => {
    const kimiArgs = ["--yolo", ...extraArgs, prompt];
    
    const child = spawn("kimi", kimiArgs, {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: "0" },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      const output = stdout || stderr || "Ingen output fra Kimi";
      resolve({
        content: [{ type: "text", text: output }],
        isError: code !== 0,
      });
    });

    child.on("error", (err) => {
      resolve({
        content: [{ type: "text", text: `Feil ved kall til Kimi: ${err.message}` }],
        isError: true,
      });
    });

    child.stdin.end();
  });
}

function sendResponse(id, result) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

// Signal at serveren er klar
console.error("[kimi-mcp] Server startet. Venter på tilkoblinger...");
