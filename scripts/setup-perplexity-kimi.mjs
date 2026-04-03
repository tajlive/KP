#!/usr/bin/env node
/**
 * Setup-script for Perplexity Desktop + Kimi CLI integrasjon
 * 
 * Kjør: node scripts/setup-perplexity-kimi.mjs
 */
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { homedir, platform } from "os";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const scriptPath = resolve(root, "scripts/run-kimi-mcp.mjs");

console.log("🔧 Perplexity Desktop + Kimi CLI Setup\n");

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
console.log("\n2️⃣  Sjekker MCP-script...");
if (!existsSync(scriptPath)) {
  console.error(`   ❒ MCP-script ikke funnet: ${scriptPath}`);
  process.exit(1);
}
console.log(`   ✅ MCP-script funnet: ${scriptPath}`);

// 3. Finn Perplexity config-mappe
console.log("\n3️⃣  Finner Perplexity Desktop konfigurasjon...");
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

// 4. Sjekk om Perplexity er installert
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

// 5. Les eksisterende config eller lag ny
console.log("\n4️⃣  Konfigurerer MCP...");
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

// 6. Legg til Kimi MCP
const kimiConfig = {
  description: "Kimi CLI - direkte tilgang til Kimi Code CLI",
  command: "node",
  args: [scriptPath],
};

existingConfig.mcpServers = existingConfig.mcpServers || {};
existingConfig.mcpServers.kimi = kimiConfig;

// 7. Skriv config
const configJson = JSON.stringify(existingConfig, null, 2);
writeFileSync(mcpConfigPath, configJson, "utf-8");
console.log(`   ✅ Kimi MCP lagt til i: ${mcpConfigPath}`);

// 8. Vis ferdig config
console.log("\n5️⃣  MCP-konfigurasjon:");
console.log("   " + configJson.split("\n").join("\n   "));

// 9. Instruksjoner
console.log("\n" + "=".repeat(60));
console.log("✅ Setup fullført!");
console.log("=".repeat(60));
console.log("\n📋 Neste steg:");
console.log("   1. Start Perplexity Desktop (eller restart hvis den var åpen)");
console.log("   2. Åpne Settings (⌘, på Mac)");
console.log("   3. Gå til 'MCP' eller 'Integrations'");
console.log("   4. Bekreft at 'kimi' vises i listen over MCP-servere");
console.log("   5. Test med: 'Bruk kimi_ask til å spørre om prosjektet'");
console.log("\n🛠️  Tilgjengelige verktøy:");
console.log("   • kimi_ask      - Generelle spørsmål til Kimi");
console.log("   • kimi_code     - Kode-skriving og redigering");
console.log("   • kimi_search   - Søk i kodebasen");
console.log("   • kimi_read_file - Les og analyser spesifikke filer");
console.log("   • kimi_run_tests - Kjør tester");
console.log("\n💡 Tips:");
console.log("   • Kimi vil svare med samme hastighet som normalt (~1-30s)");
console.log("   • Alle Kimi-verktøy (ReadFile, WriteFile, Shell) er tilgjengelige");
console.log("   • Bruk --yolo-flagget er automatisk aktivert for kode-verktøyet");
console.log("=".repeat(60));

// 10. Test at scriptet fungerer
console.log("\n🧪 Tester MCP-server...");
try {
  const testResult = execSync(`echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node "${scriptPath}" 2>&1 | head -5`, { 
    encoding: "utf-8",
    timeout: 10000,
    env: { ...process.env, FORCE_COLOR: "0" }
  });
  
  if (testResult.includes("jsonrpc") || testResult.includes("protocolVersion")) {
    console.log("   ✅ MCP-server responderer korrekt!");
  } else {
    console.log("   ⚠️  MCP-server svarte, men uventet format");
    console.log(`   Debug: ${testResult.substring(0, 200)}`);
  }
} catch (err) {
  console.log("   ⚠️  Kunne ikke teste server (kan være normalt)");
}
