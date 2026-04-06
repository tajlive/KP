#!/usr/bin/env node
/**
 * Leser Playwright JSON-rapport (test-results.json) og skriver en kort tekst
 * egnet for liming inn i Cursor Chat / agent («hva feilet, hvor»).
 *
 * Kjør etter feilet kjøring: npm run test:e2e:agent-brief
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const jsonPath = resolve(root, "test-results.json");
const reportDir = resolve(root, "playwright-report");

function resultMessage(result) {
  const err = result.error;
  if (err) {
    const msg =
      err.message ||
      err.value ||
      (typeof err === "string" ? err : JSON.stringify(err));
    const loc = err.location || result.errorLocation;
    const locStr = loc ? `${loc.file ?? ""}:${loc.line ?? ""}` : "";
    return { message: String(msg), location: locStr };
  }
  const first = result.errors?.[0];
  if (first?.message) {
    const loc = first.location;
    const locStr = loc ? `${loc.file ?? ""}:${loc.line ?? ""}` : "";
    return { message: first.message, location: locStr };
  }
  return { message: "(ingen feilmelding i JSON)", location: "" };
}

function walkSuites(suites, out, prefix = "") {
  if (!Array.isArray(suites)) return;
  for (const suite of suites) {
    const title = [prefix, suite.title].filter(Boolean).join(" › ");
    if (suite.suites?.length) {
      walkSuites(suite.suites, out, title);
    }
    if (suite.specs?.length) {
      for (const spec of suite.specs) {
        const specTitle = title ? `${title} › ${spec.title}` : spec.title;
        const specLoc =
          spec.file != null
            ? `${spec.file}:${spec.line ?? ""}`
            : "";
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            const st = result.status;
            if (
              st === "failed" ||
              st === "timedOut" ||
              st === "interrupted"
            ) {
              const { message, location } = resultMessage(result);
              out.push({
                title: `${specTitle} [${test.projectName ?? "?"}]`,
                status: st,
                message: message.split("\n").slice(0, 12).join("\n"),
                location: location || specLoc,
              });
            }
          }
        }
      }
    }
  }
}

function main() {
  console.log("--- Playwright agent-brief (lim inn i Cursor) ---\n");

  if (!existsSync(jsonPath)) {
    console.log("Ingen test-results.json funnet.");
    console.log(
      "Kjør Playwright først (rapport skrives ved json-reporter i playwright.config).",
    );
    console.log(`\nHTML-rapport (hvis bygget): file://${reportDir}/index.html`);
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(readFileSync(jsonPath, "utf8"));
  } catch (e) {
    console.error("Kunne ikke parse test-results.json:", e?.message ?? e);
    process.exit(1);
  }

  const failures = [];
  walkSuites(data.suites ?? [], failures);

  const globalErrs = data.errors;
  if (Array.isArray(globalErrs) && globalErrs.length > 0) {
    for (const ge of globalErrs) {
      const msg = ge?.message || String(ge);
      const loc = ge?.location;
      const locStr = loc ? `${loc.file ?? ""}:${loc.line ?? ""}` : "";
      failures.push({
        title: "(global / worker-feil)",
        status: "error",
        message: String(msg).split("\n").slice(0, 12).join("\n"),
        location: locStr,
      });
    }
  }

  if (failures.length === 0) {
    console.log("Ingen feilede tester i test-results.json (eller tom struktur).");
  } else {
    console.log(`Feilet: ${failures.length} test(er)\n`);
    failures.forEach((f, i) => {
      console.log(`### ${i + 1}. ${f.title}`);
      console.log(`Status: ${f.status}`);
      if (f.location) console.log(`Sted: ${f.location}`);
      console.log("```");
      console.log(f.message);
      console.log("```\n");
    });
  }

  console.log("--- Neste steg for agent ---");
  console.log("1. Åpne playwright-report/index.html for skjermbilder/video.");
  console.log(
    "2. I Cursor: @e2e/... eller @src/... for relevante filer; be om fiks mot feilmelding over.",
  );
  console.log(`3. HTML: file://${reportDir}/index.html`);
}

main();
