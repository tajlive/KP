/**
 * Shared Reporter — Colored output, exit codes, JSON export.
 * All verification modules use this for consistent reporting.
 */

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export class Reporter {
  constructor(moduleName) {
    this.moduleName = moduleName;
    this.passed = 0;
    this.warnings = 0;
    this.failures = 0;
    this.results = [];
  }

  pass(msg, detail) {
    this.passed++;
    this.results.push({ level: "pass", msg, detail });
    console.log(`  ${GREEN}✓${RESET} ${msg}${detail ? ` ${DIM}(${detail})${RESET}` : ""}`);
  }

  fail(msg, detail) {
    this.failures++;
    this.results.push({ level: "fail", msg, detail });
    console.error(`  ${RED}✗${RESET} ${msg}${detail ? ` ${DIM}(${detail})${RESET}` : ""}`);
  }

  warn(msg, detail) {
    this.warnings++;
    this.results.push({ level: "warn", msg, detail });
    console.log(`  ${YELLOW}⚠${RESET} ${msg}${detail ? ` ${DIM}(${detail})${RESET}` : ""}`);
  }

  info(msg) {
    this.results.push({ level: "info", msg });
    console.log(`  ${DIM}${msg}${RESET}`);
  }

  section(title) {
    console.log(`\n${CYAN}${BOLD}${title}${RESET}`);
  }

  summary() {
    const total = this.passed + this.warnings + this.failures;
    const color = this.failures > 0 ? RED : this.warnings > 0 ? YELLOW : GREEN;
    console.log(
      `  ${color}${this.passed} passed, ${this.warnings} warnings, ${this.failures} failures${RESET} ${DIM}(${total} checks)${RESET}`,
    );
    return {
      module: this.moduleName,
      passed: this.passed,
      warnings: this.warnings,
      failures: this.failures,
      results: this.results,
    };
  }

  hasErrors() {
    return this.failures > 0;
  }
}

export function printBanner(title) {
  console.log(`\n${BOLD}${"═".repeat(70)}${RESET}`);
  console.log(`${BOLD}  ${title}${RESET}`);
  console.log(`${BOLD}${"═".repeat(70)}${RESET}`);
}

export function printFinalReport(report) {
  console.log(`\n${BOLD}${"═".repeat(70)}${RESET}`);
  console.log(`${BOLD}  FINAL REPORT${RESET}`);
  console.log(`${BOLD}${"═".repeat(70)}${RESET}`);

  let totalPassed = 0;
  let totalWarnings = 0;
  let totalFailures = 0;

  for (const r of report.modules) {
    const color = r.failures > 0 ? RED : r.warnings > 0 ? YELLOW : GREEN;
    console.log(
      `  ${color}${r.module.padEnd(20)}${RESET} ${r.passed} ✓  ${r.warnings} ⚠  ${r.failures} ✗`,
    );
    totalPassed += r.passed;
    totalWarnings += r.warnings;
    totalFailures += r.failures;
  }

  const grandColor = totalFailures > 0 ? RED : totalWarnings > 0 ? YELLOW : GREEN;
  console.log(`\n  ${grandColor}${BOLD}TOTAL: ${totalPassed} passed, ${totalWarnings} warnings, ${totalFailures} failures${RESET}`);

  if (totalFailures > 0) {
    console.log(`\n  ${RED}${BOLD}VERIFICATION FAILED${RESET} — Fix issues before committing.`);
    return 1;
  }
  if (totalWarnings > 0) {
    console.log(`\n  ${YELLOW}${BOLD}VERIFICATION PASSED WITH WARNINGS${RESET} — Review warnings.`);
    return 0;
  }
  console.log(`\n  ${GREEN}${BOLD}VERIFICATION PASSED ✓${RESET} — Safe to commit.`);
  return 0;
}

/**
 * Async helper: run a module and capture results.
 */
export async function runModule(name, fn) {
  const reporter = new Reporter(name);
  try {
    await fn(reporter);
  } catch (err) {
    reporter.fail(`Module crashed: ${err.message}`);
    if (process.env.DEBUG) console.error(err.stack);
  }
  return reporter.summary();
}
