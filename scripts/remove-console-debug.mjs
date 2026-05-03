#!/usr/bin/env node
/**
 * Remove console.log and console.info from production code.
 * Preserves console.error and console.warn (operational logging).
 * Skips test files, __tests__ directories, and type definition files.
 */
import { Project, SyntaxKind } from "ts-morph";
import { globSync } from "glob";
import { resolve } from "path";

const PROJECT_ROOT = resolve(process.cwd());
const DRY_RUN = process.argv.includes("--dry-run");

// Find all .ts/.tsx files except tests
const files = globSync("src/**/*.{ts,tsx}", {
  cwd: PROJECT_ROOT,
  absolute: true,
  ignore: ["**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/types/**"],
});

console.log(`🔍 Scanning ${files.length} files for console.log / console.info...`);

const project = new Project({
  tsConfigFilePath: resolve(PROJECT_ROOT, "tsconfig.json"),
});

let removedLog = 0;
let removedInfo = 0;
let modifiedFiles = 0;
const details = [];

for (const filePath of files) {
  const sourceFile = project.addSourceFileAtPath(filePath);
  let fileModified = false;
  const relativePath = filePath.replace(PROJECT_ROOT + "/", "");

  // Find all console.log and console.info calls
  const calls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
  const toRemove = [];

  for (const call of calls) {
    const expr = call.getExpression();
    const text = expr.getText();

    if (text === "console.log" || text === "console.info") {
      // Find the parent ExpressionStatement
      let parent = call.getParent();
      while (parent && parent.getKind() !== SyntaxKind.ExpressionStatement) {
        parent = parent.getParent();
      }
      if (parent) {
        toRemove.push({ node: parent, text: text, line: parent.getStartLineNumber() });
      }
    }
  }

  if (toRemove.length > 0) {
    // Remove in reverse order to preserve line numbers
    for (let i = toRemove.length - 1; i >= 0; i--) {
      const { node, text, line } = toRemove[i];
      if (!DRY_RUN) {
        node.remove();
      }
      if (text === "console.log") removedLog++;
      else removedInfo++;
      details.push(`${relativePath}:${line}  ${text}(...)`);
    }
    fileModified = true;
  }

  if (fileModified && !DRY_RUN) {
    sourceFile.saveSync();
    modifiedFiles++;
  }
}

console.log(`\n${DRY_RUN ? "[DRY RUN] " : ""}✅ Results:`);
console.log(`   console.log removed:  ${removedLog}`);
console.log(`   console.info removed: ${removedInfo}`);
console.log(`   Total removed:        ${removedLog + removedInfo}`);
console.log(`   Files modified:       ${modifiedFiles}`);

if (details.length > 0 && process.argv.includes("--verbose")) {
  console.log("\n📋 Details:");
  details.forEach((d) => console.log(`   ${d}`));
}

if (!DRY_RUN) {
  console.log("\n⚠️  console.warn and console.error were preserved (operational logging).");
  console.log("   Run 'npm run type-check' to verify no syntax errors were introduced.");
}

process.exit(0);
