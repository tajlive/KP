#!/usr/bin/env npx tsx
/**
 * OAuth Guard — Automatic OAuth Redirect URI Consistency Checker & Fixer
 *
 * Usage:
 *   npx tsx scripts/oauth-guard.ts           # Check only
 *   npx tsx scripts/oauth-guard.ts --fix     # Auto-fix code issues
 *   npx tsx scripts/oauth-guard.ts --json    # CI-friendly output
 *   npx tsx scripts/oauth-guard.ts --tunnel https://xxxx.trycloudflare.com
 *   npx tsx scripts/oauth-guard.ts --dry-run # Show remote diff, do not change
 *   npx tsx scripts/oauth-guard.ts --apply   # Apply remote diff to Supabase
 *   npx tsx scripts/oauth-guard.ts --open    # Open Google Cloud Console
 */

import { main } from "./oauth-guard/index";
import { C } from "./oauth-guard/config";

main().catch((err) => {
  console.error(`${C.red}Fatal error:${C.rst}`, err);
  process.exit(1);
});
