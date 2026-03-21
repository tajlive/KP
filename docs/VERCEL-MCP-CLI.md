# Vercel MCP og CLI – komplett løsning

Oversikt over MCP (Cursor/AI), CLI (scripting/CI) og hvordan det henger sammen med Node-versjon og build.

**Tilgang til Vercel env:** Agenten/Cursor har tilgang til Vercel-miljøvariabler via (1) Vercel MCP når du er logget inn, (2) CLI `npm run vercel:env` (henter til .env.local) og (3) `VERCEL_TOKEN` i .env.local for API/scripting. Bruk dette når du trenger å sjekke eller dokumentere prod/preview env.

---

## 1. MCP (Cursor)

### Offisiell Vercel MCP (anbefalt)

Vercel tilbyr **remote MCP** med OAuth – ingen token i repo.

| Konfigurasjon   | Verdier                                                              |
| --------------- | -------------------------------------------------------------------- |
| **Cursor**      | `.cursor/mcp.json` → `"vercel": { "url": "https://mcp.vercel.com" }` |
| **Første gang** | Cursor viser «Needs login» → klikk og autoriser i nettleser          |

**Tilgjengelige verktøy (utvalg):**

- `search_documentation` – søk i Vercel-dokumentasjon
- `list_teams` / `list_projects` – teams og prosjekter
- `get_project` – prosjektdetaljer (framework, domener, siste deploy)
- `list_deployments` / `get_deployment` – deployments og status
- `get_deployment_build_logs` – build-logger (feilsøking)
- `get_runtime_logs` – runtime/function-logger
- `deploy_to_vercel` / `use_vercel_cli` – deploy og CLI-instruksjoner
- `web_fetch_vercel_url` – hent innhold fra deployment-URL

Full liste: [Vercel MCP Tools](https://vercel.com/docs/agent-resources/vercel-mcp/tools).

### Prosjektspesifikk URL (anbefalt)

For automatisk kontekst (team + prosjekt) bruk:

```
https://mcp.vercel.com/<team-slug>/<project-slug>
```

**Klarpakke:** `https://mcp.vercel.com/klarpakke/klarpakke`

Team/project slug finner du via `vercel link` + `cat .vercel/project.json`, eller i Vercel Dashboard (Settings → General).

---

## 2. CLI (terminal / CI)

Når MCP ikke brukes (f.eks. CI eller skript), bruk **VERCEL_TOKEN** og CLI/API.

### npm-scripts

| Script                               | Beskrivelse                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `npm run vercel:test`                | Tester Vercel API (bruker fra .env.local)                        |
| `npm run vercel projects`            | Lister prosjekter                                                |
| `npm run vercel deployments [limit]` | Lister deployments (default 10)                                  |
| `npm run vercel project [id]`        | Detaljer for ett prosjekt                                        |
| `npm run vercel:env`                 | `env pull` fra **Production** (tryggere default enn Development) |
| `npm run vercel:env:preview`         | Pull fra Preview                                                 |
| `npm run vercel:env:development`     | Pull fra Development (sjelden — ofte mangler Supabase)           |
| `npm run deploy:prod`                | `npx vercel --prod`                                              |

### Miljøvariabler

- **VERCEL_TOKEN** – påkrevd for API/CLI. Opprett: [vercel.com/account/tokens](https://vercel.com/account/tokens).
- **VERCEL_PROJECT_ID** (valgfritt) – f.eks. `prj_xxx` for `deployments`/`project` uten argument.
- **VERCEL_ORG_ID** (valgfritt) – team-id for team-scoped kall.

CLI-scriptet: `scripts/vercel-api.mjs`; leser `.env.local`.

### MCP-health / test-mcp

`npm run test:mcp` (scripts/test-mcp-connections.sh) tester blant annet Vercel API med `VERCEL_TOKEN` og forventer at første prosjekt returneres.

---

## 3. Løsningsoversikt (Node + build)

### Node-versjon (optimalt for Vercel)

- **Engines:** `package.json` → `"engines": { "node": "24.x" }`.
- **Lokal/Vercel:** `.nvmrc` med `24` — samsvar med engines og Vercel default.
- **Vercel støtte:** 20.x, 22.x, 24.x (default 24.x).
- **Viktig:** Unngå `>=20` i engines; da velger Vercel siste 24.x og du får versjonsadvarsler. Bruk eksplisitt `20.x` / `22.x` / `24.x`.

Dokumentert i **docs/vercel-build-notes.md** §6b.

### Build og deploy

- Deploy: GitHub → Vercel (Git-integrasjon) eller `npx vercel --prod`.
- Build: `next build`; Node-versjon styres av `engines.node` og eventuelt Vercel Project Settings.
- Support: [How to get support from Vercel](https://vercel.com/kb/guide/how-to-get-vercel-support).

---

## 4. Oppsummering

| Del               | Løsning                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **MCP**           | Offisiell remote MCP: `url: https://mcp.vercel.com/klarpakke/klarpakke` i `.cursor/mcp.json`. OAuth, ingen token i config. Sjekkliste + MCP-optimaliseringsflyt: **docs/VERCEL-SETTINGS.md** (§9–§11). |
| **CLI**           | `scripts/vercel-api.mjs` + `npm run vercel` / `vercel:test`. Krever `VERCEL_TOKEN` i `.env.local`.                                                                                                     |
| **Node**          | `24.x` i engines og `.nvmrc` – samsvar med Vercel default.                                                                                                                                             |
| **Dokumentasjon** | Denne filen + **docs/vercel-build-notes.md** + **docs/MCP-CLI-CI-API.md**.                                                                                                                             |
