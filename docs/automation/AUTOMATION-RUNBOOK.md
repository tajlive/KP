# Automasjon — runbook (lokal + CI)

> **Formål:** Én oversikt over _hva_ som kjøres automatisk, _hvordan_ du verifiserer lokalt, og _hvor_ full dybde står.  
> **Dypere kontekst:** [FULL-AUTOMATION-PLAYBOOK.md](../FULL-AUTOMATION-PLAYBOOK.md) · [MCP-CLI-CI-API.md](../MCP-CLI-CI-API.md)

**Oppdatert:** 2026-03-23

---

## 1. Anbefalt lokal sjekk (én kommando)

```bash
npm run automation:check
```

Kjører i rekkefølge:

| Steg | Script                | Hva                                                                                                      |
| ---- | --------------------- | -------------------------------------------------------------------------------------------------------- |
| 1    | `mcp:validate-config` | `.cursor/mcp.json` og `.mcp/mcp_config.json` — gyldig JSON, like server-nøkler, samme innhold per server |
| 2    | `auto:preflight`      | `cloud-readiness.mjs` (**preflight**-profil: Linear påkrevd; Vercel valgfri)                             |

**Utvidet (nettverk / API mot tjenester):**

```bash
npm run auto:preflight:full   # + test-mcp-connections.sh + linear:test
npm run verify:automation     # lint, tsc, unit, verify, MCP-config, valgfri MCP-test
```

---

## 2. MCP-konfig (kilde + synk)

| Fil                    | Rolle                                          |
| ---------------------- | ---------------------------------------------- |
| `.cursor/mcp.json`     | Cursor — kanonisk liste over MCP-servere       |
| `.mcp/mcp_config.json` | Samme `mcpServers` som Cursor (CI krever synk) |

**Regel:** Endre begge filene likt, eller kjør `npm run mcp:validate-config` før push.

**CI:** [.github/workflows/mcp-integration.yml](../../.github/workflows/mcp-integration.yml) (push/PR på MCP-filer) + [.github/workflows/mcp-health.yml](../../.github/workflows/mcp-health.yml) (hverdags + manuell).

---

## 3. Agent / debug — papir-dashboard-spor

Automatisk repro som utløser instrumentert kode (dashboard SSR, handelshistorikk, balance-API):

**Forutsetninger:** `npm run dev`, `npm run test:e2e:prepare` (eller gyldig `.auth/user.json`).

```bash
npm run debug:paper-balance
```

Kjører Playwright `e2e/debug/paper-balance-trace.spec.ts` (dashboard, handelshistorikk, balance-API). Se Playwright-rapport ved feil.

---

## 4. Hurtigreferanse npm

| Script                                   | Bruk                                                  |
| ---------------------------------------- | ----------------------------------------------------- |
| `automation:check`                       | MCP-synk + cloud readiness (start her)                |
| `mcp:validate-config`                    | Kun `.cursor` ↔ `.mcp`                                |
| `auto:preflight` / `auto:preflight:full` | Preflight med/uten MCP API-tester                     |
| `verify:automation`                      | Bred lokal gate (se `scripts/verify-automation.sh`)   |
| `test:robot`                             | lint + tsc + unit + E2E prepare + critical Playwright |

---

## 5. Vanlige feil

| Problem                                    | Løsning                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `zsh: command not found: automation:check` | Bruk **`npm run automation:check`** — det er et npm-script, ikke et program i `PATH`. |
| `pm run` / `utomation:check`               | Skrivefeil: **`npm`** og fullt scriptnavn etter `npm run`.                            |

## 6. Ved feil

- **MCP validate feiler:** Sammenlign `mcpServers` i de to JSON-filene; keys og innhold må matche.
- **Preflight feiler:** Krever `LINEAR_API_KEY` i `.env.local`. **Vercel** er ikke påkrevd for `auto:preflight` — kjør `npm run cloud:ready` når du vil sjekke `VERCEL_*`.
- **Supabase psql i test-mcp:** Ved feil (typisk transaction pooler) blir sjekken **skippet** med hint; `PSQL_CHECK_STRICT=1` gir hard fail.
- **CI MCP Integration feiler:** Samme som validate — fiks lokalt med `npm run mcp:validate-config` før ny push.
