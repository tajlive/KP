#!/usr/bin/env node
/**
 * Arch Health Score — «arch health <prosjekt-katalog>»
 *
 * Beregner en deterministisk helsescore for et Arch-prosjekt basert på
 * fil-signaler (ingen nettverkskall, ingen subjektiv vurdering).
 *
 * Kategorier (hver vektes likt i TOTAL):
 *   Governance     — .arch/ kompletthet (project/policies/agents/audit-log)
 *   Secrets        — .arch/secrets/ registry + mapping (governance v2)
 *   CI/CD          — .github/workflows/ tilstede
 *   Documentation  — ARCHITECT/README/decisions/CHANGELOG
 *   Testing        — test-filer + test-runner-konfig
 *
 * Bruk:
 *   node scripts/arch/health-score.mjs [katalog]   (default: cwd)
 *
 * Output: prosent per kategori + TOTAL (gjennomsnitt). Eksisterende katalog
 * som mangler .arch/ → 0 % med forklaring.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const dir = resolve(process.argv[2] ?? ".");
const base = join(dir, ".arch");

const has = (rel) => existsSync(join(dir, rel));
const hasArch = (rel) => existsSync(join(base, rel));

const cat = (name, checks) => {
  const passed = checks.filter((c) => c()).length;
  const pct = Math.round((passed / checks.length) * 100);
  return { name, pct, passed, total: checks.length };
};

if (!hasArch("project.yaml")) {
  console.error(`✗ ${dir} er ikke et Arch-prosjekt (mangler .arch/project.yaml). Score: 0 %`);
  process.exit(1);
}

const categories = [
  cat("Governance", [
    () => hasArch("project.yaml"),
    () => hasArch("policies.yaml"),
    () => hasArch("agents.yaml"),
    () => hasArch("audit-log.md"),
  ]),
  cat("Secrets", [
    () => hasArch("secrets/registry.yaml"),
    () => hasArch("secrets/mapping.yaml"),
  ]),
  cat("CI/CD", [
    () => {
      const wf = join(dir, ".github", "workflows");
      return existsSync(wf) && readdirSync(wf).some((f) => f.endsWith(".yml") || f.endsWith(".yaml"));
    },
    () => has("package.json") || has("wrangler.jsonc") || has("next.config.mjs"),
  ]),
  cat("Documentation", [
    () => has("ARCHITECT.md") || has("docs/ARCHITECT.md"),
    () => has("README.md") || has("docs/README.md"),
    () => hasArch("decisions.md") || hasArch("knowledge/decisions"),
    () => hasArch("CHANGELOG.md"),
  ]),
  cat("Testing", [
    () => {
      const walk = (d) => {
        if (!existsSync(d)) return false;
        for (const f of readdirSync(d)) {
          const p = join(d, f);
          if (statSync(p).isDirectory()) { if (walk(p)) return true; }
          else if (/\.(test|spec)\.[jt]sx?$/.test(f)) return true;
        }
        return false;
      };
      return walk(join(dir, "src")) || walk(join(dir, "scripts")) || walk(join(dir, "tests"));
    },
    () => has("vitest.config.ts") || has("vitest.config.mts") || has("jest.config.js") || has("vitest.workspace.ts"),
  ]),
];

const total = Math.round(categories.reduce((s, c) => s + c.pct, 0) / categories.length);

console.log("ARCH SCORE");
console.log("──────────");
for (const c of categories) {
  console.log(`${c.name.padEnd(16)} ${String(c.pct).padStart(3)}%`);
}
console.log("──────────");
console.log(`TOTAL: ${total}%`);
