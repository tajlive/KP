/**
 * OAuth Guard — CLI entry point
 */

import {
  SUPABASE_ACCESS_TOKEN,
  C,
  updateEnvForTunnel,
} from "./config";
import { scanCodeFiles, scanEnvFiles, applyFixes } from "./scanners";
import { checkRemote, patchAuthConfig } from "./supabase-client";
import { runRollback } from "./snapshot";
import {
  printIssues,
  printDiff,
  generateCopyPaste,
  maskResultForJson,
  openGoogleCloudConsole,
} from "./output";
import type { GuardResult } from "./types";

interface CliArgs {
  shouldFix: boolean;
  jsonOutput: boolean;
  dryRun: boolean;
  apply: boolean;
  openConsole: boolean;
  rollbackFile?: string;
  tunnelUrl?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const rollbackIdx = args.indexOf("--rollback");
  const tunnelIdx = args.indexOf("--tunnel");

  return {
    shouldFix: args.includes("--fix"),
    jsonOutput: args.includes("--json"),
    dryRun: args.includes("--dry-run"),
    apply: args.includes("--apply"),
    openConsole: args.includes("--open"),
    rollbackFile: rollbackIdx >= 0 ? args[rollbackIdx + 1] : undefined,
    tunnelUrl: tunnelIdx >= 0 ? args[tunnelIdx + 1] : undefined,
  };
}

export async function main(argv: string[] = process.argv): Promise<void> {
  const {
    shouldFix,
    jsonOutput,
    dryRun,
    apply,
    openConsole,
    rollbackFile,
    tunnelUrl,
  } = parseArgs(argv);

  if (dryRun && apply) {
    console.error(`${C.red}--dry-run and --apply are mutually exclusive${C.rst}`);
    process.exit(1);
  }

  if (rollbackFile) {
    await runRollback(rollbackFile, patchAuthConfig, SUPABASE_ACCESS_TOKEN);
    return;
  }

  if (tunnelUrl) {
    updateEnvForTunnel(tunnelUrl);
  }

  const codeIssues = scanCodeFiles();
  const envIssues = scanEnvFiles();
  let issues = [...codeIssues, ...envIssues];

  if (apply && issues.some((i) => i.severity === "error")) {
    if (!jsonOutput) {
      console.error(
        `${C.red}Aborting --apply because local code/env errors exist.${C.rst}`
      );
    }
    if (!jsonOutput) printIssues(issues);
    process.exit(1);
  }

  const remote = await checkRemote(dryRun || apply, apply);
  issues = [...issues, ...remote.issues];

  const errors = issues.filter((i) => i.severity === "error");
  const remoteMismatch = remote.reachable && !remote.matchesDesired;
  const ok = errors.length === 0 && !remoteMismatch;

  const result: GuardResult = {
    ok,
    issues,
    remote,
    copyPaste: generateCopyPaste(remote.projectRef),
  };

  const fixedCount = shouldFix ? applyFixes(issues) : 0;

  if (jsonOutput) {
    console.log(JSON.stringify(maskResultForJson(result), null, 2));
    process.exit(ok ? 0 : 1);
  }

  console.log(
    `\n${C.bold}${C.blu}╔════════════════════════════════════════════════════════════╗${C.rst}`
  );
  console.log(
    `${C.bold}${C.blu}║           OAuth Guard — Redirect URI Consistency Check      ║${C.rst}`
  );
  console.log(
    `${C.bold}${C.blu}╚════════════════════════════════════════════════════════════╝${C.rst}\n`
  );

  printIssues(issues);

  if (shouldFix) {
    console.log(`${C.grn}Fixed ${fixedCount} line(s).${C.rst}\n`);
  }

  if (remote.reachable && remote.diff && !apply) {
    printDiff(remote.diff, remote.current!);
  }

  if (result.copyPaste) {
    console.log(
      `${C.dim}────────────────────────────────────────────────────────────${C.rst}`
    );
    console.log(result.copyPaste.supabaseUrls);
    console.log("");
    console.log(result.copyPaste.providerConsole);
    console.log(
      `${C.dim}────────────────────────────────────────────────────────────${C.rst}\n`
    );
  }

  if (openConsole) {
    openGoogleCloudConsole();
  }

  process.exit(ok ? 0 : 1);
}
