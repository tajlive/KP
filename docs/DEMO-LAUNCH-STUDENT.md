# Demo-lansering – student (paper + auto)

**Mål:** Nye brukere kan **registrere seg**, **øve med paper**, **starte én auto/strategi-flyt** og **se handler/resultater** (dashboard, handelshistorikk, sesjon).

## Produktregler (implementert)

| Regel                                               | Hvor                                                                                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Student: maks 1 aktiv paper-sesjon**              | `POST /api/trading-sessions/create` bruker `maxActiveTradingSessions()` i `src/lib/trading/session-limits.ts`. Ved forsøk på nr. 2: **409** `MAX_ACTIVE_SESSIONS` + `session_id` til eksisterende økt. |
| **Betalt tier: flere aktive paper/live** etter tier | Samme hjelper; f.eks. Bachelor live = 3, Master live = 7, PhD/Professor live = 999.                                                                                                                    |
| **Live uten Bachelor**                              | Allerede blokkert i create-route + executor.                                                                                                                                                           |
| **Siste handler på tvers av paper/live**            | `getRecentTrades({ limit })` uten `mode` i `src/lib/trading-api.ts`.                                                                                                                                   |

## Manuell demo-sjekkliste (5 min)

1. **Registrering:** `/no/signup` (eller `/en/signup`) → fullfør e-post/passord → bekreft e-post hvis aktivert.
2. **Paper:** `/no/paper-trading` → **Ny trade** / opprett sesjon → kjør **én handel** (kjøp/salg) → se saldo/historikk på sesjonssiden.
3. **Auto:** `/no/dashboard` (eller handel) → start **én strategi** i paper-modus → verifiser aktiv sesjon og at handler/strøm oppdateres.
4. **Grense:** Prøv **ny paper-sesjon** mens én er aktiv (student) → toast + redirect til eksisterende `session_id` (ikke duplikat).
5. **Resultater:** `/no/handelshistorikk` og dashboard «Siste handler» viser egne rader (RLS + `user_id`). På handelshistorikk: oppsummering **Vinn / Tap / Uten realisert P&L**, **sum realisert P&L** og **vinnrate** (kun rader med `realized_pnl` i DB). `data-testid="trade-history-aggregates"` for E2E.

## Automatiserte bevis

```bash
npm run test:unit -- --run src/lib/trading/session-limits.test.ts
npm run test:unit -- --run src/lib/format-signal-datetime.test.ts
npm run test:unit -- --run src/lib/trading/trade-history-aggregates.test.ts
npm run type-check
```

Playwright (krever `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` + kjørende app):

```bash
npm run test:e2e:critical:chromium
```

Relevante specs: `tests/e2e/critical/paper-trading.spec.ts`, `e2e/critical/trading-flow-tier-gate.spec.ts`.

## Merk

- **«1 trade»** i demo-kontekst = **én aktiv øvingsøkt** for studenter (paper), der både manuell handel og auto kan bruke samme økt; ikke et hardt tak på antall kjøp/salg inne i økten.
- Oppgrader til Bachelor+ for **live** og flere samtidige live-strategier.
