#!/usr/bin/env node
/**
 * Arch Project Analyzer — F2 Del 1: «arch project analyze <navn>»
 *
 * Produserer et Architecture Proposal (markdown) for et nytt prosjekt.
 * INGEN side-effekter: leser kun kunnskapsbasen, skriver kun til stdout
 * (eller .arch/proposals/ med --save). Oppretter ingenting eksternt.
 *
 * Bruk:
 *   node scripts/arch/analyze-project.mjs <prosjekt-navn> [--type <type>] [--save]
 */
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "../..");

const args = process.argv.slice(2);
const name = args[0];
if (!name || !/^[a-z0-9-]+$/.test(name)) {
  console.error("Bruk: node scripts/arch/analyze-project.mjs <prosjekt-navn> [--type <type>] [--save]");
  console.error("Navn: små bokstaver, tall, bindestrek (f.eks. kundeportal-ai)");
  process.exit(2);
}

// ── Type-deteksjon ──
const typeIdx = args.indexOf("--type");
const typeArg = typeIdx >= 0 ? args[typeIdx + 1] : null;
function detectType(n) {
  if (typeArg) return typeArg;
  const s = n.toLowerCase();
  if (/(trad|fin|crypto|pay)/.test(s)) return "Trading / Fintech";
  if (/(ai|ml|llm|gpt)/.test(s)) return "SaaS / AI";
  if (/(api|sync|data)/.test(s)) return "API / Data";
  if (/(portal|app|site|web|dash)/.test(s)) return "Web / Portal";
  return "SaaS / Web";
}
const type = detectType(name);

// ── Kunnskaps-arv fra Arch Knowledge Graph ──
const lessonsDir = join(repoRoot, ".arch/knowledge/lessons");
const lessons = existsSync(lessonsDir)
  ? readdirSync(lessonsDir).filter((f) => f.endsWith(".md"))
  : [];

const RELEVANCE = [
  { file: "lesson-edge-nodejs.md", keywords: ["cloudflare", "supabase", "nextjs"], rule: "supabase-js-ruter = runtime:\"nodejs\" (aldri edge)" },
  { file: "lesson-route-handler-server-client.md", keywords: ["nextjs", "supabase"], rule: "route handlers: createServerClient(request, response)" },
  { file: "lesson-wrangler-env-empty.md", keywords: ["cloudflare"], rule: "wrangler multi-env → --env \"\"" },
  { file: "lesson-kapital-kun-aktive.md", keywords: ["trad", "fin", "crypto"], rule: "kapital/P&L kun fra aktive sesjoner" },
];

const stack = ["Next.js", "Cloudflare", "Supabase", "Linear", "GitHub Actions"];
const stackLc = stack.join(" ").toLowerCase() + " " + type.toLowerCase() + " " + name.toLowerCase();
const inherited = RELEVANCE.filter((r) =>
  r.keywords.some((k) => stackLc.includes(k)) && lessons.includes(r.file)
);

const complexity = (() => {
  if (/Trading|Fintech/.test(type)) return "Høy";
  if (/AI/.test(type)) return "Medium–Høy";
  if (/API|Data/.test(type)) return "Medium";
  return "Lav–Medium";
})();

const risks = [];
if (/(trad|fin|crypto|pay)/.test(name.toLowerCase() + type.toLowerCase())) risks.push("Penger/P&L-integritet");
risks.push("GDPR (personopplysninger)");
risks.push("Secrets (secret://-governance)");
risks.push("API-kostnader (LLM/3.-part)");

const proposal = `# Architecture Proposal

**Prosjekt:** \`${name}\`
**Type:** ${type}
**Estimert kompleksitet:** ${complexity}
**Krever Tom approval:** Ja

## Anbefalt stack

- **Frontend/App:** Next.js 16 (App Router, OpenNext → Cloudflare Workers)
- **Runtime:** Cloudflare Workers (edge der mulig, \`nodejs\` for supabase-js-ruter)
- **Data:** Supabase (Postgres + pg_cron)
- **Oppgaver/krav:** Linear (eget team, key 1–4 tegn)
- **CI/CD:** GitHub Actions (test-gate → deploy → smoke → auto-rollback)
- **Secrets:** BWS + wrangler + GitHub Actions (referanser i .arch/secrets/registry.yaml)

## Agenter

| Agent | Rolle |
|---|---|
| Hermes | Arkitektur + drift (chief-architect-ops) |
| Codex | Implementering (senior-developer) |
| Kimi | Research (research-analyst) |

## Risiko

${risks.map((r) => `- ${r}`).join("\n")}

## Arvet kunnskap (fra Arch Knowledge Graph)

${inherited.length ? inherited.map((l) => `- **Tidligere failure/lesson:** ${l.rule}`).join("\n") : "- (ingen relevante lessons funnet — tom kunnskapsbase?)"}

## Governance (arves automatisk)

- «Arch lærer av systemet, men endrer aldri sikkerhetsgrenser automatisk.»
- Factory kan lage repo/dokumentasjon/workflows/policies — aldri deploye, prod-secrets, live, betaling.
- Eksterne ressurser (GitHub-repo, Linear-team) krever Tom-godkjenning + \`--approve\`.

## Neste steg (etter Tom-godkjenning)

\`\`\`
node scripts/arch/init-project.mjs ${name} --dry-run
node scripts/arch/init-project.mjs ${name}              # local scaffold
node scripts/arch/init-project.mjs ${name} --approve --create-github <org> --create-linear <KEY>
\`\`\`
`;

console.log(proposal);

if (args.includes("--save")) {
  const dir = join(repoRoot, ".arch/proposals");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}-proposal.md`);
  writeFileSync(file, proposal);
  console.log(`\n[lagret] ${file}`);
}
