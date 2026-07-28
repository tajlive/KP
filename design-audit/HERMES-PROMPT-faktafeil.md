# HERMES-OPPDRAG: Fiks 6 fakta-feil — pengebeløp rutes til feil datamodell

**Modell:** DeepSeek V4 Pro (deepseek-chat) · **Type:** Kodeimplementasjon + verifisering · **DB-endringer:** INGEN (kun kode)
**Prioritet:** P0 · **Kilde:** Design-audit 28.07.2026, alle tall DB-verifisert mot prod

---

## Bakgrunn (DB-verifisert, ikke antakelser)

Appen har to penge-modeller som er frakoblet hverandre:

1. **Konto** (`paper_accounts`): Tom har `current_balance = 95 586,37`, `initial_balance = 100 000` → reell avkastning **−4,41 %**. Dette er source of truth (migrasjon `20260724120000_fix_balance_sync_direction`).
2. **Sesjons-kapital**: 89 ikke-arkiverte paper-sesjoner med `sum(starting_capital_nok) = 8 205 000 kr` — printet per sesjon, aldri trukket fra kontoen. Σ `realized_pnl` på tvers av disse = **1 334 986,30 kr**.

UI-et presenterer i dag modell 2 som brukerens penger på minst 6 flater, mens modell 1 vises andre steder — samme bruker ser 95 586 kr og 1 434 986 kr på samme skjerm.

Toms user_id (verifikasjon): `0dd08529-b8a8-4fd3-9806-275e2d0135dd`

---

## Arkitekturregel som skal håndheves (ufravikelig)

> **R1 — Konto er eneste sannhet for penger.** Alle beløp presentert som «din» saldo / portefølje / P&L / avkastning hentes fra `paper_accounts`. Konto-P/L = `current_balance − initial_balance`. Konto-% = P/L ÷ `initial_balance`.
>
> **R2 — Sesjons-PnL vises kun per sesjon.** `SessionList`/`SessionDetail`/bot-views kan vise sesjons-PnL med tydelig «Sesjon»-label. **Aldri** summeres på tvers av sesjoner til en overskrift eller KPI.
>
> **R3 — Statistikk er unntatt.** Antall handler, win rate, andel vinnere kan aggregeres på tvers av sesjoner (det er ikke penger).
>
> **R4 — Markedsføring kun med verifisert grunnlag.** Prosent-påstander på landing bruker samme `initial_balance`-korrigerte formel og eksklusjoner som `/api/leaderboard` (referanseimplementasjon, se `src/app/api/leaderboard/route.ts:150`). Tåler ikke tallet dagens lys → fjern påstanden.
>
> **R5 — Ingen falske defaults.** Mangler data → «Ingen data»-tilstand eller skjult komponent. ALDRI et default-beløp (100 000) presentert som brukerens saldo.

---

## De 6 fiksene (fil for fil)

### 1. Landing hero: «Skaffet opptil +900 %» → faktisk 0 %
- **Fil:** `src/app/[locale]/page.tsx:30-44` (`getTopReturn`)
- **Bug:** `(max current_balance − 100 000)/100 000` — hardkodet 100k-initial. Topp-kontoen i prod (`db00be5b…`) har current = initial = 1 000 000 kr → reell avkastning 0,0 %, men heroen viser +900 %.
- **Fiks:** Bruk eksakt samme logikk som `/api/leaderboard`: `(current_balance − initial_balance)/initial_balance`, kun kontoer med `initial_balance > 0`, samme eksklusjoner av test/seed-kontoer som leaderboard gjør. Hvis resultatet etter korrekt filtrering ikke er et reelt, forsvarlig tall (sjekk mot DB før deploy): **fjern prosent-påstanden** og la `hero.subtitle` bruke en verifiserbar variant uten avkastningsløfte (oppdater `messages/no.json:2233` + `en.json`). Dette er også markedsføringsrettslig riktig.
- **Fjern også:** `HeroSection.tsx:18` fallback `?? 316` — ingen falske prosent-defaults (R5).

### 2. Landing hero: falskt «live»-priskort
- **Fil:** `src/components/landing/HeroSection.tsx:69-90`
- **Bug:** Hardkodede priser (BTC 65 446, ETH 1 970, SOL 77.01) merket «live»/«live updates».
- **Fiks:** Koble til eksisterende prisfeed (samme kilde som `PriceTicker` / binance-proxy, client-side fetch med 10s cache), eller slett kortet. Ikke behold statiske tall med live-label — direkte brudd på fakta-regelen i AGENTS.md.

### 3. Portefølje: «Din portefølje 1 434 986 kr (+1335 %)»
- **Filer:** `src/features/portfolio/PortfolioChart.tsx:184` (`currentCapital = startCapital + totalPnl`), data fra `src/app/api/portfolio/chart/route.ts`
- **Bug:** Header = `initial_balance` + Σ `realized_pnl` over alle 89 ikke-arkiverte sesjoner. Skjermbilde-verifisert: 100 000 + 1 334 986 = 1 434 986.
- **Fiks (R1+R2):** Overskriften «Din portefølje» = `paper_accounts.current_balance` med %-endring mot `initial_balance` (Tom: 95 586 kr, −4,41 %). Selve kurven: bruk eksisterende `sessionId`-prop — vis aktiv sesjons egenkapitalkurve som default (med «Sesjon»-label), eller skjul kurven med ærlig empty-state når konto-historikk ikke kan rekonstrueres. Ikke tegn en kurve som later som om sesjons-summer er én konto.

### 4. Resultater: «TOTAL P/L 1 334 986 kr»
- **Filer:** `src/features/portfolio/TradingResultsDashboard.tsx:166` (`aggregates.totalRealizedPnl`) ← `src/app/api/user/trading-analytics/route.ts:31,96-113`
- **Bug:** KPI-en summerer `realized_pnl` over alle ikke-arkiverte sesjoner (R2-brudd).
- **Fiks:** KPI «Total P/L» = konto-P/L (`current_balance − initial_balance` fra `paper_accounts`). Behold `tradeCount`, `winRate` (R3 — de er korrekte). Vil man vise sesjons-PnL: som egen, tydelig labelt «Σ sesjons-PnL (lekepenger per sesjon)»-rad — aldri som overskrifts-KPI. Avklar samtidig label «UTEN RESULTAT: 28» → hva det faktisk teller (sannsynligvis åpne/ulukkede handler).

### 5. Analyse: «Egenkapitalkurve 1 334 986 kr» (parabolsk)
- **Side:** `/no/dashboard/analysis` — spor datakilden (sannsynligvis samme `/api/user/trading-analytics` eller `src/app/api/trading-cockpit/analytics/route.ts`; tallet matcher sesjons-summen eksakt).
- **Fiks:** Samme regel som #3: kurve fra konto-basis, eller per-sesjon med label. Max/min-markører og heatmap beholdes, men må reflektere samme scope som tallet de ledsager.

### 6. Dashboard: «100 000 kr — Ingen data» + hilsen «Profittabel»
- **Filer:**
  - `src/features/dashboard/DashboardPro.tsx:252-254` — `SimplifiedHero balance={effectiveStats.currentCapital} changePct={totalReturn}`
  - `src/features/dashboard/DashboardContent.tsx:100+` — mapping `data.totalCapital` → `stats.currentCapital`
  - `src/server/dashboard/getUserDashboardMetrics.ts` — returnerer BÅDE `totalCapital` (sesjons-basert, ga 100 000 = Toms 1 aktive DCA-sesjon) OG `accountBalance` (95 586 — allerede i objektet, linje 200!)
  - `src/features/dashboard/DashboardPro.tsx:237-240` — `PersonalizedGreeting totalPnl={effectiveStats.totalPnl}` (1,33M > 0 → «Profittabel men ujevn» mens kontoen er −4,4 %)
- **Fiks:** `SimplifiedHero.balance` = `accountBalance`; `changePct` = `(accountBalance − initial_balance)/initial_balance × 100`. `PersonalizedGreeting.totalPnl` = konto-P/L. Da forsvinner også «Ingen data»-pillen (den oppstod fordi `startingCapital` var 0/undefined).

---

## Obligatorisk konsument-sveip (ikke hopp over)

De 6 flatene over er de jeg SÅ. Samme mønster kan lekke andre steder. Kjør:

```bash
rg -n "realized_pnl" src/ --type ts --type tsx -l
rg -n "totalPnl|totalRealizedPnl|totalEffectivePnl" src/ -l
```

Gå gjennom HVER treffflate og klassifiser: (a) per-sesjon-visning → OK med label; (b) overskrift/KPI/e-post/cron → må rutes til konto. Kjente kandidater fra min gjennomgang: `src/lib/resend/templates.ts` og `src/lib/email/index.ts` (ukentlig rapport/drawdown-e-post til BRUKERE — kritisk hvis de sender oppblåste tall), `src/app/api/cron/ai-metrics/route.ts`, `src/app/api/ai/autopilot/status/route.ts`, `src/features/dashboard/AITip.tsx`, `AIInsightCard.tsx`, `CopyTradingCard.tsx`, `src/hooks/usePulseData.ts`. Rapportér funn i commit-meldingen.

---

## Verifisering (før/after, samme SQL som audit-en)

Kjør mot prod (Supabase Management API eller MCP `execute_sql`):

```sql
-- A. Toms konto (uendret av denne fiksen — den er korrekt):
SELECT current_balance, initial_balance,
  ROUND((current_balance - initial_balance)/initial_balance*100, 2) AS real_pct
FROM paper_accounts WHERE user_id = '0dd08529-b8a8-4fd3-9806-275e2d0135dd';
-- Forventet: 95586.37 / 100000 / -4.41

-- B. Hero-kandidat etter korrekt formel:
SELECT user_id, current_balance, initial_balance,
  ROUND((current_balance - initial_balance)/initial_balance*100, 1) AS real_pct
FROM paper_accounts WHERE initial_balance > 0
ORDER BY real_pct DESC LIMIT 5;
-- Verifiser at tallet landingen eventuelt viser matcher en RAD her,
-- med samme test/seed-eksklusjoner som /api/leaderboard.
```

**Manuell UI-verifisering etter deploy** (innlogget som tomarnejensen@gmail.com): `/no` (hero), `/no/dashboard` (hero-kort + hilsen), `/no/dashboard/portfolio`, `/no/dashboard/resultater`, `/no/dashboard/analysis`. ALLE penge-overskrifter skal vise 95 586 kr / −4,4 % eller være tydelig sesjons-labelt. Ingen flate skal vise 1,33M/1,43M/+900 %/+1335 %.

---

## Prosess og gating

1. `npm run lint` + `npm run test:unit` må passere etter hver logisk endring.
2. Ingen DB-migrasjoner, ingen RLS-/trigger-endringer — ren kodefiks. Oppdager du at noe KREVES i DB: stopp og vis SQL-diff til Tom først.
3. Commit per logisk fiks (6+ commits er OK) med kort begrunnelse.
4. Deploy KUN via `bash scripts/deploy.sh` og KUN etter Toms eksplisitte go. Aldri `npm run deploy`.
5. Etter deploy: kjør verifikasjons-SQL B og bekreft hero-tallet, og rapporter før/etter for alle 6 flater.

**Ferdig-kriterium:** Én penge-modell synlig for bruker. 95 586 kr er Toms portefølje overalt — 1 334 986 kr eksisterer ikke som overskrift noe sted i appen.
