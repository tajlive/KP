# Automasjon — runbook (lokal + CI)

> **Formål:** Én oversikt over _hva_ som kjøres automatisk, _hvordan_ du verifiserer lokalt, og _hvor_ full dybde står.  
> **Dypere kontekst:** [FULL-AUTOMATION-PLAYBOOK.md](../FULL-AUTOMATION-PLAYBOOK.md) · [MCP-CLI-CI-API.md](../MCP-CLI-CI-API.md)

**Oppdatert:** 2026-03-27

---

## 1. Anbefalt lokal sjekk (én kommando)

```bash
npm run automation:check
```

Kjører i rekkefølge:

| Steg | Script                | Hva                                                                                                                             |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `mcp:validate-config` | `.cursor/mcp.json`, `.mcp/mcp_config.json`, `.kimi/mcp-config.json` — gyldig JSON, like server-nøkler, samme innhold per server |
| 2    | `auto:preflight`      | `cloud-readiness.mjs` (**preflight**-profil: Linear påkrevd; Vercel valgfri)                                                    |

**Utvidet (nettverk / API mot tjenester):**

```bash
npm run auto:preflight:full   # + test-mcp-connections.sh + linear:test
npm run verify:automation     # lint, tsc, unit, verify, MCP-config, valgfri MCP-test
```

---

## 2. MCP-konfig (kilde + synk)

| Fil                     | Rolle                                                    |
| ----------------------- | -------------------------------------------------------- |
| `.cursor/mcp.json`      | **Master** — kanonisk liste over MCP-servere (Cursor)    |
| `.mcp/mcp_config.json`  | Kopi av samme `mcpServers` (verktøy/CI som leser `.mcp`) |
| `.kimi/mcp-config.json` | Kopi av samme `mcpServers` (Kimi / annet CLI)            |

**Regel:** Etter endring i master: `npm run mcp:sync` (kopierer til `.mcp` og `.kimi`), eller rediger alle tre identisk. Valider med `npm run mcp:validate-config` før push.

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

| Script                                   | Bruk                                                   |
| ---------------------------------------- | ------------------------------------------------------ |
| `automation:check`                       | MCP-synk + cloud readiness (start her)                 |
| `mcp:validate-config`                    | `.cursor` ↔ `.mcp` ↔ `.kimi` (samme nøkler og innhold) |
| `mcp:sync`                               | Kopier `.cursor/mcp.json` → `.mcp` + `.kimi`           |
| `auto:preflight` / `auto:preflight:full` | Preflight med/uten MCP API-tester                      |
| `verify:automation`                      | Bred lokal gate (se `scripts/verify-automation.sh`)    |
| `test:robot`                             | lint + tsc + unit + E2E prepare + critical Playwright  |

---

## 5. Vanlige feil

| Problem                                    | Løsning                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `zsh: command not found: automation:check` | Bruk **`npm run automation:check`** — det er et npm-script, ikke et program i `PATH`. |
| `pm run` / `utomation:check`               | Skrivefeil: **`npm`** og fullt scriptnavn etter `npm run`.                            |

## 6. Ved feil

- **MCP validate feiler:** Sammenlign `mcpServers` i alle tre JSON-filene; keys og innhold må matche. Bruk `npm run mcp:sync` fra oppdatert master.
- **Preflight feiler:** Krever `LINEAR_API_KEY` i `.env.local`. **Vercel** er ikke påkrevd for `auto:preflight` — kjør `npm run cloud:ready` når du vil sjekke `VERCEL_*`.
- **Supabase psql i test-mcp:** Ved feil (typisk transaction pooler) blir sjekken **skippet** med hint; `PSQL_CHECK_STRICT=1` gir hard fail.
- **CI MCP Integration feiler:** Samme som validate — fiks lokalt med `npm run mcp:validate-config` før ny push.

---

## 7. Leveranse-logg (kort mal)

Når en release er ferdig, logg dette i Linear:

1. Commit SHA + branch
2. Vercel deploy-id + URL + status
3. `/api/health` status + version
4. Lint / type-check / tests

### Siste loggede leveranse (2026-03-26)

- **Playbook / MCP-doc:** Tre kanoniske MCP-filer dokumentert (`.cursor`, `.mcp`, `.kimi`); TypeScript SoT = `npm run type-check` (ikke committed `tsc_errors.txt`). Se `docs/FULL-AUTOMATION-PLAYBOOK.md` §2.
- Commit: `48c582385` (arbeidskopi / `main` ved kjøring)
- **test:robot** (testbruker `tom@klarpakke.no`): lint ✅, type-check ✅, Vitest **222 pass / 1 skip**, Playwright critical-chromium **46 pass / 3 skip**, **1 flaky** (pass på retry etter Next dev minne-restart). `PLAYWRIGHT_TEST_BASE_URL` tvinges til localhost av `scripts/test-robot.sh` når ikke satt.
- Tidligere gate (samme dag): Commit `2924cf0e7` + `30970e741`; `npm run verify` ✅; health `30970e7`, tradingSignals `ok`; critical E2E with user **47 pass / 3 skip**; `prod-health-alert.yml` success.

### Operasjonell verifikasjon (2026-03-27)

- Kjøring: `npm run automation:check` ✅, `npm run health:prod:gate` ✅, `npm run diagnose:signals-traders` ✅.
- Resultat (prod): `/api/health` = `healthy`, `tradingSignals=ok`.
- Signal/cron: heartbeat age ~15 min, feed ikke stale, `leaderboard_bots_active=4`, `trader_profiles_public=3`.
- DB-status: `npm run db:status` viser fortsatt migrasjons-drift (lokal/remote mismatch med `999` + flere remote-only versjoner). Følg repair-rutinen i `docs/trading/LIVE-TRADING-TRADES-INTEGRITY.md`.
- DB-lint: `npm run db:lint` rapporterer feil i `extensions.index_advisor` (`hypopg_reset()` mangler) og `public.store_binance_keys` (crypto-permission). Skal ikke ignoreres før full produksjonsgate.
- Types sync: `npm run db:gen-types` kjørt; etter adapter-fikser i admin/bot-store er `npm run type-check && npm run lint` grønn igjen.
- P1-awareness: `ai_copy` bruker fortsatt dokumentert fallback til `multi_signal` i tick (`src/lib/trading/strategy-id-aliases.ts`).

### Drift-oppfølging (2026-03-27, kveld)

- Kjøring: `supabase migration repair --linked --status reverted 20260325084951 20260325085617 20260325090129` etterfulgt av `npm run db:push:drift`.
- Resultat: tidligere remote-only drift på `20260325084951/617/129` fjernet, og lokale manglende migrasjoner ble applied (inkl. `20260327103000_fix_store_binance_keys_vault_permissions.sql`).
- Ny `db:status`: lokal/remote matcher nå for alle migrasjoner, med unntak av historisk placeholder `999` (eksisterende legacy-markør i begge kolonner).
- Tiltak implementert:
  - `store_binance_keys` deprekert/fjernet via migrasjon `20260327114000_deprecate_store_binance_keys_rpc.sql` (ikke brukt i app-kode).
  - Ny gate-script: `scripts/db-lint-gate.mjs` med eksplisitt allowlist for kjent Supabase extension-støy (`extensions.index_advisor` / `hypopg_reset`).
  - `package.json`: `db:lint:gate` + `db:lint:ci` peker nå til gate-script (strict mode i CI).
- Ny status:
  - `npm run db:lint` viser kun extension-feilen i `extensions.index_advisor`.
  - `npm run db:lint:gate` og `npm run db:lint:ci` er grønne (kun allowlistede findings ignoreres).
- Operativ policy:
  - Bruk `db:lint` for rå innsikt.
  - Bruk `db:lint:ci` som blokkende gate i pipeline.

---

## 8. Production+ gate (kort)

Kjør disse fem stegene for siste sjekk for full produksjon+:

1. `npm run automation:check`
2. `npm run lint && npm run type-check && npm run test:unit`
3. `npm run test:e2e:prepare && npm run test:e2e:critical:with-user`
4. `curl -s https://www.klarpakke.no/api/health` (forvent `healthy`)
5. Logg bevis i Linear (commit SHA + gate-resultater + health-status)
