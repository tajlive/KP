#!/usr/bin/env node
/**
 * Guard script - Sjekker for Supabase kolonne-feil før commit
 * 
 * Dette scriptet:
 * 1. Kjører TypeScript-sjekk
 * 2. Parser output for Supabase-spesifikke feil
 * 3. Gir tydelige instruksjoner for fiksing
 * 
 * Usage:
 *   node scripts/guard-supabase-columns.mjs
 *   node scripts/guard-supabase-columns.mjs --fix (kjør auto-fix)
 */

import { execSync, spawn } from "child_process";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Fargede logger
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

function runTypeCheck() {
  console.log(cyan("🔍 Kjører TypeScript-sjekk..."));
  
  try {
    const result = execSync("npx tsc --noEmit 2>&1", {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 120000,
    });
    return { success: true, output: result };
  } catch (err) {
    return { 
      success: false, 
      output: err.stdout || err.stderr || err.message || ""
    };
  }
}

function parseSupabaseErrors(output) {
  const errors = [];
  const lines = output.split("\n");
  
  // Pattern for Supabase type errors
  // Eksempel: Argument of type '"bad_column"' is not assignable to parameter of type '"col1" | "col2"'
  const errorPattern = /Argument of type ['"](\w+)['"] is not assignable to parameter of type ['"]([^'"]+)['"]/;
  
  // Pattern for fil/lokalisering
  // Eksempel: src/app/api/file.ts(123,45):
  const locationPattern = /^(.+\.tsx?)\((\d+),(\d+)\):/;
  
  let currentFile = null;
  let currentLine = null;
  
  for (const line of lines) {
    // Sjekk om dette er en lokalisering-linje
    const locMatch = line.match(locationPattern);
    if (locMatch) {
      currentFile = locMatch[1];
      currentLine = parseInt(locMatch[2], 10);
      continue;
    }
    
    // Sjekk om dette er en Supabase-feil
    const errorMatch = line.match(errorPattern);
    if (errorMatch && currentFile) {
      const badColumn = errorMatch[1];
      const validColumns = errorMatch[2].split("|").map(c => c.trim().replace(/"/g, ""));
      
      errors.push({
        file: currentFile,
        line: currentLine,
        badColumn,
        validColumns,
        fullLine: line.trim()
      });
      
      // Reset for neste feil
      currentFile = null;
      currentLine = null;
    }
  }
  
  return errors;
}

function printErrorSummary(errors) {
  console.log("\n" + red("❌ FUNNET Supabase-kolonne-feil:"));
  console.log(red("═".repeat(60)));
  
  // Grupper etter fil
  const byFile = {};
  for (const err of errors) {
    if (!byFile[err.file]) byFile[err.file] = [];
    byFile[err.file].push(err);
  }
  
  for (const [file, fileErrors] of Object.entries(byFile)) {
    console.log(`\n${yellow(file)}:`);
    for (const err of fileErrors) {
      console.log(`  Linje ${err.line}: ${red(err.badColumn)}`);
      console.log(`    Gyldige kolonner: ${green(err.validColumns.join(", "))}`);
    }
  }
  
  console.log("\n" + red("═".repeat(60)));
}

function printInstructions(errors, autoFixAvailable) {
  console.log("\n" + cyan("🔧 Hvordan fikse:"));
  console.log("");
  
  if (autoFixAvailable) {
    console.log("  Alternativ 1 - Automatisk fiksing:");
    console.log(`    ${green("python3 scripts/fix-supabase-eq-columns.py")}`);
    console.log("");
    console.log("  Alternativ 2 - Manuell fiksing:");
  } else {
    console.log("  Manuell fiksing:");
  }
  
  console.log("    1. Åpne filen(e) som rapporterer feil");
  console.log("    2. Finn .eq(\"bad_column\", ...) kallet");
  console.log("    3. Erstatt med en gyldig kolonne fra tabellen");
  console.log("    4. Kjør 'npx tsc --noEmit' for å verifisere");
  console.log("");
  console.log(cyan("💡 Tips:"));
  console.log("    - Bruk 'user_id' eller 'id' som fallback");
  console.log("    - Sjekk src/types/supabase-generated.ts for gyldige kolonner");
}

async function runAutoFix() {
  console.log(cyan("\n🔧 Kjører automatisk fiksing...\n"));
  
  return new Promise((resolve) => {
    const fixScript = spawn("python3", [
      "scripts/fix-supabase-eq-columns.py"
    ], {
      cwd: ROOT,
      stdio: "inherit"
    });
    
    fixScript.on("close", (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes("--fix") || args.includes("-f");
  const verbose = args.includes("--verbose") || args.includes("-v");
  
  console.log(cyan("╔════════════════════════════════════════════════════════╗"));
  console.log(cyan("║  Supabase Column Guard                                 ║"));
  console.log(cyan("╚════════════════════════════════════════════════════════╝\n"));
  
  // Kjør type check
  const { success, output } = runTypeCheck();
  
  if (success) {
    console.log(green("✅ TypeScript-sjekk fullført uten feil!"));
    console.log(green("   Ingen Supabase-kolonne-problemer funnet."));
    process.exit(0);
  }
  
  // Parse feil
  const supabaseErrors = parseSupabaseErrors(output);
  
  if (supabaseErrors.length === 0) {
    // Andre TypeScript-feil, ikke Supabase-spesifikke
    console.log(yellow("⚠️  TypeScript-feil funnet (ikke Supabase-kolonne relatert):"));
    console.log(output.slice(0, 500));
    process.exit(1);
  }
  
  // Vis Supabase-feil
  printErrorSummary(supabaseErrors);
  
  // Sjekk om auto-fix script finnes
  const autoFixAvailable = (() => {
    try {
      readFileSync(join(ROOT, "scripts", "fix-supabase-eq-columns.py"));
      return true;
    } catch {
      return false;
    }
  })();
  
  // Kjør auto-fix hvis forespurt
  if (shouldFix && autoFixAvailable) {
    const fixed = await runAutoFix();
    
    if (fixed) {
      console.log("\n" + green("✅ Automatisk fiksing fullført!"));
      console.log(cyan("   Verifiserer at feilene er rettet...\n"));
      
      // Re-run type check
      const recheck = runTypeCheck();
      if (recheck.success) {
        console.log(green("✅ Alle feil er rettet!"));
        process.exit(0);
      } else {
        const remainingErrors = parseSupabaseErrors(recheck.output);
        if (remainingErrors.length > 0) {
          console.log(yellow(`⚠️  ${remainingErrors.length} feil kunne ikke fikses automatisk.`));
          printErrorSummary(remainingErrors);
          printInstructions(remainingErrors, false);
          process.exit(1);
        } else {
          console.log(yellow("⚠️  Andre TypeScript-feil gjenstår."));
          process.exit(1);
        }
      }
    } else {
      console.log(red("\n❌ Automatisk fiksing feilet."));
      printInstructions(supabaseErrors, false);
      process.exit(1);
    }
  } else {
    printInstructions(supabaseErrors, autoFixAvailable);
    
    if (autoFixAvailable) {
      console.log("\n" + cyan("💡 Kjør med --fix for automatisk fiksing:"));
      console.log(`    ${green("node scripts/guard-supabase-columns.mjs --fix")}`);
    }
    
    process.exit(1);
  }
}

main().catch(err => {
  console.error(red("\n❌ Uventet feil:"), err.message);
  process.exit(1);
});
