# Hermes-prompt: Dashboard-grafen rendres aldri (no-op retry-loop)

## Oppdrag
Fiks at porteføljegrafen på dashboardet aldri viser kurve — og at fallback-knappen «Last graf på nytt» er en uendelig no-op-løkke.

## Verifisert i produksjon (Kimi, 2026-07-29, WebBridge mot klarpakke.no)
- `/api/portfolio/chart?mode=paper&days=30` svarer **200 med komplette data** (5 sesjoner, 4 trades, `accountStart: 100000`, `accountBalance: 95754.41`).
- Ingen `<canvas>` rendres i DOM etter klikk på «Last graf på nytt» — knappen forblir synlig.
- Klikk på knappen utløser nytt vellykket API-kall, men UI-et endrer seg ikke.
- Skjermbilde av tomt grafområde: `prodsjekk-dashboard-2026-07-29.jpg` (repo-rot).

## Rotårsak (verifisert i kode)
1. `src/features/dashboard/DashboardPro.tsx:314` renderer `<PortfolioChart userId={userId} mode={preferredTradingMode} />` — **uten `sessionId`**.
2. `src/features/portfolio/PortfolioChart.tsx:129–135`: når `!sessionId` kjøres `setHasData(false)` + tidlig return. Kurven bygges kun per-sesjon (bevisst valg fra FIKS 3: «Konto-kurve kan ikke rekonstrueres fra sesjons-PnL»).
3. Render `PortfolioChart.tsx:381–390`: ved `hasData=false` (men med header-balanse) vises knappen `t("noChartData")` = «Last graf på nytt», som kaller `fetchPortfolioData` → samme early return → knappen igjen. **Uendelig no-op.**
4. Samme feil rammer `src/features/portfolio/PortfolioClientPage.tsx:239` (`<PortfolioChart userId={userId} mode="paper" />`, også uten `sessionId`) — sjekk `/no/dashboard/portfolio` også.

Konklusjon: Ikke krasj, ikke API-feil — en logikk/UX-bug der kontovisning aldri kan vise kurve, og knappen lovér en retry som aldri kan lykkes.

## Foreslåtte fikser (velg én, vurder selv)
- **A (reell fiks):** Bygg konto-kurve når `sessionId` mangler: anker `accountStart` + kumulativ `realized_pnl` fra alle trades på tvers av sesjoner. Avklar først om API-ets `trades`-liste er komplett nok (dagens kommentar hevder det motsatte — verifiser mot DB før du velger denne).
- **B (pragmatisk):** Dashboard henter nyeste ikke-arkiverte sesjon og sender `sessionId` — vis da `sessionLabel` tydelig slik at brukeren skjønner at kurven gjelder sesjonen, ikke kontoen.
- **C (minimum, ærlig tomtilstand):** Erstatt «Last graf på nytt»-knappen med eksisterende `noData`/`noDataHint`-tomtilstand (finnes allerede i `PortfolioChart.tsx:259–271`, men vises kun når header også mangler). Kan kombineres med B.

Uavhengig av valg: fjern eller rett opp `noChartData`-teksten — den beskriver en feil som ikke finnes.

## Krav
- `npm run lint` + `npm run test:unit` grønne før commit.
- Ikke rør DB, triggers eller RLS. Ikke endre API-kontrakten uten å oppdatere `PortfolioChart` tilsvarende.
- Deploy kun via `bash scripts/deploy.sh` (aldri `npm run deploy`).

## Verifikasjon etter fiks
Åpne `/no/dashboard` innlogget: kurve skal rendres, og «Last graf på nytt»-knappen skal ikke lenger vises i kontovisning. Kimi kan verifisere i produksjon med WebBridge etter deploy.

---

# Vedlegg A — verifisert i prod 2026-07-29 kl 10:35 (full sweep, deploy 288addd7c)

## A1. Punkt 4 verifisert: samme graf-bug på /no/dashboard/portfolio
0 recharts-SVG i grafområdet, «Last graf på nytt» synlig, ingen krasj. Samme rotårsak (`PortfolioClientPage.tsx:239` uten `sessionId`).

## A2. NY BUG: /no/about viser rå i18n-nøkkel som side-tittel
- Produksjon viser tittelen `about.metadata.title | Klarpakke` i nettleserfanen (og dermed i OG/delinger hvis ikke overskrevet).
- `src/app/[locale]/(marketing)/about/page.tsx:16-22` kaller `generateMarketingMetadata({ namespace: "about", titleKey: "metadata.title", descriptionKey: "metadata.description" })`.
- Men `messages/no.json` og `messages/en.json` mangler `about.metadata.*` (namespace `about` har kun hero/story/values/team/cta/risk). next-intl faller tilbake til å vise rå nøkkel.
- **Fiks:** legg til `about.metadata.title` + `about.metadata.description` i begge filer. Fakta-godkjent forslag: tittel «Om Klarpakke», beskrivelse «Norsk plattform for AI-trading med lekepenger — lær deg krypto uten risiko.»

## A3. Kosmetisk (lav prioritet): dobbel brand-suffiks i titler
`Trade | Klarpakke | Klarpakke` og `Profil - Klarpakke | Klarpakke` — sidetitler legger til «Klarpakke» selv om malen allerede gjør det. Sjekk `title.template` i rot-layout vs. per-side titler.

## A4. Metadata-kopy er inkonsistent (redaksjonelt, Kimi eier)
Forsiden: «AI-trading med lekepenger». /pricing og /learn: «Krypto trading bot | Norges krypto-skole». Bør samkjøres med ny home.metadata-copy. Ikke en kode-bug — Kimi leverer nøkler, Hermes limer inn.

## Sider verifisert OK i sweepen
/no ✅ · /no/pricing ✅ · /no/learn ✅ · /en ✅ (riktig oversatt tittel) · /api/health ✅ · /no/trade ✅ · /no/dashboard/auto-trade ✅ · /no/dashboard/historikk ✅ · /no/dashboard/analysis ✅ · /no/dashboard/resultater ✅ (5 recharts-grafer rendres) · /no/dashboard/settings ✅ · /no/profile ✅
