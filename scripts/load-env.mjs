#!/usr/bin/env node
/**
 * Universal env loader — laster ALLE variabler fra .env.local
 * Brukes av MCP wrapper-scripts for å gi Cursor tilgang til alle secrets
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

export function loadEnvLocal() {
  const env = { ...process.env };
  
  // Les fra begge env-filer: .env.local (høyest prioritet) og .env.mcp.local
  const envPaths = [
    resolve(root, ".env.mcp.local"),  // Laves prioritet
    resolve(root, ".env.local"),       // Høyest prioritet
  ];
  
  let loadedTotal = 0;
  
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue;
    }

    try {
      const content = readFileSync(envPath, "utf8");
      let loaded = 0;
      const fileName = envPath.split('/').pop();
      
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
          const eq = trimmed.indexOf("=");
          if (eq > 0) {
            const key = trimmed.slice(0, eq).trim();
            let value = trimmed.slice(eq + 1).trim();
            
            // Fjern quotes
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1).replace(/\\"/g, '"');
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1).replace(/\\'/g, "'");
            }
            // Defensiv trim etter quote-stripping (forhindrer trailing newline-bugs)
            value = value.trim();
            
            // Kun sett hvis ikke allerede definert (prioriter eksisterende env)
            // Siden .env.local kommer sist, vil den overstyre .env.mcp.local
            if (env[key] === undefined || env[key] === "") {
              env[key] = value;
              loaded++;
            }
          }
        }
      }
      
      console.error(`[load-env] Lastet ${loaded} variabler fra ${fileName}`);
      loadedTotal += loaded;
    } catch (e) {
      console.error(`[load-env] Feil ved lesing av ${envPath}:`, e.message);
    }
  }
  
  console.error(`[load-env] Totalt lastet: ${loadedTotal} variabler`);
  return env;
}

// Hvis kjørt direkte, print alle keys (ikke verdier)
if (import.meta.url === `file://${process.argv[1]}`) {
  const env = loadEnvLocal();
  console.log("Tilgjengelige variabler:");
  Object.keys(env).sort().forEach(k => {
    if (!k.startsWith("_") && !k.startsWith("npm_")) {
      const masked = env[k] ? "***" : "(tom)";
      console.log(`  ${k}: ${masked}`);
    }
  });
}
