# Cursor MCP, CLI og API – komplett oversikt

Cursor er **MCP-klient**: den kobles til MCP-servere definert i `.cursor/mcp.json`. Denne filen beskriver hvordan du får full kontroll via MCP-konfigurasjon, Cursor CLI og Cursor APIs.

---

## 1. MCP (Cursor som klient)

Cursor bruker **Model Context Protocol** for å snakke med eksterne verktøy. Prosjektets MCP-er konfigureres i **`.cursor/mcp.json`** (prosjekt) eller `~/.cursor/mcp.json` (globalt).

### Konfigurasjon i dette prosjektet

| Server          | Type  | Bruk                                                               |
| --------------- | ----- | ------------------------------------------------------------------ |
| github          | stdio | run-github-mcp.mjs → GITHUB_TOKEN eller GH_PAT i .env.local        |
| linear          | stdio | run-linear-mcp.mjs → LINEAR_API_KEY                                |
| supabase        | stdio | run-official-supabase-mcp.mjs → SUPABASE_ACCESS_TOKEN i .env.local |
| supabase-db     | stdio | run-supabase-mcp.mjs → DATABASE_URL                                |
| playwright      | npx   | @playwright/mcp — E2E / brukerreiser                               |
| context7        | stdio | run-context7-mcp.mjs → valgfri CONTEXT7_API_KEY (.env.local)       |
| chrome-devtools | npx   | chrome-devtools-mcp — konsoll, nettverk, performance, Lighthouse   |
| resend          | npx   | RESEND_API_KEY                                                     |
| vipps           | stdio | run-vipps-mcp.mjs                                                  |
| cloudflare      | url   | https://mcp.cloudflare.com/mcp (OAuth)                             |

Se **docs/MCP-CLI-CI-API.md** for full liste og **docs/CLOUDFLARE-MCP-CLI.md** for Cloudflare.

### Introspect konfigurasjon (CLI)

```bash
npm run cursor:config   # Skriver ut MCP-server-navn og .cursor/rules-filer (JSON)
```

Dette krever ikke API-nøkkel; leser kun `.cursor/mcp.json` og `.cursor/rules`.

---

## 2. Cursor CLI (terminal-agent)

Cursor tilbyr en **CLI** for å kjøre agenter fra terminalen.

### Installasjon

```bash
# macOS / Linux / WSL
curl https://cursor.com/install -fsS | bash

# Windows PowerShell
irm 'https://cursor.com/install?win32=true' | iex
```

### npm-scripts i dette prosjektet

| Script                        | Tilsvarer      | Beskrivelse                  |
| ----------------------------- | -------------- | ---------------------------- |
| `npm run cursor:agent`        | `agent`        | Start interaktiv agentsesjon |
| `npm run cursor:agent-ls`     | `agent ls`     | List tidligere chatter       |
| `npm run cursor:agent-resume` | `agent resume` | Fortsett siste chat          |

**Merk:** Disse scriptene forutsetter at **Cursor CLI** er installert og at `agent` finnes i PATH. Hvis ikke, installer med lenken over.

### Vanlige CLI-kommandoer

```bash
agent                          # Interaktiv modus
agent "refaktor auth til JWT"  # Med start-prompt
agent -p "review security" --model "gpt-5.2"   # Print-modus, spesifikk modell
agent -c "deploy og test"      # Cloud Agent (kjører i skyen)
agent ls                       # List chatter
agent resume                   # Fortsett siste
agent --resume=<chat-id>       # Fortsett bestemt chat
```

Dokumentasjon: [Cursor CLI](https://cursor.com/docs/cli).

---

## 3. Cursor API (Cloud Agents)

Cursor tilbyr **Cloud Agents API** for å starte og styre cloud-agenter programmatisk (Beta, alle planer). Autentisering: Basic med API-nøkkel.

### API-nøkkel

Opprett nøkkel: **[cursor.com/dashboard](https://cursor.com/dashboard)** → Cloud Agents → API key.  
Legg i `.env.local` som **CURSOR_API_KEY**.

### CLI-wrapper i prosjektet

**`scripts/cursor-api.mjs`** bruker Cloud Agents API med `CURSOR_API_KEY` fra `.env.local`:

| Kommando                        | Beskrivelse                                    |
| ------------------------------- | ---------------------------------------------- |
| `npm run cursor:test`           | Verifiser API-nøkkel (GET /v0/me)              |
| `npm run cursor me`             | Vis API-nøkkelinfo (navn, e-post)              |
| `npm run cursor agents [limit]` | List cloud-agenter                             |
| `npm run cursor agent <id>`     | Hent én agent (status, target, summary)        |
| `npm run cursor models`         | List tilgjengelige modell-IDer for launch      |
| `npm run cursor config`         | Les prosjektets MCP + rules (ingen API-nøkkel) |

### Endepunkter (referanse)

| Metode | Endepunkt                   | Beskrivelse                                  |
| ------ | --------------------------- | -------------------------------------------- |
| GET    | /v0/me                      | API-nøkkelinfo                               |
| GET    | /v0/agents                  | List agenter (query: limit, cursor, prUrl)   |
| GET    | /v0/agents/:id              | Agent-status                                 |
| GET    | /v0/agents/:id/conversation | Samtalehistorikk                             |
| GET    | /v0/agents/:id/artifacts    | Artifacts (siste 6 mnd)                      |
| POST   | /v0/agents                  | Launch agent (prompt, source, target, model) |
| POST   | /v0/agents/:id/followup     | Oppfølging                                   |
| POST   | /v0/agents/:id/stop         | Stopp agent                                  |
| DELETE | /v0/agents/:id              | Slett agent                                  |
| GET    | /v0/models                  | List modeller                                |
| GET    | /v0/repositories            | List GitHub-repos (streng rate limit)        |

Full oversikt: [Cursor APIs](https://cursor.com/docs/api), [Cloud Agents API](https://cursor.com/docs/cloud-agent/api/endpoints).

### Andre Cursor-APIer (Enterprise)

- **Admin API** – team, medlemmer, bruk, utgifter
- **Analytics API** – bruk, modeller, DAU
- **AI Code Tracking API** – AI-generert kode ved commit

Disse krever Enterprise-team og egne API-nøkler fra team-innstillinger.

---

## 4. Oppsummering

| Del     | Hva det er                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------ |
| **MCP** | Cursor er klient; MCP-servere defineres i `.cursor/mcp.json`. `npm run cursor:config` viser server-navn og rules.        |
| **CLI** | Cursor CLI (`agent`) – installeres separat. Wrappers: `cursor:agent`, `cursor:agent-ls`, `cursor:agent-resume`.          |
| **API** | Cloud Agents API – brukes via `scripts/cursor-api.mjs` og `CURSOR_API_KEY`. Kommandoer: test, me, agents, agent, models. |

Med dette har du full kontroll: MCP-oppsett i Cursor, terminal-agent via CLI, og programmatisk styring av cloud-agenter via API og cursor-api.mjs.
