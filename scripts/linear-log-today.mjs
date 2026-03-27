#!/usr/bin/env node
/**
 * linear-log-today.mjs
 * Oppretter Linear-issue for dagens leveranse (2026-03-27)
 * og oppdaterer FULL-AUTOMATION-PLAYBOOK.md med git-commit etter push.
 *
 * Bruk: node scripts/linear-log-today.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  const env = {};
  const paths = [".env.local", ".env"];
  for (const p of paths) {
    const fp = resolve(root, p);
    if (!existsSync(fp)) continue;
    for (const line of readFileSync(fp, "utf8").split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#") || !t.includes("=")) continue;
      const eq = t.indexOf("=");
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!env[key]) env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const LINEAR_API_KEY = env.LINEAR_API_KEY || process.env.LINEAR_API_KEY;

if (!LINEAR_API_KEY) {
  console.error("\u274C LINEAR_API_KEY mangler i .env.local");
  process.exit(1);
}

async function gql(query, variables = {}) {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: LINEAR_API_KEY },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data;
}

// Hent siste git-commit SHA
const gitLog = spawnSync("git", ["log", "-1", "--pretty=%h"], {
  cwd: root, encoding: "utf8",
});
const commitSha = gitLog.stdout.trim() || "(ingen commit ennå)";

// Hent team-id
const teamsData = await gql(`query { teams { nodes { id name key } } }`);
const teams = teamsData.teams?.nodes || [];
if (teams.length === 0) {
  console.error("\u274C Ingen Linear-team funnet");
  process.exit(1);
}

// Foretrekk KLA-team, ellers første
const team = teams.find((t) => t.key === "KLA") || teams[0];
console.log(`\u2705 Team: ${team.name} (${team.key}) — id: ${team.id}`);

// Finn 'In Progress' eller 'Todo' state
const statesData = await gql(
  `query($teamId: ID!) {
    workflowStates(filter: { team: { id: { eq: $teamId } } }, first: 50) {
      nodes { id name type }
    }
  }`,
  { teamId: team.id }
);
const states = statesData.workflowStates?.nodes || [];
const doneState = states.find((s) => s.name.toLowerCase() === "done") ||
  states.find((s) => s.type === "completed") ||
  states[0];

console.log(`\u2705 Status brukt: ${doneState?.name} (${doneState?.id})`);

// Issue-innhold
const title = "ci(db): db-status-gate CI-workflow + Supabase CLI 2.84.2 [2026-03-27]";
const description = `## Leveranse 2026-03-27

### Hva ble gjort
- Opprettet \`.github/workflows/db-status.yml\` — standalone PR-gate for migrasjonsstatus
- Lagt til \`db-status-check\`-jobb i \`pr-check.yml\` (parallell med \`quick-check\`)
- Oppdatert \`scripts/db-status-gate.mjs\` med:
  - Riktig kommando: \`supabase migration list --linked\` (ikke \`db status\`)
  - Binary autodetect (supabase vs npx)
  - 60s timeout + ETIMEDOUT-guard
  - Dual parser: tabell-format + fritekst MISMATCH_PATTERNS
- Fryst \`999_fix_materialized_view.sql\` med FROZEN-header
- Opprettet \`docs/MIGRATION-POLICY.md\` med allowlist-dokumentasjon
- Supabase CLI oppgradert \`2.78.1 \u2192 2.84.2\`

### Verifikasjonsbevis
\`\`\`
npm run db:status:gate
[db-status-gate] allowlisted=0 blocking=0 strict=false
\u2705 db-status-gate: pass

supabase --version
2.84.2
\`\`\`

### DB-status (172 migrasjoner)
Alle 172 migrasjoner synket: Local = Remote. 999-migrasjon frozen og allowlisted.

### Filer endret
- \`.github/workflows/db-status.yml\` (NY)
- \`.github/workflows/pr-check.yml\` (OPPDATERT: db-status-check jobb)
- \`scripts/db-status-gate.mjs\` (OPPDATERT: robusthet)
- \`supabase/migrations/999_fix_materialized_view.sql\` (FROZEN header)
- \`docs/MIGRATION-POLICY.md\` (NY)
- \`docs/FULL-AUTOMATION-PLAYBOOK.md\` (OPPDATERT: siste kjøring)

### Git
Siste commit: \`${commitSha}\`

### Neste P0
- Vercel KV aktivere (Storage \u2192 Create KV)
- SENTRY_AUTH_TOKEN i Vercel env
- npm run db:gen-types (regenerer TS-typer)
`;

// Opprett issue
const createData = await gql(
  `mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { id identifier title url }
    }
  }`,
  {
    input: {
      teamId: team.id,
      title,
      description,
      ...(doneState ? { stateId: doneState.id } : {}),
    },
  }
);

if (!createData.issueCreate?.success) {
  console.error("\u274C issueCreate feilet");
  process.exit(1);
}

const issue = createData.issueCreate.issue;
console.log(`\n\u2705 Linear issue opprettet:`);
console.log(`   ${issue.identifier}: ${issue.title}`);
console.log(`   ${issue.url}`);
