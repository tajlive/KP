# Architecture Proposal

**Prosjekt:** `arch-dashboard`
**Type:** Internal Platform
**Estimert kompleksitet:** Lav–Medium
**Krever Tom approval:** Ja

## Anbefalt stack

- **Frontend/App:** Next.js 16 (App Router, OpenNext → Cloudflare Workers)
- **Runtime:** Cloudflare Workers (edge der mulig, `nodejs` for supabase-js-ruter)
- **Data:** Supabase (Postgres + pg_cron)
- **Oppgaver/krav:** Linear (eget team, key 1–4 tegn)
- **CI/CD:** GitHub Actions (test-gate → deploy → smoke → auto-rollback)
- **Secrets:** BWS + wrangler + GitHub Actions (referanser i .arch/secrets/registry.yaml)

## Agenter

| Agent  | Rolle                                    |
| ------ | ---------------------------------------- |
| Hermes | Arkitektur + drift (chief-architect-ops) |
| Codex  | Implementering (senior-developer)        |
| Kimi   | Research (research-analyst)              |

## Risiko

- GDPR (personopplysninger)
- Secrets (secret://-governance)
- API-kostnader (LLM/3.-part)

## Arvet kunnskap (fra Arch Knowledge Graph)

- **Tidligere failure/lesson:** supabase-js-ruter = runtime:"nodejs" (aldri edge)
- **Tidligere failure/lesson:** route handlers: createServerClient(request, response)
- **Tidligere failure/lesson:** wrangler multi-env → --env ""

## Governance (arves automatisk)

- «Arch lærer av systemet, men endrer aldri sikkerhetsgrenser automatisk.»
- Factory kan lage repo/dokumentasjon/workflows/policies — aldri deploye, prod-secrets, live, betaling.
- Eksterne ressurser (GitHub-repo, Linear-team) krever Tom-godkjenning + `--approve`.

## Neste steg (etter Tom-godkjenning)

```
node scripts/arch/init-project.mjs arch-dashboard --dry-run
node scripts/arch/init-project.mjs arch-dashboard              # local scaffold
node scripts/arch/init-project.mjs arch-dashboard --approve --create-github <org> --create-linear <KEY>
```
