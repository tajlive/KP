#!/usr/bin/env node
/**
 * Setup-script for Perplexity Desktop + Kimi CLI (OPTIMIZED v3)
 * 
 * Kjør: node scripts/setup-perplexity-kimi-optimized.mjs
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir, platform } from "os";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const scriptPath = resolve(root, "scripts/run-kimi-mcp-optimized.mjs");

console.log("🔧 Perplexity Desktop + Kimi CLI (OPTIMIZED v3) Setup\n");

// 1. Sjekk at Kimi er installert
console.log("1️⃣  Sjekker Kimi CLI...");
try {
  const kimiVersion = execSync("kimi --version", { encoding: "utf-8" }).trim();
  console.log(`   ✅ Kimi funnet: ${kimiVersion}`);
} catch {
  console.error("   ❌ Kimi ikke funnet!");
  console.error("   Installer med: uv tool install kimi-cli");
  console.error("   Eller: pip install kimi-cli");
  process.exit(1);
}

// 2. Sjekk at MCP-scriptet finnes
console.log("\n2️⃣  Sjekker MCP-script (optimized)...");
if (!existsSync(scriptPath)) {
  console.error(`   ❌ MCP-script ikke funnet: ${scriptPath}`);
  process.exit(1);
}
console.log(`   ✅ MCP-script funnet: ${scriptPath}`);

// 3. Sjekk avhengigheter
console.log("\n3️⃣  Sjekker avhengigheter...");
const deps = [
  { cmd: "which rg", name: "ripgrep", install: "brew install ripgrep" },
  { cmd: "which git", name: "git", install: "git --version" },
  { cmd: "which node", name: "Node.js", install: "node --version" },
];

for (const dep of deps) {
  try {
    execSync(dep.cmd, { encoding: "utf-8" });
    console.log(`   ✅ ${dep.name} funnet`);
  } catch {
    console.log(`   ⚠️  ${dep.name} ikke funnet. Installasjon: ${dep.install}`);
  }
}

// 4. Finn Perplexity config-mappe
console.log("\n4️⃣  Finner Perplexity Desktop konfigurasjon...");
const isMac = platform() === "darwin";
const isWindows = platform() === "win32";
const isLinux = platform() === "linux";

let perplexityDir;
if (isMac) {
  perplexityDir = resolve(homedir(), "Library/Application Support/Perplexity");
} else if (isWindows) {
  perplexityDir = resolve(homedir(), "AppData/Roaming/Perplexity");
} else if (isLinux) {
  perplexityDir = resolve(homedir(), ".config/Perplexity");
}

if (!perplexityDir) {
  console.error("   ❌ Ikke-støttet plattform. Støtter kun Mac, Windows og Linux.");
  process.exit(1);
}

console.log(`   📁 Perplexity-mappe: ${perplexityDir}`);

// 5. Sjekk om Perplexity er installert
if (!existsSync(perplexityDir)) {
  console.error("   ⚠️  Perplexity Desktop ser ikke ut til å være installert.");
  console.error("      Last ned fra: https://www.perplexity.ai/download");
  
  const shouldCreate = process.argv.includes("--force");
  if (!shouldCreate) {
    console.error("\n   Kjør med --force for å opprette config likevel.");
    process.exit(1);
  }
  
  mkdirSync(perplexityDir, { recursive: true });
  console.log("   📁 Opprettet Perplexity-mappe (med --force)");
}

// 6. Les eksisterende config eller lag ny
console.log("\n5️⃣  Konfigurerer MCP (OPTIMIZED)...");
const mcpConfigPath = resolve(perplexityDir, "mcp.json");

let existingConfig = { mcpServers: {} };
if (existsSync(mcpConfigPath)) {
  try {
    const content = readFileSync(mcpConfigPath, "utf-8");
    existingConfig = JSON.parse(content);
    console.log("   📄 Fant eksisterende mcp.json");
  } catch (err) {
    console.error(`   ⚠️  Kunne ikke lese eksisterende config: ${err.message}`);
    console.log("   Starter med tom config...");
  }
} else {
  console.log("   🆕 Oppretter ny mcp.json");
}

// 7. Legg til Kimi MCP (OPTIMIZED)
const kimiConfig = {
  description: "Kimi CLI v3 - OPTIMIZED med progressive complexity, direkte filoperasjoner, git-integrasjon",
  command: "node",
  args: [scriptPath],
};

existingConfig.mcpServers = existingConfig.mcpServers || {};
existingConfig.mcpServers.kimi = kimiConfig;

// 8. Skriv config
const configJson = JSON.stringify(existingConfig, null, 2);
writeFileSync(mcpConfigPath, configJson, "utf-8");
console.log(`   ✅ Kimi MCP (OPTIMIZED) lagt til i: ${mcpConfigPath}`);

// 9. Vis ferdig config
console.log("\n6️⃣  MCP-konfigurasjon:");
console.log("   " + configJson.split("\n").join("\n   "));

// 10. Test at scriptet fungerer
console.log("\n7️⃣  Tester MCP-server...");
try {
  const testResult = execSync(`echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node "${scriptPath}" 2>&1 | head -20`, { 
    encoding: "utf-8",
    timeout: 10000,
    env: { ...process.env, FORCE_COLOR: "0" }
  });
  
  if (testResult.includes("kimi_small") || testResult.includes("kimi_medium")) {
    console.log("   ✅ MCP-server (OPTIMIZED) responderer korrekt!");
    const toolMatch = testResult.match(/"name": "kimi_\w+/g);
    if (toolMatch) {
      console.log(`   📊 Fant ${toolMatch.length} verktøy`);
    }
  } else {
    console.log("   ⚠️  MCP-server svarte, men uventet format");
  }
} catch (err) {
  console.log("   ⚠️  Kunne ikke teste server fullt ut (kan være normalt)");
}

// 11. Instruksjoner
console.log("\n" + "=".repeat(70));
console.log("✅ Setup fullført! (OPTIMIZED v3)");
console.log("=".repeat(70));
console.log("\n📋 Neste steg:");
console.log("   1. Start Perplexity Desktop (eller restart hvis åpen)");
console.log("   2. Åpne Settings (⌘, på Mac)");
console.log("   3. Gå til 'MCP' eller 'Integrations'");
console.log("   4. Bekreft at 'kimi' vises med OPTIMIZED beskrivelse");
console.log("\n🚀 NYE OPTIMIZED verktøy:");
console.log("\n   ⚡ RASKE (direkte, ingen Kimi-kall):");
console.log("      • kimi_read      - Les fil direkte");
console.log("      • kimi_list      - List mappe-innhold");
console.log("      • kimi_grep      - Søk i kodebase");
console.log("      • kimi_git       - Git-operasjoner");
console.log("      • kimi_project   - Prosjekt-info");
console.log("      • kimi_shell     - Shell-kommandoer");
console.log("\n   🧠 PROGRESSIVE COMPLEXITY:");
console.log("      • kimi_small     - Rask (< 1 min): fakta, enkle spørsmål");
console.log("      • kimi_medium    - Standard (1-3 min): kode, analyse");
console.log("      • kimi_large     - Deep (3-10 min): komplekse oppgaver");
console.log("\n   💻 KODE-OPERASJONER:");
console.log("      • kimi_code      - Skriv/rediger kode");
console.log("      • kimi_refactor  - Refaktorer eksisterende kode");
console.log("      • kimi_explain   - Forklar kode/konsept");
console.log("\n   🔄 CI/CD & DEVOPS:");
console.log("      • kimi_test      - Kjør tester");
console.log("      • kimi_ci        - CI-pipeline");
console.log("      • kimi_deploy    - Deploy til Vercel");
console.log("      • kimi_db        - Database-operasjoner");
console.log("      • kimi_monitor   - Health checks");
console.log("\n   📦 AVANSERT:");
console.log("      • kimi_batch     - Kjør flere operasjoner samtidig");
console.log("      • kimi_help      - Hjelp for verktøy");
console.log("\n💡 Eksempel-prompts i Perplexity:");
console.log('   • "Bruk kimi_small: Hva er hovedspråket i prosjektet?"');
console.log('   • "Bruk kimi_read til å lese README.md"');
console.log('   • "Bruk kimi_list med recursive=true for å se strukturen"');
console.log('   • "Bruk kimi_grep med pattern=useAuth"');
console.log('   • "Bruk kimi_git med command=status"');
console.log('   • "Bruk kimi_batch med operations=[...]"');
console.log("=".repeat(70));
