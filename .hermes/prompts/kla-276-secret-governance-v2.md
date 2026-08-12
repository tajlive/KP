> Navnebytte 2026-08-12: Blyt → Arch (referanser oppdatert; innhold ellers uendret fra verbatim-lagring).

# HERMES TASK PROMPT — KLA-276

Secret Governance v2 — Arch Security Foundation

> Lagret 2026-08-12 (Tom). Utføres av Hermes etter Master Prompt v4.1.

## Rolle

Du er Hermes, hovedarkitekt for Arch-plattformen. Denne oppgaven bygger videre på:
Hermes Master Prompt v4.1, Arch Control Plane v1, Project Factory v1.1,
Linear-first arkitektur. Målet er å eliminere alle hemmeligheter utenfor
kontrollert Secret Governance.

## Mål

Etabler Secret Governance v2 som standard for alle Arch-prosjekter.
Sluttresultat: Secrets → Secret Registry → secret:// references → Agents + CI/CD +
Runtime. Ingen secrets skal ligge tilfeldig i: config-filer, kode, repo, logger,
dokumentasjon, agent-oppsett.

## Viktige regler (IKKE GJØR)

- ❌ Ikke slett secrets før migrering er verifisert
- ❌ Ikke roter produksjonstokens uten plan
- ❌ Ikke endre Cloudflare/GitHub/Supabase produksjon direkte
- ❌ Ikke commit secrets
- ❌ Ikke publiser verdier i rapporter

## Fase 1 — Audit

Kartlegg alle secret-kilder. Søk: .env*, config.yaml, *.json, _.toml, _.yml,
\*.yaml, GitHub secrets, Cloudflare secrets, Hermes config, MCP config.
Bruk patterns: API*KEY, TOKEN, SECRET, PASSWORD, PRIVATE_KEY, BEARER, JWT, sk-,
ghp*, gho*, lin_api*, sbp\_.
Lag rapport: .arch/security/secret-audit-YYYY-MM-DD.md med tabell:
Lokasjon | Type | Risiko | Handling.

## Fase 2 — Secret Registry

Opprett .arch/secrets/ med registry.yaml, mapping.yaml, README.md.
Kun referanser — ingen verdier (secret://global/…, secret://klarpakke/prod/…).

## Fase 3 — Hermes Secret Policy

Oppdater .arch/policies.yaml med secret_policy: forbidden_locations (repository,
markdown, agent_prompts), allowed (secret_registry, runtime_environment),
scanning.required=true, rotation.documented=true.

## Fase 4 — Hermes Config Cleanup

Problem: ~/.hermes/config.yaml inneholder tokens.
Lag plan: Før (config.yaml med token/bearer/api key) → Etter (secret://-referanser).
IKKE flytt eller slett før: ny referanse fungerer, smoke-test passerer, backup finnes.

## Fase 5 — Secret Scanner

Lag scripts/security/secret-audit.mjs. Krav: read-only, ingen logging av funnede
verdier, returnerer kun metadata. Output: {status, files_scanned, findings}.

## Fase 6 — CI Security Gate

.github/workflows/security-audit.yml — kjør ved pull request og før deploy.
Fail hvis: ekte secret funnet, token-format oppdaget, private keys funnet.

## Fase 7 — Dokumentasjon

Oppdater .hermes/decisions.md, .hermes/architecture-history.md, AGENTS.md.
Dokumenter: hvorfor Secret Governance finnes, hvordan agenter bruker secrets,
hvem som godkjenner endringer.

## Agent-begrensninger

Hermes tillatt: audit, lage mapping, lage policy, lage scripts, dokumentere.
Hermes ikke tillatt: lese ut secrets i rapport, rotere produksjonsnøkler alene,
sende secrets til eksterne tjenester, committe secrets.

## Tester

npm test, npx tsc --noEmit, npm run build, node scripts/security/secret-audit.mjs --check.

## Leveranser

Rapporter: Status, Linear (KLA-276), Commit, Endret, Tester, Security audit,
Secrets funnet, Secrets migrert, Blokkeringer.

## Før push

Stopp og vent hvis produksjonssecret/Cloudflare secret/GitHub secret må endres
eller token må roteres — krev Tom-godkjenning.

## Sluttmål

Arch skal håndtere 100+ prosjekter, flere kunder, flere agenter, flere miljøer
uten at secrets blir en sikkerhetsrisiko. Bygg sikker grunnmur først.
