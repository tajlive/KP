#!/usr/bin/env node
/**
 * Arch Project Factory (v1.1) — Master Prompt v4.1 §4: «arch project init <navn>»
 *
 * Scaffolder .arch/ (Customer Project Package: project/agents/secrets/environments/
 * policies/decisions/audit-log/architecture-history + backup-strategy) for et NYTT
 * prosjekt. DEFAULT: dry-run mot eksterne systemer.
 *
 * Valgfrie opprettelsesflagg (governed — kjøres kun når Tom har godkjent
 * prosjektet; agenten godkjenner ikke egne risikofylte endringer, v4.1 §6):
 *   --create-github [org]   gh repo create <org>/<navn> --private
 *   --create-linear <key>   Linear team (key, 1-4 tegn) + prosjekt via API
 *
 * Bruk: node scripts/arch/init-project.mjs <prosjekt-navn> [--out <katalog>]
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const name = args[0];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Bruk: node scripts/arch/init-project.mjs <prosjekt-navn> [--out <katalog>] [--create-github [org]] [--create-linear <team-key>]");
  console.error("Navn: små bokstaver, tall, bindestrek (f.eks. autoglass)");
  process.exit(2);
}
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? resolve(args[outIdx + 1] ?? ".") : resolve(".");
const archDir = join(outDir, ".arch");
if (existsSync(archDir)) {
  console.error(`.arch finnes allerede i ${outDir} — avbryter (ingen overskriving).`);
  process.exit(1);
}
mkdirSync(archDir, { recursive: true });

const date = new Date().toISOString().slice(0, 10);
const write = (file, content) => {
  writeFileSync(join(archDir, file), content);
  console.log(`  + .arch/${file}`);
};

write("project.yaml", `# Arch Control Plane — ${name} (scaffold ${date})
project:
  name: ${name}
  owner: arch
  description: "<TODO: beskrivelse>"
repository:
  github: "<TODO: org/repo>"
  default_branch: main
runtime:
  cloudflare: true
database:
  provider: supabase
  project_id: "<TODO>"
backup_strategy:
  - github: "git-historikk (kildekode-SSoT)"
  - supabase: "PITR + daglig backup (konsoll)"
  - cloudflare: "D1/KV/R2 backupper etter tjeneste"
  - secrets: "BWS org-vault (referanser i secrets.yaml)"
management:
  linear:
    team: "<TODO: team-key>"
agents:
  hermes: chief-architect-ops
  codex: senior-software-engineer
  kimi: research-analyst
security_level: high
`);

write("agents.yaml", `# Arch agent-roller — ${name}
# <TODO: kopier mal fra tajlive/KP .arch/agents.yaml og tilpass>
`);

write("secrets.yaml", `# Secret Registry (v1) — ${name}
# FORMAT-KONTRAKT: flat struktur, ingen verdier (se tajlive/KP .arch/secrets.yaml).
entries:
  - uri: secret://${name}/local/example/key
    store: env.local
    key_name: EXAMPLE_KEY
    path: .env.local
    consumers: "<TODO>"
    status: planned
`);

write("environments.yaml", `# Arch miljøer — ${name}
environments:
  local:
    url: http://localhost:3000
    secrets_store: .env.local
  prod:
    url: "<TODO>"
    worker: "<TODO>"
`);

write("policies.yaml", `# Arch policies — ${name}
# <TODO: kopier mal fra tajlive/KP .arch/policies.yaml og tilpass>
git:
  workflow: [Issue, Branch, Implementation, Tests, Commit, CI, Review, Main, Deploy]
  main_protection: "ingen push til main uten: grønne tester + Linear-issue + commit-referanse"
`);

write("audit-log.md", `# Arch Audit-log — ${name}
## ${date} — scaffold
- **Aktør:** Hermes (init-project v1)
- **Hendelse:** .arch/ scaffoldet. Ekstern oppsett IKKE utført (dry-run).
`);

write("decisions.md", `# Arch beslutninger — ${name}
## D-${date.replaceAll("-", "")}-01 — prosjekt scaffoldet
**Beslutning:** .arch/ opprettet med Project Factory v1.1.
**Gjenstår før prosjektstart:** repo, Linear-prosjekt, secret-namespace, CI, monitoring.
`);

write("architecture-history.md", `# Arch arkitekturhistorikk — ${name}
## ${date} — scaffold (Project Factory v1.1)
- **Beslutning:** prosjekt registrert i Arch Control Plane.
- **Begrunnelse:** Master Prompt v4.1 §3-§4 — ingen prosjekt regnes komplett uten.
- **Konsekvens:** <TODO: oppdater etter faktisk oppsett>
`);

// ── Governed opprettelse (v4.1 §4/§6: kun når Tom har godkjent prosjektet) ──
let created = [];

if (args.includes("--create-github")) {
  const orgIdx = args.indexOf("--create-github");
  const org = args[orgIdx + 1] && !args[orgIdx + 1].startsWith("--") ? args[orgIdx + 1] : null;
  const repo = org ? `${org}/${name}` : name;
  try {
    execFileSync("gh", ["repo", "create", repo, "--private"], { stdio: "inherit" });
    created.push(`GitHub: ${repo}`);
  } catch (err) {
    console.error(`GitHub-opprettelse feilet: ${err.message.split("\n")[0]}`);
  }
}

if (args.includes("--create-linear")) {
  const keyIdx = args.indexOf("--create-linear");
  const teamKey = args[keyIdx + 1];
  if (!teamKey || !/^[A-Z0-9]{1,4}$/.test(teamKey)) {
    console.error("--create-linear krever team-key (1-4 tegn, f.eks. AGD)");
    process.exit(2);
  }
  try {
    // LINEAR_API_KEY hentes fra .env.local i TARGET-repoets miljø ved kjøring der.
    const key = process.env.LINEAR_API_KEY;
    if (!key) throw new Error("LINEAR_API_KEY mangler i miljøet");
    const gql = async (query, variables) => {
      const res = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: key },
        body: JSON.stringify({ query, variables }),
      });
      const j = await res.json();
      if (j.errors) throw new Error(j.errors[0]?.message ?? "GQL-feil");
      return j.data;
    };
    const team = await gql(
      `mutation($n: String!, $k: String!){ teamCreate(input: { name: $n, key: $k }) { success team { id } } }`,
      { n: name, k: teamKey },
    );
    if (!team.teamCreate.success) throw new Error("teamCreate mislyktes");
    const teamId = team.teamCreate.team.id;
    await gql(
      `mutation($n: String!, $t: ID!){ projectCreate(input: { name: $n, teamIds: [$t] }) { success } }`,
      { n: name, t: teamId },
    );
    created.push(`Linear: team ${teamKey} + prosjekt ${name}`);
  } catch (err) {
    console.error(`Linear-opprettelse feilet: ${err.message.split("\n")[0]}`);
  }
}

if (created.length) {
  console.log(`\nOpprettet (governed):\n${created.map((c) => `  ✅ ${c}`).join("\n")}`);
}

console.log(`
Oppfølgingssjekkliste (Hermes, etter Tom-godkjenning):
  1. GitHub-repo: gh repo create <org>/${name}
  2. Linear-prosjekt: via Linear MCP (team-opprettelse + prosjekt)
  3. Secret-namespace: secret://${name}/… i secrets.yaml (referanser, ingen verdier)
  4. CI/CD: .github/workflows (kopier deploy.yml-mal fra tajlive/KP)
  5. Monitoring: health + alerting via postLinearAlert()
  6. Registrer i ${outDir}/.arch/project.yaml med verifiserte fakta
`);
