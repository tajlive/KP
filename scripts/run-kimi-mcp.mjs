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
  version: "2.0.0",
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
    description: "Be Kimi kjøre tester og rapportere resultater (alias for kimi_test).",
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
  {
    name: "kimi_test",
    description: "Kjør tester: vitest (unit), playwright (e2e), eller spesifikk testfil. Returnerer rapport med status.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["unit", "e2e", "critical", "full"],
          description: "Type test: unit (vitest), e2e (playwright), critical (kritiske paths), full (alt)",
        },
        path: {
          type: "string",
          description: "Spesifikk testfil eller pattern (valgfri)",
        },
        coverage: {
          type: "boolean",
          description: "Kjør med coverage (valgfri, default false)",
        },
      },
    },
  },
  {
    name: "kimi_ci",
    description: "Kjør CI-pipeline: lint + type-check + test. Returnerer full rapport.",
    inputSchema: {
      type: "object",
      properties: {
        skipTests: {
          type: "boolean",
          description: "Hopp over tester (valgfri, default false)",
        },
      },
    },
  },
  {
    name: "kimi_deploy",
    description: "Deploy til produksjon: Vercel, eller vis deploy-status.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: ["vercel", "prod", "preview", "status"],
          description: "Deploy-mål: vercel (standard), prod (produksjon), preview, status (sjekk status)",
        },
        verify: {
          type: "boolean",
          description: "Verifiser etter deploy (valgfri, default true)",
        },
      },
    },
  },
  {
    name: "kimi_db",
    description: "Database-operasjoner: migrasjoner, type-generering, eller status-sjekk.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["migrate", "gen-types", "status", "lint", "push"],
          description: "Handling: migrate (kjør migrasjoner), gen-types (generer TypeScript-typer), status (sjekk DB), lint (valider), push (push skjema)",
        },
        environment: {
          type: "string",
          enum: ["local", "staging", "production"],
          description: "Miljø (valgfri, default local)",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "kimi_monitor",
    description: "Health checks: Supabase, API, signals, eller full system-status.",
    inputSchema: {
      type: "object",
      properties: {
        check: {
          type: "string",
          enum: ["supabase", "api", "signals", "trading", "full", "prod"],
          description: "Hva som sjekkes: supabase (DB health), api (/api/health), signals (signal-pipeline), trading (trading-system), full (alt lokalt), prod (produksjonssjekk)",
        },
      },
      required: ["check"],
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
    
    case "kimi_run_tests":
    case "kimi_test": {
      const testType = args.type || "unit";
      const testPath = args.path || args.testPath;
      const coverage = args.coverage ? " med coverage" : "";
      
      let cmd;
      switch (testType) {
        case "unit":
          cmd = testPath ? `npm run test:unit -- ${testPath}${coverage}` : `npm run test:unit${coverage}`;
          break;
        case "e2e":
          cmd = testPath ? `npm run test:e2e -- ${testPath}` : "npm run test:e2e";
          break;
        case "critical":
          cmd = "npm run test:e2e:critical";
          break;
        case "full":
          cmd = "npm run test:full";
          break;
        default:
          cmd = testPath ? `npm test -- ${testPath}` : "npm test";
      }
      
      return await callKimi(`Kjør tester: ${cmd}. Gi meg en kort rapport med: 1) Antall passerte/feilede, 2) Kritiske feil, 3) Anbefalinger.`, ["--yolo"]);
    }
    
    case "kimi_ci": {
      const skipTests = args.skipTests ? " --skip-tests" : "";
      return await callKimi(`Kjør CI-pipeline: lint + type-check${skipTests ? "" : " + test"}. Rapporter: 1) Lint-status, 2) Type-check status, 3) Test-resultater, 4) Kan vi deploye?`, ["--yolo"]);
    }
    
    case "kimi_deploy": {
      const target = args.target || "vercel";
      const verify = args.verify !== false;
      
      let cmd;
      switch (target) {
        case "prod":
          cmd = verify ? "npm run deploy:prod && npm run verify:prod" : "npm run deploy:prod";
          break;
        case "preview":
          cmd = "npm run deploy:preview";
          break;
        case "status":
          cmd = "npm run vercel:status";
          break;
        default:
          cmd = verify ? "npm run deploy && npm run verify" : "npm run deploy";
      }
      
      return await callKimi(`Deploy: ${cmd}. Rapporter: 1) Deploy-status, 2) URL, 3) Verifikasjonsresultat.`, ["--yolo"]);
    }
    
    case "kimi_db": {
      const action = args.action;
      const env = args.environment || "local";
      
      let cmd;
      switch (action) {
        case "migrate":
          cmd = `npm run db:migrate -- --env ${env}`;
          break;
        case "gen-types":
          cmd = "npm run db:gen-types";
          break;
        case "status":
          cmd = "npm run db:status";
          break;
        case "lint":
          cmd = "npm run db:lint";
          break;
        case "push":
          cmd = `npm run db:push -- --env ${env}`;
          break;
        default:
          cmd = "npm run db:status";
      }
      
      return await callKimi(`DB-operasjon: ${cmd}. Rapporter: 1) Status, 2) Eventuelle feil, 3) Neste steg.`, ["--yolo"]);
    }
    
    case "kimi_monitor": {
      const check = args.check;
      
      let cmd;
      switch (check) {
        case "supabase":
          cmd = "npm run supabase:health";
          break;
        case "api":
          cmd = "npm run health:api";
          break;
        case "signals":
          cmd = "npm run signals:health";
          break;
        case "trading":
          cmd = "npm run trading:health";
          break;
        case "full":
          cmd = "npm run health:full";
          break;
        case "prod":
          cmd = "npm run verify:prod";
          break;
        default:
          cmd = "npm run health";
      }
      
      return await callKimi(`Health check: ${cmd}. Rapporter: 1) Alle statuser, 2) Kritiske feil (P0), 3) Anbefalinger.`, ["--yolo"]);
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
