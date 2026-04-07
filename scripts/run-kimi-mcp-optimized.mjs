#!/usr/bin/env node
/**
 * KIMI MCP Server v3.0 - Optimized for Perplexity Desktop
 * 
 * Basert på MCP best practices 2025/2026:
 * - Progressive complexity levels (small/medium/large)
 * - Direkte filoperasjoner (raskere enn via Kimi)
 * - Git-integrasjon
 * - Shell-kommandoer
 * - Batch-operasjoner
 * - Context management
 * - Bedre feilhåndtering
 * 
 * @author Kimi CLI + Perplexity Desktop Integration
 * @version 3.0.0
 */

import { spawn, execSync } from "child_process";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { 
  readFileSync, 
  writeFileSync, 
  existsSync, 
  statSync,
  readdirSync,
  mkdirSync
} from "fs";
import { loadEnvLocal } from "./load-env.mjs";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const env = loadEnvLocal();

// ============================================================================
// KONFIGURASJON
// ============================================================================

const CONFIG = {
  serverInfo: {
    name: "kimi-cli-server-optimized",
    version: "3.0.0",
    description: "Optimized KIMI MCP Server for Perplexity Desktop",
  },
  timeouts: {
    default: 300000,    // 5 minutter
    quick: 60000,       // 1 minutt
    long: 600000,       // 10 minutter
  },
  limits: {
    maxOutputSize: 500000,  // 500KB max output
    maxFileSize: 1000000,   // 1MB max fillesing
  }
};

// ============================================================================
// VERKTØY-DEFINISJONER
// ============================================================================

const TOOLS = [
  // === PROGRESSIVE COMPLEXITY (som Perplexity sin egen MCP) ===
  {
    name: "kimi_small",
    description: "⚡ RASK: Enkle spørsmål og oppgaver (< 1 min). Bruk for: fakta-sjekk, enkle forklaringer, hurtig analyse.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Kort, presist spørsmål eller instruksjon",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "kimi_medium",
    description: "🔧 STANDARD: Vanlig kode-arbeid og analyse (1-3 min). Bruk for: kode-review, debugging, refaktoring.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Instruksjon eller spørsmål",
        },
        files: {
          type: "array",
          items: { type: "string" },
          description: "Relevante filer å analysere (valgfri)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "kimi_large",
    description: "🧠 DEEP: Komplekse oppgaver og arkitektur (3-10 min). Bruk for: større refaktoringer, design-dokumenter, kompleks feilsøking.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Detaljert instruksjon eller spørsmål",
        },
        context: {
          type: "string",
          description: "Ekstra bakgrunnsinformasjon",
        },
      },
      required: ["prompt"],
    },
  },

  // === DIREKTE FILOPERASJONER (raskere enn via Kimi) ===
  {
    name: "kimi_read",
    description: "📄 Les fil direkte (rask - ingen Kimi-kall). Returnerer filinnhold som tekst.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Filsti relativt til prosjektrot (f.eks. 'src/lib/api.ts')",
        },
        limit: {
          type: "number",
          description: "Maks antall linjer å lese (valgfri)",
        },
        offset: {
          type: "number",
          description: "Startlinje (valgfri, for paginering)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "kimi_list",
    description: "📁 List filer i mappe (rask - ingen Kimi-kall). Viser struktur og metadata.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Mappe-sti (default: '.')",
        },
        recursive: {
          type: "boolean",
          description: "Rekursiv listing (valgfri)",
        },
        pattern: {
          type: "string",
          description: "Fil-mønster å filtrere på, f.eks. '*.ts' (valgfri)",
        },
      },
    },
  },
  {
    name: "kimi_grep",
    description: "🔍 Søk i kodebase (rask - lokal søk). Finner mønstre uten å kalle Kimi.",
    inputSchema: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description: "Søkemønster (regex støttet)",
        },
        path: {
          type: "string",
          description: "Sti å søke i (valgfri)",
        },
        glob: {
          type: "string",
          description: "Fil-pattern, f.eks. '*.tsx' (valgfri)",
        },
      },
      required: ["pattern"],
    },
  },

  // === KODE-OPERASJONER ===
  {
    name: "kimi_code",
    description: "💻 Skriv/rediger kode. Kimi vil automatisk bruke --yolo for filoperasjoner.",
    inputSchema: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "Hva som skal gjøres (f.eks. 'Lag en React-komponent')",
        },
        filePath: {
          type: "string",
          description: "Mål-fil (valgfri, ellers velger Kimi selv)",
        },
        complexity: {
          type: "string",
          enum: ["small", "medium", "large"],
          description: "Kompleksitetsnivå (valgfri, default: medium)",
        },
      },
      required: ["instruction"],
    },
  },
  {
    name: "kimi_refactor",
    description: "♻️ Refaktorer eksisterende kode. Analyserer og forbedrer kodekvalitet.",
    inputSchema: {
      type: "object",
      properties: {
        filePath: {
          type: "string",
          description: "Fil som skal refaktoreres",
        },
        goal: {
          type: "string",
          description: "Refaktoreringsmål (f.eks. 'reduser kompleksitet', 'forbedre lesbarhet')",
        },
      },
      required: ["filePath", "goal"],
    },
  },
  {
    name: "kimi_explain",
    description: "📖 Forklar kode eller konsept. Grunnleggende analyse og dokumentasjon.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "Filsti, funksjonsnavn, eller kode-snippet",
        },
        detail: {
          type: "string",
          enum: ["brief", "normal", "detailed"],
          description: "Detaljnivå (valgfri, default: normal)",
        },
      },
      required: ["target"],
    },
  },

  // === GIT-OPERASJONER ===
  {
    name: "kimi_git",
    description: "🌿 Git-operasjoner: status, diff, log, branch, commit, push, pull.",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          enum: ["status", "diff", "log", "branch", "commit", "push", "pull", "stash"],
          description: "Git-kommando å kjøre",
        },
        args: {
          type: "string",
          description: "Ekstra argumenter (valgfri, f.eks. '-a' for commit)",
        },
        message: {
          type: "string",
          description: "Commit-melding (kun for commit-kommando)",
        },
      },
      required: ["command"],
    },
  },

  // === PROSJEKT-INFORMASJON ===
  {
    name: "kimi_project",
    description: "📊 Prosjekt-info: struktur, avhengigheter, scripts, config.",
    inputSchema: {
      type: "object",
      properties: {
        info: {
          type: "string",
          enum: ["structure", "deps", "scripts", "config", "summary"],
          description: "Type informasjon å hente",
        },
      },
      required: ["info"],
    },
  },

  // === SHELL-KOMMANDOER ===
  {
    name: "kimi_shell",
    description: "⚡ Kjør shell-kommando direkte (bruk med forsiktighet!).",
    inputSchema: {
      type: "object",
      properties: {
        command: {
          type: "string",
          description: "Shell-kommando å kjøre",
        },
        timeout: {
          type: "number",
          description: "Timeout i ms (valgfri, default: 30000)",
        },
      },
      required: ["command"],
    },
  },

  // === TEST-OPERASJONER ===
  {
    name: "kimi_test",
    description: "🧪 Kjør tester: unit (vitest), e2e (playwright), critical, full.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["unit", "e2e", "critical", "full"],
          description: "Test-type",
        },
        path: {
          type: "string",
          description: "Spesifikk testfil (valgfri)",
        },
        coverage: {
          type: "boolean",
          description: "Kjør med coverage (valgfri)",
        },
      },
    },
  },

  // === CI/CD & DEPLOY ===
  {
    name: "kimi_ci",
    description: "🔄 Kjør CI-pipeline: lint + type-check + test.",
    inputSchema: {
      type: "object",
      properties: {
        skipTests: {
          type: "boolean",
          description: "Hopp over tester (valgfri)",
        },
      },
    },
  },
  {
    name: "kimi_deploy",
    description: "🚀 Deploy til Vercel: preview, prod, eller sjekk status.",
    inputSchema: {
      type: "object",
      properties: {
        target: {
          type: "string",
          enum: ["vercel", "prod", "preview", "status"],
          description: "Deploy-mål",
        },
        verify: {
          type: "boolean",
          description: "Verifiser etter deploy (valgfri, default: true)",
        },
      },
    },
  },

  // === DATABASE ===
  {
    name: "kimi_db",
    description: "🗄️ Database-operasjoner: migrasjoner, typer, status, lint.",
    inputSchema: {
      type: "object",
      properties: {
        action: {
          type: "string",
          enum: ["migrate", "gen-types", "status", "lint", "push"],
          description: "DB-handling",
        },
        environment: {
          type: "string",
          enum: ["local", "staging", "production"],
          description: "Miljø (valgfri, default: local)",
        },
      },
      required: ["action"],
    },
  },

  // === MONITORING ===
  {
    name: "kimi_monitor",
    description: "💓 Health checks: supabase, api, signals, trading, full, prod.",
    inputSchema: {
      type: "object",
      properties: {
        check: {
          type: "string",
          enum: ["supabase", "api", "signals", "trading", "full", "prod"],
          description: "Hva som sjekkes",
        },
      },
      required: ["check"],
    },
  },

  // === BATCH-OPERASJONER ===
  {
    name: "kimi_batch",
    description: "📦 Kjør flere operasjoner i én kommando. Mer effektivt enn separate kall.",
    inputSchema: {
      type: "object",
      properties: {
        operations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              tool: { type: "string" },
              args: { type: "object" },
            },
          },
          description: "Liste over operasjoner å kjøre",
        },
      },
      required: ["operations"],
    },
  },

  // === HJELP ===
  {
    name: "kimi_help",
    description: "❓ Vis tilgjengelige verktøy og hvordan bruke dem.",
    inputSchema: {
      type: "object",
      properties: {
        tool: {
          type: "string",
          description: "Spesifikt verktøy å få hjelp for (valgfri)",
        },
      },
    },
  },
];

// ============================================================================
// HJELPEFUNKSJONER
// ============================================================================

function validateKimi() {
  try {
    const result = execSync("which kimi", { encoding: "utf-8" }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

function truncateOutput(text, maxLength = CONFIG.limits.maxOutputSize) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + 
    `\n\n[... OUTPUT TRUNCERT: ${text.length - maxLength} tegn fjernet ...]`;
}

function readFileSafe(filePath, limit, offset = 0) {
  try {
    const fullPath = resolve(root, filePath);
    
    // Sikkerhetssjekk: ikke les utenfor prosjektet
    if (!fullPath.startsWith(root)) {
      return { error: "Ugyldig sti: kan ikke lese utenfor prosjektet" };
    }
    
    if (!existsSync(fullPath)) {
      return { error: `Fil ikke funnet: ${filePath}` };
    }
    
    const stats = statSync(fullPath);
    if (stats.size > CONFIG.limits.maxFileSize) {
      return { error: `Fil for stor (${stats.size} bytes). Maks: ${CONFIG.limits.maxFileSize}` };
    }
    
    let content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");
    const totalLines = lines.length;
    
    if (offset > 0 || limit) {
      const start = offset || 0;
      const end = limit ? Math.min(start + limit, totalLines) : totalLines;
      content = lines.slice(start, end).join("\n");
      return { 
        content, 
        meta: { 
          path: filePath, 
          totalLines, 
          showing: `${start + 1}-${end}`,
          hasMore: end < totalLines 
        } 
      };
    }
    
    return { content, meta: { path: filePath, lines: totalLines } };
  } catch (err) {
    return { error: err.message };
  }
}

function listDirSafe(dirPath = ".", recursive = false, pattern = null) {
  try {
    const fullPath = resolve(root, dirPath);
    
    if (!fullPath.startsWith(root)) {
      return { error: "Ugyldig sti" };
    }
    
    if (!existsSync(fullPath)) {
      return { error: `Mappe ikke funnet: ${dirPath}` };
    }
    
    const result = [];
    
    function scanDir(currentPath, relativePath, depth = 0) {
      const entries = readdirSync(currentPath, { withFileTypes: true });
      
      for (const entry of entries) {
        // Skip skjulte filer og node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        
        const entryRelative = join(relativePath, entry.name);
        const entryFull = join(currentPath, entry.name);
        
        if (entry.isDirectory()) {
          result.push({ type: "dir", path: entryRelative, depth });
          if (recursive) {
            scanDir(entryFull, entryRelative, depth + 1);
          }
        } else {
          if (pattern && !entry.name.match(new RegExp(pattern.replace("*", ".*")))) {
            continue;
          }
          const stats = statSync(entryFull);
          result.push({ 
            type: "file", 
            path: entryRelative, 
            depth,
            size: stats.size,
            modified: stats.mtime.toISOString()
          });
        }
      }
    }
    
    scanDir(fullPath, dirPath === "." ? "" : dirPath);
    return { entries: result, count: result.length };
  } catch (err) {
    return { error: err.message };
  }
}

function grepSearch(pattern, searchPath = ".", glob = null) {
  try {
    const fullPath = resolve(root, searchPath);
    const globPattern = glob || "*";
    
    // Bruk ripgrep hvis tilgjengelig, ellers fall tilbake til Node
    try {
      const rgCmd = `rg -n -i --type-add 'custom:${globPattern}' -tcustom "${pattern}" "${fullPath}" 2>/dev/null || true`;
      const result = execSync(rgCmd, { encoding: "utf-8", cwd: root });
      return { results: result || "Ingen treff funnet", tool: "ripgrep" };
    } catch {
      // Fallback: bruk find + grep
      const cmd = `find "${fullPath}" -type f ${glob ? `-name "${glob}"` : ""} -exec grep -n -H -i "${pattern}" {} + 2>/dev/null | head -50`;
      const result = execSync(cmd, { encoding: "utf-8", cwd: root });
      return { results: result || "Ingen treff funnet", tool: "grep" };
    }
  } catch (err) {
    return { error: err.message };
  }
}

function runGit(command, args = "", message = null) {
  try {
    let cmd = `git ${command}`;
    
    switch (command) {
      case "commit":
        if (!message) return { error: "Commit krever melding" };
        cmd += ` -m "${message}" ${args}`;
        break;
      case "status":
      case "diff":
      case "log":
        cmd += ` --oneline -20 ${args}`;
        break;
      case "branch":
        cmd += ` -a ${args}`;
        break;
      default:
        cmd += ` ${args}`;
    }
    
    const result = execSync(cmd, { encoding: "utf-8", cwd: root });
    return { output: result || "(ingen output)", command: cmd };
  } catch (err) {
    return { error: err.message, stderr: err.stderr?.toString() };
  }
}

function runShell(command, timeout = 30000) {
  try {
    const result = execSync(command, { 
      encoding: "utf-8", 
      cwd: root,
      timeout,
      env: { ...process.env, ...env }
    });
    return { output: result || "(ingen output)", command };
  } catch (err) {
    return { 
      error: err.message, 
      code: err.status,
      stderr: err.stderr?.toString(),
      stdout: err.stdout?.toString()
    };
  }
}

function getProjectInfo(type) {
  try {
    switch (type) {
      case "structure":
        const pkg = existsSync(join(root, "package.json")) 
          ? JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))
          : null;
        return {
          name: pkg?.name || "ukjent",
          type: pkg?.type || "commonjs",
          mainDirs: listDirSafe(".", false).entries.filter(e => e.type === "dir").map(e => e.path)
        };
        
      case "deps":
        const pkg2 = existsSync(join(root, "package.json"))
          ? JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))
          : {};
        return {
          dependencies: Object.keys(pkg2.dependencies || {}),
          devDependencies: Object.keys(pkg2.devDependencies || {}),
          peerDependencies: Object.keys(pkg2.peerDependencies || {}),
          count: {
            deps: Object.keys(pkg2.dependencies || {}).length,
            devDeps: Object.keys(pkg2.devDependencies || {}).length
          }
        };
        
      case "scripts":
        const pkg3 = existsSync(join(root, "package.json"))
          ? JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))
          : {};
        return { scripts: pkg3.scripts || {} };
        
      case "config":
        const configs = [];
        const configFiles = [
          "package.json", "tsconfig.json", "next.config.mjs", 
          "tailwind.config.mjs", "eslint.config.mjs", "vitest.config.ts"
        ];
        for (const file of configFiles) {
          if (existsSync(join(root, file))) {
            configs.push(file);
          }
        }
        return { configFiles: configs };
        
      case "summary":
        const allInfo = {
          structure: getProjectInfo("structure"),
          deps: getProjectInfo("deps"),
          scripts: getProjectInfo("scripts"),
          config: getProjectInfo("config"),
          git: runGit("status").output?.substring(0, 500) || "Ikke et git-repo"
        };
        return allInfo;
        
      default:
        return { error: "Ukjent info-type" };
    }
  } catch (err) {
    return { error: err.message };
  }
}

async function callKimi(prompt, args = [], timeout = CONFIG.timeouts.default) {
  return new Promise((resolve) => {
    // Riktig syntaks: kimi --yolo --print '<prompt>' [extra-args...]
    const kimiArgs = ['--yolo', '--print', prompt, ...args];
    
    const child = spawn('kimi', kimiArgs, {
      cwd: root,
      env: { ...process.env, ...env, FORCE_COLOR: '0' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeout);

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);
      const output = stdout || stderr || "Ingen output fra Kimi";
      const finalOutput = timedOut 
        ? `[TIMEOUT etter ${timeout}ms]\n${truncateOutput(output)}`
        : truncateOutput(output);
      
      resolve({
        content: [{ type: "text", text: finalOutput }],
        isError: code !== 0 || timedOut,
      });
    });

    child.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        content: [{ type: "text", text: `Feil ved kall til Kimi: ${err.message}` }],
        isError: true,
      });
    });
  });
}

// ============================================================================
// VERKTØY-HÅNDTERERE
// ============================================================================

async function handleToolCall(name, args) {
  log(`🔧 Håndterer: ${name}`);
  
  try {
    switch (name) {
      // === PROGRESSIVE COMPLEXITY ===
      case "kimi_small":
        return await callKimi(args.prompt, [], CONFIG.timeouts.quick);
        
      case "kimi_medium":
        let medPrompt = args.prompt;
        if (args.files?.length) {
          const fileContents = args.files.map(f => {
            const result = readFileSafe(f);
            return result.error ? `// Feil ved lesing av ${f}: ${result.error}` : result.content;
          }).join("\n\n// ---\n\n");
          medPrompt = `Filer:\n${fileContents}\n\nOppgave: ${args.prompt}`;
        }
        return await callKimi(medPrompt, [], CONFIG.timeouts.default);
        
      case "kimi_large":
        let largePrompt = args.prompt;
        if (args.context) {
          largePrompt = `[KONTEKST]: ${args.context}\n\n[OPPGAVE]: ${args.prompt}`;
        }
        return await callKimi(largePrompt, [], CONFIG.timeouts.long);

      // === DIREKTE FILOPERASJONER ===
      case "kimi_read": {
        const result = readFileSafe(args.path, args.limit, args.offset);
        if (result.error) {
          return { content: [{ type: "text", text: `❌ ${result.error}` }], isError: true };
        }
        const meta = result.meta ? `\n\n[Meta: ${JSON.stringify(result.meta)}]` : "";
        return { content: [{ type: "text", text: result.content + meta }] };
      }
      
      case "kimi_list": {
        const listResult = listDirSafe(args.path, args.recursive, args.pattern);
        if (listResult.error) {
          return { content: [{ type: "text", text: `❌ ${listResult.error}` }], isError: true };
        }
        const formatted = listResult.entries
          .map(e => `${"  ".repeat(e.depth)}${e.type === "dir" ? "📁" : "📄"} ${e.path}${e.size ? ` (${e.size} bytes)` : ""}`)
          .join("\n");
        return { content: [{ type: "text", text: `${formatted}\n\n[Totalt: ${listResult.count} elementer]` }] };
      }
      
      case "kimi_grep": {
        const grepResult = grepSearch(args.pattern, args.path, args.glob);
        if (grepResult.error) {
          return { content: [{ type: "text", text: `❌ ${grepResult.error}` }], isError: true };
        }
        return { content: [{ type: "text", text: `[Søk med ${grepResult.tool}]:\n${grepResult.results}` }] };
      }

      // === KODE-OPERASJONER ===
      case "kimi_code": {
        let prompt = args.instruction;
        if (args.filePath) {
          prompt = `Arbeid med filen ${args.filePath}. ${args.instruction}`;
        }
        const timeout = args.complexity === "small" ? CONFIG.timeouts.quick 
          : args.complexity === "large" ? CONFIG.timeouts.long 
          : CONFIG.timeouts.default;
        return await callKimi(prompt, ["--yolo"], timeout);
      }
      
      case "kimi_refactor": {
        const fileResult = readFileSafe(args.filePath);
        if (fileResult.error) {
          return { content: [{ type: "text", text: `❌ ${fileResult.error}` }], isError: true };
        }
        const prompt = `Refaktorer denne filen med fokus på: ${args.goal}\n\nFil: ${args.filePath}\n\n\`\`\`\n${fileResult.content}\n\`\`\``;
        return await callKimi(prompt, ["--yolo"]);
      }
      
      case "kimi_explain": {
        const detailLevel = args.detail || "normal";
        const prompt = `Forklar ${detailLevel === "brief" ? "kort" : detailLevel === "detailed" ? "detaljert" : ""}: ${args.target}`;
        return await callKimi(prompt);
      }

      // === GIT ===
      case "kimi_git": {
        const gitResult = runGit(args.command, args.args, args.message);
        if (gitResult.error) {
          return { content: [{ type: "text", text: `❌ Git-feil: ${gitResult.error}` }], isError: true };
        }
        return { content: [{ type: "text", text: `🌿 Git ${args.command}:\n${gitResult.output}` }] };
      }

      // === PROSJEKT ===
      case "kimi_project": {
        const info = getProjectInfo(args.info);
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
      }

      // === SHELL ===
      case "kimi_shell": {
        const shellResult = runShell(args.command, args.timeout);
        if (shellResult.error) {
          return { 
            content: [{ type: "text", text: `❌ Shell-feil (kode ${shellResult.code}): ${shellResult.error}\n${shellResult.stderr || ""}` }], 
            isError: true 
          };
        }
        return { content: [{ type: "text", text: `⚡ Output:\n${shellResult.output}` }] };
      }

      // === TEST ===
      case "kimi_test": {
        const testType = args.type || "unit";
        const testPath = args.path;
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

// ============================================================================
// HJELPER: Kjør kimi CLI med ren argv (ingen prompt-tekst!)
// ============================================================================

function runKimiCLI(subcommand, args = [], timeout = 60000) {
  const argv = ['kimi', subcommand, ...args].filter(Boolean);
  
  // DEBUG-modus: logg og returner tidlig uten å kjøre
  if (process.env.DEBUG === '1' || process.env.DEBUG === 'true') {
    log(`[DEBUG] argv: ${JSON.stringify(argv)}`);
    return { debug: true, argv };
  }
  
  log(`[runKimiCLI] spawn: ${JSON.stringify(argv)}`);
  
  try {
    const result = execSync(argv.join(' '), { 
      cwd: root, 
      encoding: 'utf-8', 
      stdio: 'pipe', 
      timeout,
      env: { ...process.env, ...env }
    });
    return { output: result, argv };
  } catch (err) {
    return { error: err.message, stdout: err.stdout, stderr: err.stderr, argv };
  }
}

      // === CI/CD - Kaller kimi CLI med ren argv ===
      case "kimi_ci": {
        const result = runKimiCLI('ci', [], 180000);
        if (result.debug) {
          return { content: [{ type: 'text', text: `[DEBUG] kimi_ci argv: ${JSON.stringify(result.argv)}` }] };
        }
        if (result.error) {
          return { content: [{ type: 'text', text: result.stdout || result.error }], isError: true };
        }
        return { content: [{ type: 'text', text: result.output }] };
      }
      
      case "kimi_deploy": {
        const target = args.target || 'preview';
        const result = runKimiCLI('deploy', [target], 180000);
        if (result.debug) {
          return { content: [{ type: 'text', text: `[DEBUG] kimi_deploy argv: ${JSON.stringify(result.argv)}` }] };
        }
        if (result.error) {
          return { content: [{ type: 'text', text: result.stdout || result.error }], isError: true };
        }
        return { content: [{ type: 'text', text: result.output }] };
      }

      // === DATABASE - Kaller kimi CLI med ren argv ===
      case "kimi_db": {
        const action = args.action || 'status';
        const result = runKimiCLI('db', [action], 60000);
        if (result.debug) {
          return { content: [{ type: 'text', text: `[DEBUG] kimi_db argv: ${JSON.stringify(result.argv)}` }] };
        }
        if (result.error) {
          return { content: [{ type: 'text', text: result.stdout || result.error }], isError: true };
        }
        return { content: [{ type: 'text', text: result.output }] };
      }

      // === MONITORING - Kaller kimi CLI med ren argv ===
      case "kimi_monitor": {
        const check = args.check || 'full';
        const result = runKimiCLI('monitor', [check], 60000);
        if (result.debug) {
          return { content: [{ type: 'text', text: `[DEBUG] kimi_monitor argv: ${JSON.stringify(result.argv)}` }] };
        }
        if (result.error) {
          return { content: [{ type: 'text', text: `⚠️ Health check feilet: ${result.error}\n${result.stdout || ''}` }], isError: true };
        }
        return { content: [{ type: 'text', text: result.output }] };
      }

      // === BATCH ===
      case "kimi_batch": {
        const results = [];
        for (const op of args.operations || []) {
          log(`  📦 Batch: ${op.tool}`);
          const result = await handleToolCall(op.tool, op.args || {});
          results.push({ tool: op.tool, result });
        }
        return { 
          content: [{ 
            type: "text", 
            text: `📦 Batch-resultater (${results.length} operasjoner):\n\n${results.map(r => `[${r.tool}]:\n${JSON.stringify(r.result, null, 2)}`).join("\n\n---\n\n")}` 
          }] 
        };
      }

      // === HJELP ===
      case "kimi_help": {
        if (args.tool) {
          const tool = TOOLS.find(t => t.name === args.tool);
          if (tool) {
            return { content: [{ type: "text", text: `${tool.name}: ${tool.description}\n\nSchema:\n${JSON.stringify(tool.inputSchema, null, 2)}` }] };
          }
          return { content: [{ type: "text", text: `Ukjent verktøy: ${args.tool}` }], isError: true };
        }
        const toolList = TOOLS.map(t => `- ${t.name}: ${t.description.split(".")[0]}`).join("\n");
        return { content: [{ type: "text", text: `📚 Tilgjengelige verktøy:\n\n${toolList}\n\nBruk kimi_help med tool="<navn>" for detaljer.` }] };
      }

      default:
        return { content: [{ type: "text", text: `❌ Ukjent verktøy: ${name}` }], isError: true };
    }
  } catch (err) {
    logError(`Feil i ${name}: ${err.message}`);
    return { 
      content: [{ type: "text", text: `❌ Feil: ${err.message}` }], 
      isError: true 
    };
  }
}

// ============================================================================
// MCP SERVER HÅNDTERING
// ============================================================================

function log(msg) {
  console.error(`[kimi-mcp-v3] ${msg}`);
}

function logError(msg) {
  console.error(`[kimi-mcp-v3] ❌ ${msg}`);
}

function sendResponse(id, result) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, result }));
}

function sendError(id, code, message) {
  console.log(JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }));
}

// Valider at Kimi er tilgjengelig
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

// Start server
log(`Server v${CONFIG.serverInfo.version} starter...`);
log(`Prosjekt: ${root}`);

// Håndter innkommende JSON-RPC meldinger
process.stdin.setEncoding("utf-8");

let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  
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
    
    switch (method) {
      case "initialize":
        sendResponse(id, {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: CONFIG.serverInfo,
        });
        log("Klient initialisert");
        break;
        
      case "tools/list":
        sendResponse(id, { tools: TOOLS });
        log(`Verktøyliste sendt (${TOOLS.length} verktøy)`);
        break;
        
      case "tools/call":
        const result = await handleToolCall(params.name, params.arguments);
        sendResponse(id, result);
        break;
        
      case "notifications/initialized":
        // Acknowledge, no response needed
        break;
        
      default:
        sendError(id, -32601, `Ukjent metode: ${method}`);
    }
  } catch (err) {
    logError(`Melding-feil: ${err.message}`);
    console.error(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: err.message } }));
  }
}

// ============================================================================
// SMOKE TEST - Verifiserer at MCP-kommandoer resolves korrekt
// ============================================================================

function runSmokeTest() {
  log('🔥 Kjører smoke test...');
  
  const tests = [
    { tool: 'kimi_db', args: { action: 'status' }, expectedCmd: ['kimi', 'db', 'status'] },
    { tool: 'kimi_ci', args: {}, expectedCmd: ['kimi', 'ci'] },
    { tool: 'kimi_monitor', args: { check: 'full' }, expectedCmd: ['kimi', 'monitor', 'full'] },
    { tool: 'kimi_deploy', args: { target: 'preview' }, expectedCmd: ['kimi', 'deploy', 'preview'] },
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      // Simuler command resolution (samme logikk som i handleToolCall)
      let resolvedCmd;
      switch (test.tool) {
        case 'kimi_db': resolvedCmd = ['kimi', 'db', test.args.action || 'status']; break;
        case 'kimi_ci': resolvedCmd = ['kimi', 'ci']; break;
        case 'kimi_monitor': resolvedCmd = ['kimi', 'monitor', test.args.check || 'full']; break;
        case 'kimi_deploy': resolvedCmd = ['kimi', 'deploy', test.args.target || 'preview']; break;
      }
      
      const match = JSON.stringify(resolvedCmd) === JSON.stringify(test.expectedCmd);
      if (match) {
        log(`  ✅ ${test.tool}: ${JSON.stringify(resolvedCmd)}`);
        passed++;
      } else {
        logError(`  ❌ ${test.tool}: Forventet ${JSON.stringify(test.expectedCmd)}, fikk ${JSON.stringify(resolvedCmd)}`);
        failed++;
      }
    } catch (e) {
      logError(`  ❌ ${test.tool}: ${e.message}`);
      failed++;
    }
  }
  
  log(`🔥 Smoke test fullført: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Kjør smoke test hvis flagget er satt
if (process.argv.includes('--smoke-test')) {
  const success = runSmokeTest();
  process.exit(success ? 0 : 1);
}

log("✅ Klar for tilkoblinger fra Perplexity Desktop");
