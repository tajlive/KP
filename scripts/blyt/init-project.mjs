#!/usr/bin/env node
/**
 * Blyt project init (v1) — Master Prompt v4.0 §14: «blyt project init kunde-navn»
 *
 * Scaffolder .blyt/ for et NYTT prosjekt med plassholdere. DRY-RUN mot eksterne
 * systemer: oppretter IKKE GitHub-repo, Linear-prosjekt, secrets eller CI —
 * det gjøres av Hermes via gh/MCP etter Tom-godkjenning (sjekklisten printes).
 *
 * Bruk: node scripts/blyt/init-project.mjs <prosjekt-navn> [--out <katalog>]
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const name = args[0];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Bruk: node scripts/blyt/init-project.mjs <prosjekt-navn> [--out <katalog>]");
  console.error("Navn: små bokstaver, tall, bindestrek (f.eks. autoglass)");
  process.exit(2);
}
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? resolve(args[outIdx + 1] ?? ".") : resolve(".");
const blytDir = join(outDir, ".blyt");
if (existsSync(blytDir)) {
  console.error(`.blyt finnes allerede i ${outDir} — avbryter (ingen overskriving).`);
  process.exit(1);
}
mkdirSync(blytDir, { recursive: true });

const date = new Date().toISOString().slice(0, 10);
const write = (file, content) => {
  writeFileSync(join(blytDir, file), content);
  console.log(`  + .blyt/${file}`);
};

write("project.yaml", `# Blyt Control Plane — ${name} (scaffold ${date})
project:
  name: ${name}
  owner: blyt
  description: "<TODO: beskrivelse>"
repository:
  github: "<TODO: org/repo>"
  default_branch: main
runtime:
  cloudflare: true
database:
  provider: supabase
  project_id: "<TODO>"
management:
  linear:
    team: "<TODO: team-key>"
agents:
  hermes: chief-architect-ops
  codex: senior-developer
  kimi: research-analyst
security_level: high
`);

write("agents.yaml", `# Blyt agent-roller — ${name}
# <TODO: kopier mal fra tajlive/KP .blyt/agents.yaml og tilpass>
`);

write("secrets.yaml", `# Secret Registry (v1) — ${name}
# FORMAT-KONTRAKT: flat struktur, ingen verdier (se tajlive/KP .blyt/secrets.yaml).
entries:
  - uri: secret://${name}/local/example/key
    store: env.local
    key_name: EXAMPLE_KEY
    path: .env.local
    consumers: "<TODO>"
    status: planned
`);

write("environments.yaml", `# Blyt miljøer — ${name}
environments:
  local:
    url: http://localhost:3000
    secrets_store: .env.local
  prod:
    url: "<TODO>"
    worker: "<TODO>"
`);

write("policies.yaml", `# Blyt policies — ${name}
# <TODO: kopier mal fra tajlive/KP .blyt/policies.yaml og tilpass>
git:
  workflow: [Issue, Branch, Implementation, Tests, Commit, CI, Review, Main, Deploy]
  main_protection: "ingen push til main uten: grønne tester + Linear-issue + commit-referanse"
`);

write("audit-log.md", `# Blyt Audit-log — ${name}
## ${date} — scaffold
- **Aktør:** Hermes (init-project v1)
- **Hendelse:** .blyt/ scaffoldet. Ekstern oppsett IKKE utført (dry-run).
`);

write("decisions.md", `# Blyt beslutninger — ${name}
## D-${date.replaceAll("-", "")}-01 — prosjekt scaffoldet
**Beslutning:** .blyt/ opprettet med init-project v1.
**Gjenstår før prosjektstart:** repo, Linear-prosjekt, secret-namespace, CI, monitoring.
`);

console.log(`
Oppfølgingssjekkliste (Hermes, etter Tom-godkjenning):
  1. GitHub-repo: gh repo create <org>/${name}
  2. Linear-prosjekt: via Linear MCP (team-opprettelse + prosjekt)
  3. Secret-namespace: secret://${name}/… i secrets.yaml (referanser, ingen verdier)
  4. CI/CD: .github/workflows (kopier deploy.yml-mal fra tajlive/KP)
  5. Monitoring: health + alerting via postLinearAlert()
  6. Registrer i ${outDir}/.blyt/project.yaml med verifiserte fakta
`);
