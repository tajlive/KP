# P&L-accuracy E2E — oppskrift (Task 5, 2026-08-03)

Regresjonsvakt: `e2e/smoke/pnl-accuracy.spec.ts` — verifiserer at Dashboard P&L stemmer
med Supabase DB innenfor 1 % margin. Kjøres mot prod:
`npx playwright test e2e/smoke/pnl-accuracy.spec.ts --project=chromium`

## Testens struktur (to P&L-kilder, to DB-kilder)

Dashboardet viser TO forskjellige P&L-verdier — test hver mot sin kilde:

| UI-element | Definisjon | DB-kilde | Status 2026-08-03 |
|---|---|---|---|
| Hero «Siste endring»-pillen (SimplifiedHero/TopBar `changePct`) | `(kontoBalanse − startkapital)/startkapital × 100` | `trading_sessions.current_capital_nok` (aktive) → fallback `paper_accounts.current_balance`; start = `paper_accounts.initial_balance` (fallback 100 000) | ✅ PASS (−36,17 % vs −36,17 %) |
| «Total avkastning»-kortet (DashboardPro `stats.totalReturn`) | RPC `total_pnl` (kun realisert), scopes «all» | RPC `get_dashboard_metrics` med `p_statuses = ["active","paused","crashed","stopped"]` | ❌ FAIL — UI viste «175 kr», RPC sa −175,46 kr (fortegnsbug, se under) |

## Nøkkel-trinn

1. **Login + fersk kontekst:**
   ```ts
   test.use({ storageState: { cookies: [], origins: [] } });
   await loginWithCredentials(page, TEST_EMAIL, TEST_PASSWORD); // e2e/helpers/auth.ts
   await page.goto("/no/dashboard", { waitUntil: "domcontentloaded" });
   await expect(page.locator("body")).toContainText(/\d{1,3}(?:\s\d{3})*(?:,\d{2})?\s?kr/, { timeout: 20_000 });
   ```
   (`.auth/user.json` er en utløpt sesjon for en ANNEN bruker.)

2. **UI hero-%:** `page.getByText("Siste endring").locator("..")` (i18n `dashboard.hero.latestChange`),
   `innerText()` → regex `/[-+]?\d+\.?\d*%/` → `parseFloat`. Skop ALDRI til hele body —
   PriceTicker viser også % (markedsdata) og står først i DOM.

3. **DB via RPC:** service-role-klient `createClient(URL, KEY, { auth: { persistSession: false } })`.
   Bruker-id hentes fra `page.request.get("/api/auth/me")` → `{ user: { id, email } }`
   (IKKE `user_profiles.email` — kolonnen er NULL for testbrukere).

4. **Margin:** `diff <= Math.max(1, |db| * 0.01)` — 1 pp / 1 kr absolutt-gulv + 1 % relativt.
   Uten gulvet brekker testen på `toFixed(2)`-avrunding når DB-verdien er nær null
   (planens rene `|dbPnl * 0.01|`-margin er for trang).

## Verifiserte fakta (2026-08-03)

- **Live RPC ≠ migrasjonsfil.** `pg_get_functiondef` viser at prod-`get_dashboard_metrics`
  (3-args) IKKE filtrerer `archived = false` (migrasjon `20260714070000` gjør det) og
  `total_pnl = SUM(COALESCE(realized_pnl, 0))` — ikke `calculate_effective_pnl`.
  Konsekvens: arkiverte sesjoners trades TELES i appens totals. Manuell sum over
  ikke-arkiverte sesjoner ga −80,24 kr mens RPC ga −175,46 kr (arkivert-sesjonen telte med).
- **Testbruker `test+tricky+123@klarpakke.no`** (id `782eb85b-…`): 10 aktive paper-sesjoner
  (10 × 10 000 kr start), 2 stoppede, ~118 trades; `paper_accounts.current_balance` 64 024,69
  = SUM av aktive sesjoners `current_capital_nok` (akkurat). Kontoen handler LIVE — tallene
  flytter seg mellom UI-render og RPC-kall (innen margin, men gjør testen ikke-deterministisk
  på sub-%-nivå).
- **FUNNET BUG:** «Total avkastning»-kortet viser «175 kr» for −175,46 kr. Rotårsak:
  `DashboardPro.tsx` + `AdaptiveDashboard.tsx`: `${totalPnl >= 0 ? "+" : ""}${formatByMode(Math.abs(totalPnl), ...)}`
  — «+» for positiv, INGENTING for negativ. Fiks: `"+" : "-"` (2 filer, 1 linje hver).
  Testen er committet rød (`24de77c75`) som regresjonsvakt; går grønn etter deploy av fiksen.
- **nb-NO «kr»-format:** `formatCurrency` (≥100 kr) → 0 desimaler («-176 kr»); < 100 kr →
  2 desimaler. Minustegn kan være U+2212 «−» — normaliser med `.replace(/\u2212/g, "-")` før parse.

## Pitfalls

- **Playwright laster ikke .env.** Empirisk: `URL set: false`. Spec'en må
  `dotenv.config({ path: path.resolve(process.cwd(), ".env.local") })` selv.
- **Lokal verifisering av prod-tester:** `E2E_BASE_URL=http://localhost:3000` starter
  `npm run dev` via playwright-configs webServer, men lokal dev-server hadde IKKE nettverk
  til Supabase (`EHOSTUNREACH …:443`) → login/timeout. Lokale fiks-endringer kan derfor
  ikke verifiseres uten deploy; rapporter dem som «uverifisert» til parent.
- **Sibling-subagenter redigerer samme filer:** ved «modified by sibling subagent»-advarsel,
  revert KUN egne linjer via `patch` — aldri `git checkout -- <fil>` (sletter siblingens
  pågående arbeid). Sjekk `git status` før/etter.
- **Kontroller scope-statusene:** `/api/dashboard/metrics` default `sessionScope=all` →
  statuses `["active","paused","crashed","stopped"]`. Bruk samme sett i RPC-kallet —
  ellers sammenligner du epler og pærer.
