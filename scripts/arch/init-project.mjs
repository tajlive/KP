#!/usr/bin/env node
/**
 * Arch Project Factory v2.0 — «arch project init <navn>»
 *
 * Lifecycle: analyze → (Tom-godkjenning) → init. Se analyze-project.mjs.
 *
 * Modus:
 *   --dry-run                     Viser plan (local + ekstern), oppretter INGENTING.
 *   (default)                     Scaffolder LOKALE filer (repo-struktur, .arch/,
 *                                 docs/, src/, CI-mal). Ingen eksterne side-effekter.
 *   --approve --create-github <org>   Oppretter GitHub-repo (Tom-godkjent).
 *   --approve --create-linear <KEY>   Oppretter Linear team + prosjekt (Tom-godkjent).
 *
 * F2-regel: Factory kan lage repo-struktur/dokumentasjon/workflows/policies —
 * ALDRI deploye, prod-secrets, live-tjenester, betaling eller risiko-godkjenning.
 *
 * Bruk: node scripts/arch/init-project.mjs <prosjekt-navn> [--out <katalog>] [--dry-run] [--approve] [--create-github [org]] [--create-linear <KEY>]
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");
const templatesRoot = join(repoRoot, ".arch/templates");
const lessonsDir = join(repoRoot, ".arch/knowledge/lessons");

const args = process.argv.slice(2);
const name = args[0];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Bruk: node scripts/arch/init-project.mjs <prosjekt-navn> [--out <katalog>] [--dry-run] [--approve] [--create-github [org]] [--create-linear <KEY>]");
  console.error("Navn: små bokstaver, tall, bindestrek (f.eks. kundeportal-ai)");
  process.exit(2);
}

const flag = (f) => args.includes(f);
const dryRun = flag("--dry-run");
const approve = flag("--approve");
const outIdx = args.indexOf("--out");
const outDir = outIdx >= 0 ? resolve(args[outIdx + 1] ?? ".") : resolve(".", name);
const date = new Date().toISOString().slice(0, 10);

// ── Kunnskaps-arv (alle lessons fra Knowledge Graph) ──
const lessons = existsSync(lessonsDir)
  ? readdirSync(lessonsDir).filter((f) => f.endsWith(".md")).sort()
  : [];

// ── Template-loading ──
const loadTmpl = (rel) => {
  const p = join(templatesRoot, rel);
  if (!existsSync(p)) return null;
  return readFileSync(p, "utf8").replaceAll("{{NAME}}", name).replaceAll("{{DATE}}", date);
};

// ── Plan (hva som opprettes) ──
const plan = {
  local: [
    ".arch/project.yaml",
    ".arch/policies.yaml",
    ".arch/agents.yaml",
    ".arch/environments.yaml",
    ".arch/audit-log.md",
    ".arch/decisions.md",
    ".arch/architecture-history.md",
    ".arch/secrets/registry.yaml",
    ".arch/inherited-lessons.md",
    "docs/ARCHITECT.md",
    "docs/README.md",
    "src/.gitkeep",
    ".github/workflows/deploy.yml",
  ],
  external: [],
};
if (flag("--create-github")) {
  const orgIdx = args.indexOf("--create-github");
  const org = args[orgIdx + 1] && !args[orgIdx + 1].startsWith("--") ? args[orgIdx + 1] : null;
  plan.external.push(`GitHub repository: ${org ? org + "/" + name : name} (--private)`);
}
if (flag("--create-linear")) {
  const keyIdx = args.indexOf("--create-linear");
  const key = args[keyIdx + 1] ?? "???";
  plan.external.push(`Linear team (key ${key}) + prosjekt ${name}`);
}

// ── DRY-RUN ──
if (dryRun) {
  console.log(`Will create (${name}):\n`);
  for (const f of plan.local) console.log(`  ✓ ${f}`);
  for (const e of plan.external) console.log(`  ✓ ${e}`);
  if (!approve && plan.external.length) {
    console.log(`\n⚠️  Ekstern opprettelse krever --approve (etter Tom-godkjenning). Vises kun som plan.`);
  }
  console.log(`\nNo changes performed.`);
  process.exit(0);
}

// ── EKTE SCAFFOLD (lokale filer) ──
if (existsSync(join(outDir, ".arch"))) {
  console.error(`.arch finnes allerede i ${outDir} — avbryter (ingen overskriving).`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const write = (rel, content) => {
  const p = join(outDir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
  console.log(`  + ${rel}`);
};

// .arch/ (fra templates, fallback til inline)
write(".arch/project.yaml", loadTmpl("arch/project.yaml.tmpl") ?? `# Arch — ${name}\nproject:\n  name: ${name}\n  owner: arch\n`);
write(".arch/policies.yaml", loadTmpl("arch/policies.yaml.tmpl") ?? `# Arch policies — ${name}\n`);
write(".arch/agents.yaml", loadTmpl("arch/agents.yaml.tmpl") ?? `# Arch agent-roller — ${name}\n`);
write(".arch/environments.yaml", `# Arch miljøer — ${name}\nenvironments:\n  local:\n    url: http://localhost:3000\n    secrets_store: .env.local\n  prod:\n    url: "<TODO>"\n    worker: "<TODO>"\n`);
write(".arch/audit-log.md", `# Arch Audit-log — ${name}\n## ${date} — scaffold\n- **Aktør:** Hermes (Project Factory v2.0)\n- **Hendelse:** .arch/ + struktur scaffoldet. Ekstern oppsett: ${plan.external.length ? "governed (se under)" : "ikke utført (krever --approve)"}.\n`);
write(".arch/decisions.md", `# Arch beslutninger — ${name}\n## D-${date.replaceAll("-", "")}-01 — prosjekt scaffoldet\n**Beslutning:** ${name} registrert i Arch Control Plane (Project Factory v2.0).\n**Gjenstår før prosjektstart:** repo, Linear-prosjekt, secret-namespace, CI, monitoring.\n`);
write(".arch/architecture-history.md", `# Arch arkitekturhistorikk — ${name}\n## ${date} — scaffold (Project Factory v2.0)\n- **Beslutning:** prosjekt registrert i Arch Control Plane.\n- **Konsekvens:** <TODO: oppdater etter faktisk oppsett>\n`);
write(".arch/secrets/registry.yaml", loadTmpl("arch/secrets-registry.yaml.tmpl") ?? `# Secret Registry — ${name}\nentries: []\n`);

// Arvet kunnskap
const inheritedBody = lessons
  .map((f) => readFileSync(join(lessonsDir, f), "utf8"))
  .join("\n---\n\n");
write(".arch/inherited-lessons.md", `# Arvet kunnskap (fra Arch Knowledge Graph)\n\nProsjekt ${name} arver ${lessons.length} lessons fra Arch sin kunnskapsbase.\nKilde: tajlive/KP .arch/knowledge/lessons/ · generert ${date}.\n\n---\n\n${inheritedBody}`);

// docs/ + src/ + CI
write("docs/ARCHITECT.md", loadTmpl("docs/ARCHITECT.md.tmpl") ?? `# ${name} — Arkitektur\n`);
write("docs/README.md", `# ${name}\n\n<TODO: prosjektbeskrivelse>\n\nArvet fra Arch Control Plane (Project Factory v2.0, ${date}).\n`);
write("src/.gitkeep", "");
write(".github/workflows/deploy.yml", loadTmpl("ci/deploy.yml.tmpl") ?? `# CI — ${name}\nname: deploy\non: {push: {branches: [main]}}\n`);

// ── GOVERNED EKSTERN OPPRETTELSE (kun med --approve) ──
const created = [];
if (plan.external.length && !approve) {
  console.log(`\n⚠️  ${plan.external.length} ekstern(e) ressurs(er) IKKE opprettet — krever --approve (Tom-godkjenning).`);
}

if (approve && flag("--create-github")) {
  const orgIdx = args.indexOf("--create-github");
  const org = args[orgIdx + 1] && !args[orgIdx + 1].startsWith("--") ? args[orgIdx + 1] : null;
  const repo = org ? `${org}/${name}` : name;
  try {
    execFileSync("gh", ["repo", "create", repo, "--private"], { stdio: "inherit" });
    created.push(`GitHub: ${repo}`);
  } catch (e) {
    console.error(`GitHub-opprettelse feilet: ${e.message.split("\n")[0]}`);
  }
}

if (approve && flag("--create-linear")) {
  const keyIdx = args.indexOf("--create-linear");
  const teamKey = args[keyIdx + 1];
  if (!teamKey || !/^[A-Z0-9]{1,4}$/.test(teamKey)) {
    console.error("--create-linear krever team-key (1-4 tegn, f.eks. AGD)");
    process.exit(2);
  }
  try {
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
  } catch (e) {
    console.error(`Linear-opprettelse feilet: ${e.message.split("\n")[0]}`);
  }
}

if (created.length) {
  console.log(`\nOpprettet (governed, Tom-godkjent):\n${created.map((c) => `  ✅ ${c}`).join("\n")}`);
}

console.log(`\nScaffold fullført i ${outDir} (${plan.local.length} filer).`);
console.log(`Neste (etter Tom-godkjenning):`);
console.log(`  node scripts/arch/init-project.mjs ${name} --approve --create-github <org> --create-linear <KEY>`);
console.log(`Deretter: secret-namespace, CI-skarpe, monitoring (postLinearAlert).`);
