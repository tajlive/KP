#!/usr/bin/env node
/**
 * Fix empty blocks left after removing console statements.
 * - Removes empty if-statements
 * - Removes empty else-clauses
 * - Adds comment to empty catch blocks (required by ESLint no-empty rule)
 */
import { Project, SyntaxKind } from "ts-morph";
import { resolve } from "path";

const PROJECT_ROOT = resolve(process.cwd());
const DRY_RUN = process.argv.includes("--dry-run");

const files = [
  "src/app/api/cron/tick/route.ts",
  "src/hooks/usePageTracking.ts",
  "src/lib/analytics.ts",
  "src/lib/api-request-context.ts",
  "src/lib/auth/sentry-auth.ts",
  "src/lib/auth/utils.ts",
  "src/lib/pwa/usePWA.ts",
  "src/lib/supabase/client.ts",
  "src/lib/supabase/paper-trading.ts",
  "src/middleware/auth.ts",
  "src/shared/ui/password-input.tsx",
];

const project = new Project({ tsConfigFilePath: resolve(PROJECT_ROOT, "tsconfig.json") });
let modified = 0;

for (const relPath of files) {
  const filePath = resolve(PROJECT_ROOT, relPath);
  const sourceFile = project.addSourceFileAtPath(filePath);
  let fileChanged = false;

  // 1. Fix empty catch clauses: add "// Intentionally empty"
  const catchClauses = sourceFile.getDescendantsOfKind(SyntaxKind.CatchClause);
  for (const catchClause of catchClauses) {
    const block = catchClause.getBlock();
    if (block && block.getStatements().length === 0) {
      if (!DRY_RUN) {
        block.addStatements("// Intentionally empty");
      }
      fileChanged = true;
    }
  }

  // 2. Remove empty if-statements (no else)
  const ifStatements = sourceFile.getDescendantsOfKind(SyntaxKind.IfStatement);
  for (const ifStmt of [...ifStatements].reverse()) {
    const thenBlock = ifStmt.getThenStatement();
    const elseBlock = ifStmt.getElseStatement();

    // If no else and then is empty block → remove entire if
    if (!elseBlock && thenBlock.getKind() === SyntaxKind.Block) {
      const block = thenBlock.asKind(SyntaxKind.Block);
      if (block && block.getStatements().length === 0) {
        if (!DRY_RUN) {
          ifStmt.remove();
        }
        fileChanged = true;
      }
    }

    // If then is non-empty but else is empty block → remove else
    if (elseBlock && elseBlock.getKind() === SyntaxKind.Block) {
      const block = elseBlock.asKind(SyntaxKind.Block);
      if (block && block.getStatements().length === 0) {
        if (!DRY_RUN) {
          ifStmt.removeElse();
        }
        fileChanged = true;
      }
    }
  }

  if (fileChanged && !DRY_RUN) {
    sourceFile.saveSync();
    modified++;
  }
}

console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Fixed empty blocks in ${modified} files.`);
