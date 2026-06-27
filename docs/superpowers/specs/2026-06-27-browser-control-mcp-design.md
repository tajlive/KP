# Design: Browser-kontroll fra KIMI CLI via MCP

**Dato:** 2026-06-27  
**Status:** Godkjent for implementering  
**Valgt tilnærming:** B — Forbedret custom Chrome MCP

## 1. Bakgrunn og mål

KIMI CLI skal kunne styre en nettleser for å:
- Navigere på klarpakke.no og relaterte sider
- Ta screenshots for visuell verifisering
- Klikke, fylle ut skjema og kjøre JavaScript i siden
- Hjelpe med testing, debugging og dashboards

Løsningen skal være rask å starte, spare tokens i modell-konteksten og ha en sikker godkjenningsgate for skrivende operasjoner.

## 2. Nåværende tilstand

Prosjektet har allerede en custom Chrome MCP-server:

- `scripts/chrome-mcp-server.mjs` — MCP-server basert på `@modelcontextprotocol/sdk` + Playwright.
- `scripts/run-chrome-mcp.mjs` — wrapper som laster `.env.local` og starter serveren.
- `@playwright/mcp` og `@playwright/test` er installert.
- Serveren er **ikke** aktivert i `.kimi/mcp-config.json` (fjernet i minimal-konfigurasjonen for å unngå npx/timeouts).
- `.mcp/mcp_config.json` inneholder fortsatt en `chrome`-server.

## 3. Valgt arkitektur

```
KIMI CLI
   │
   ├─ .kimi/mcp-config.json
   │     └─ chrome: node scripts/run-chrome-mcp.mjs
   │
   └─ stdio ──► scripts/run-chrome-mcp.mjs
                       │
                       ├─ load .env.local (MCP_API_KEY, CHROME_MCP_ALLOWLIST)
                       │
                       └─ spawn scripts/chrome-mcp-server.mjs
                                    │
                                    ├─ Playwright chromium.launchPersistentContext(.chrome-profile)
                                    └─ MCP-verktøy
```

Serveren kjører som **lokal stdio MCP-server** uten `npx`, slik at oppstartstiden holdes lav og M1-timeout-problemet unngås.

## 4. Verktøy som eksponeres

| Verktøy | Beskrivelse | Krever godkjenning |
|---------|-------------|-------------------|
| `chrome_start` | Start Chrome med persistent profil under `.chrome-profile/` | Nei |
| `chrome_stop` | Lukk Chrome | Nei |
| `chrome_navigate` | Naviger til URL. Tillatt uten godkjenning på allowlist; ellers pending | Ja, hvis ikke allowlist |
| `chrome_snapshot` | Returner DOM-basert snapshot av interaktive elementer med referanser | Nei |
| `chrome_screenshot` | Ta viewport-screenshot som base64 PNG | Nei |
| `chrome_click` | Klikk element valgt fra snapshot eller CSS-selector | Ja |
| `chrome_fill` | Fyll input | Ja |
| `chrome_type` | Tast inn tekst tegn for tegn | Ja |
| `chrome_select` | Velg `<option>` | Ja |
| `chrome_press` | Trykk en tast (Enter, Tab, Escape, etc.) | Ja |
| `chrome_hover` | Hovre over element | Ja |
| `chrome_scroll` | Scroll vertikalt/horisontalt | Ja |
| `chrome_wait` | Vent på selector, timeout eller nettverksidle | Nei |
| `chrome_evaluate` | Kjør JavaScript i side-kontekst | Ja |
| `chrome_pdf` | Generer PDF av siden | Nei |
| `chrome_console` | Hent siste konsoll-meldinger | Nei |
| `chrome_approve` | Godkjenn eller avvis pending handling | Nei |

## 5. Sikkerhetsmodell

- Kun `https://` og `about:blank` er tillatt.
- `file://`, `ftp://` og andre protokoller blokkeres.
- Standard allowlist: `klarpakke.no`, `www.klarpakke.no`.
- Ekstra domener kan legges til via `CHROME_MCP_ALLOWLIST` (kommaseparert).
- Alle skrivende handlinger (klikk, fyll, tastetrykk, JS-evaluering, etc.) krever eksplisitt `chrome_approve`.
- Navigering utenfor allowlist settes i pending til godkjenning.
- System Chrome-profil kopieres kun når `useSystemProfile: true` sendes eksplisitt.

## 6. Tekniske endringer

### 6.1 `scripts/chrome-mcp-server.mjs`

Refactores for å:
- Bruke en felles `pendingAction`-flyt for alle handlinger som krever godkjenning.
- Legge til `buildSnapshot(page)` som returnerer et komprimert DOM-basert snapshot av interaktive elementer med `ref`-referanser og CSS-selectorer KIMI kan bruke.
- Legge til nye handlers: `type`, `press`, `hover`, `scroll`, `wait`, `pdf`, `console`.
- Forbedre feilmeldinger og logging til `logs/chrome-mcp.log`.

### 6.2 `scripts/run-chrome-mcp.mjs`

- Verifisere at `MCP_API_KEY` er satt før oppstart.
- Gi tydelig feilmelding hvis Playwright ikke er installert.

### 6.3 MCP-konfigurasjoner

- Legge til `chrome`-server i `.kimi/mcp-config.json`.
- Synkronisere til `.cursor/mcp.json`, `.mcp/mcp_config.json`, `.claude/mcp.json`, `.perplexity/mcp_config.json` via `npm run mcp:sync`.

### 6.4 KIMI-alias

- Legge til `browser` / `chrome` i `.kimi/commands.json` som dokumenterer/bruker verktøyet (f.eks. `npm run chrome:mcp`).

### 6.5 Miljøvariabler

- Oppdatere `.env-templates/` med `MCP_API_KEY` og `CHROME_MCP_ALLOWLIST`.
- Dokumentere i relevant README/docs.

### 6.6 Smoke-test

- Utvide `scripts/mcp-smoke-test.mjs` med en chrome-smoke-sekvens:
  1. `chrome_start`
  2. `chrome_navigate` til `https://www.klarpakke.no/no`
  3. `chrome_snapshot`
  4. `chrome_screenshot`
  5. `chrome_stop`

## 7. Bruksflyt for KIMI

1. KIMI kaller `chrome_start`.
2. KIMI kaller `chrome_navigate` med URL.
3. KIMI kaller `chrome_snapshot` for å se sidens elementer.
4. KIMI velger et element og kaller `chrome_click` (settes pending).
5. Bruker bekrefter i samtalen; KIMI kaller `chrome_approve({ approve: true })`.
6. Handlingen utføres.

## 8. Feilhåndtering

- Hvis Chrome ikke kjører: tydelig feilmelding om å kalle `chrome_start` først.
- Hvis selector ikke finnes: liste lignende elementer fra snapshot.
- Hvis URL ikke er tillatt: pending + instruksjon om å bruke `chrome_approve` eller oppdatere allowlist.
- Hvis timeout: returner delvis resultat og årsak.

## 9. Verifisering

- `npm run mcp:validate-config` skal validere ny MCP-konfigurasjon.
- `npm run chrome:mcp` skal starte serveren uten feil.
- `npm run mcp:smoke` skal kjøre chrome-smoke-testen uten feil.
- Manuelle tester fra KIMI:
  1. `chrome_start` → OK
  2. `chrome_navigate` til `https://www.klarpakke.no/no` → OK
  3. `chrome_snapshot` → returnerer elementer
  4. `chrome_screenshot` → returnerer base64 PNG
  5. `chrome_stop` → OK

## 10. Avhengigheter

- Eksisterende: `playwright`, `@modelcontextprotocol/sdk`, `@playwright/test`
- Ingen nye avhengigheter planlagt.

## 11. Gjenstående beslutninger

- Skal `chrome_evaluate` tillate `async` funksjoner? **Ja**, med innebygd `await`.
- Skal screenshots lagres til disk i tillegg til base64? **Nei i første runde**; base64 holder konteksten konsis.
- Skal det støttes Firefox/WebKit? **Nei i første runde**; Chromium er tilstrekkelig.
