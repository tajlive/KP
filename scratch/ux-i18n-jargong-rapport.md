# UX-analyse: i18n + tekst-kvalitet (jargong for nybegynnere)

**Kilde:** `messages/no.json` (4 616 nøkkler) · **Dato:** 2026-08-05
**Metode:** Flate nøkkler, case-insensitive søk på jargong-termer + live-status-sjekk (grep i `src/`).

## Sammendrag

- **`expectancy`, `regime`, `walk-forward`, `edge`, `volatilitet`: 0 treff** i no.json ✅ — ingen handling.
- **`grid`, `sharpe`, `drawdown`, `backtest`: 30 treff** — 22 er LIVE (vises for brukere), 8 er døde/ubrukte nøkler.
- **Kritisk bonusfunn:** `trading.advancedStats.*` (LIVE i `AdvancedStatsModal.tsx`) inneholder **ødelagte halvoversatte strenger** — verre enn jargong: «Feil run backtest», «Stat max drawdown», «Monthly pn l tittel», «Etikett best handel», «Ingen data signals» osv.
- **Døde engelske plassholdere:** hele `common.botStrategy*/strategy*`-familien + `common.startBotTitle` brukes 0 steder i `src/` — rene engelske plassholdere som aldri vises (ryddekandidat).

## Ordforklaringer for enklere norsk (glossary)

| Jargong | Betydning | Enklere norsk |
|---|---|---|
| grid (trading) | Kjøp/salg i faste prisnivåer | «Kjøp lavt, selg høyt i små trinn» |
| Sharpe-ratio | Avkastning justert for risiko | «Avkastning i forhold til risiko» |
| drawdown | Fall fra topp til bunn | «Maks tap» / «største fall fra toppen» |
| backtest | Simulering mot historiske priser | «Historisk test» |
| win rate | Andel vinnende handler | «Vinnandel» |
| ROI | Avkastning | «Avkastning» |
| posisjonsstørrelse | Beløp per handel | «Beløp per handel» |

## Full liste: nøkkel | tekst | foreslått enklere tekst

### LIVE (vises for brukere) — høy prioritet

| # | Nøkkel | Nåværende tekst | Foreslått enklere tekst |
|---|---|---|---|
| 1 | `competition.howToWinDesc` | Høyest prosentvis avkastning (ROI) vinner. Vi justerer for risiko ved å se på Sharpe-ratio. | Høyest prosentvis avkastning vinner. Vi tar også hensyn til risiko, så store sjanser alene ikke vinner. |
| 2 | `copyTrading.discover.drawdown` | 30d drawdown | 30 d maks tap |
| 3 | `copyTrading.discover.riskHint` | Risiko er et forenklet signal fra Sharpe og win rate — ikke investeringsråd. | Risikoen er et forenklet mål på hvor mye verdien kan falle, basert på tidligere resultater — ikke investeringsråd. |
| 4 | `copyTrading.discover.sharpe` | Sharpe | Avkastning vs. risiko (verktøytips: «Hvor god avkastning i forhold til risikoen som ble tatt») |
| 5 | `copyTrading.discover.winRate` | Win rate | Vinnandel |
| 6 | `dashboard.aiInsight.metrics.drawdown` | Drawdown | Maks tap |
| 7 | `dashboard.aiTip.drawdownHigh.message` | Maks drawdown på {maxDrawdown}% er høy. Vurder å redusere posisjonsstørrelse. | Kontoen har falt {maxDrawdown}% fra toppen. Vurder å bruke mindre beløp per handel. |
| 8 | `gapAnalysis.gaps.backtestGap.title` | Backtest vs Live | Historisk test vs. virkelige handler |
| 9 | `gapAnalysis.gaps.backtestGap.fullDesc` | Vi sammenligner dine live-resultater med backtest-data for å se om strategien presterer som forventet. Et stort avvik kan bety at markedet har endret seg, eller at eksekveringsforholdene er dårligere enn simulert. | Vi sammenligner dine virkelige resultater med resultatene strategien ga på historiske priser. Stort avvik kan bety at markedet har endret seg, eller at handler utføres dårligere i praksis enn i simuleringen. |
| 10 | `gapAnalysis.gaps.backtestGap.metricGapDesc` | Forskjellen mellom live-avkastning og backtest-avkastning i prosent. | Forskjellen mellom virkelig avkastning og avkastningen i den historiske testen, i prosent. |
| 11 | `strategyMarketplace.metadata.category_grid` | Grid | Kjøp lavt, selg høyt |
| 12 | `trading.advancedStats.backtestFailed` | Backtest failed | Historisk test feilet |
| 13 | `trading.advancedStats.backtestUnavailable` | Backtest unavailable | Historisk test er ikke tilgjengelig |
| 14 | `trading.advancedStats.emptyBacktests` | Ingen data backtests | Ingen historiske tester ennå |
| 15 | `trading.advancedStats.errorRunBacktest` | Feil run backtest | Kunne ikke kjøre den historiske testen |
| 16 | `trading.advancedStats.statMaxDrawdown` | Stat max drawdown | Maks tap |
| 17 | `trading.botStatus.maxDrawdown` | Maks drawdown | Maks tap |
| 18 | `trading.cockpit.analysis.stats.maxDrawdown` | Maks drawdown | Maks tap |
| 19 | `trading.cockpit.riskBanner.maxDrawdown` | Maks drawdown | Maks tap |
| 20 | `trading.liveStrategy.statMaxDrawdown` | Stat max drawdown | Maks tap |
| 21 | `trading.performance.maxDrawdown` | Maks drawdown | Maks tap |
| 22 | `trading.restart.description` | {stoppedCount} stoppede + {crashedCount} crashed session(s). Sannsynligvis pga. circuit breaker (drawdown). | {stoppedCount} stoppet + {crashedCount} stoppet av feil. Sannsynligvis automatisk sikkerhetsstopp for å unngå store tap. |
| 23 | `autoTrade.strategyTypes.grid_bot.name` | Grid Bot | Kjøp lavt, selg høyt |
| 24 | `autoTrade.strategyTypes.grid_bot.description` | Automatisk grid trading | Kjøper i små trinn når prisen faller og selger når den stiger — helt automatisk. |
| 25 | `trading.strategies.grid_bot.name` | Grid Bot | Kjøp lavt, selg høyt |
| 26 | `trading.strategies.grid_bot.description` | Kjøper lavt, selger høyt i prisgitter. | Kjøper i små trinn når prisen faller, og selger i trinn når den stiger. |

### Døde/ubrukte nøkler (0 treff i src/) — ryddes eller oversettes ved gjenbruk

| # | Nøkkel | Nåværende tekst | Foreslått enklere tekst |
|---|---|---|---|
| 27 | `dashboard.emptyBotState.grid.name` | Grid Trading | Kjøp lavt, selg høyt |
| 28 | `gapAnalysis.actions.reviewStrategyDesc` | Et stort avvik mellom backtest og live kan bety at strategien trenger oppdatering. | Stort avvik mellom historisk test og virkelige resultater kan bety at strategien bør oppdateres. |
| 29 | `common.botStrategyGrid` | Bot Strategy Grid | Strategi: Kjøp lavt, selg høyt |
| 30 | `common.botStrategyGridDesc` | Bot Strategy Grid Desc | Boten kjøper i trinn når prisen faller og selger når den stiger. |
| 31 | `common.strategyGrid` | Strategy Grid | Kjøp lavt, selg høyt |
| 32 | `common.strategyGridDesc` | Strategy Grid Desc | Kjøper og selger i faste trinn for å tjene på svingninger. |

## Bonusfunn — ødelagte halvoversatte strenger (verre enn jargong)

**LIVE i `AdvancedStatsModal.tsx`** (`trading.advancedStats.*`), alle bør oversettes på nytt:
`statWinRate` = «Stat vinn rate», `statProfitFactor` = «Stat profitt factor», `labelBestTrade` = «Etikett best handel», `labelWorstTrade` = «Etikett worst handel», `labelWinningTrades` = «Etikett winning handler», `labelLosingTrades` = «Etikett losing handler», `monthlyPnLTitle` = «Monthly pn l tittel», `sectionTradeStats` = «Section handel statistikk», `tabHistory` = «Tab historikk», `tabOverview` = «Tab oversikt», `tabPerformance` = «Tab resultat», `emptySignals` = «Ingen data signals».

**Døde engelske plassholdere** (0 bruk i src/, ryddekandidater): `common.botConfigStrategy`, `common.botStrategyAi/Desc`, `common.botStrategyDca/Desc`, `common.botStrategyMulti/Desc`, `common.botStrategyTrend/Desc`, `common.chooseStrategy`, `common.startBotAction`, `common.startBotTitle`, `common.startLiveBotAction`, `common.stepStrategy`, `common.toasts.paperBot.networkError`, `common.strategyAi/Desc`, `common.strategyDca/Desc`, `common.strategyMulti/Desc`, `common.strategyTrend/Desc`.

## Anbefalt oppfølging

1. Erstatter tekster i rad 1–26 (LIVE) i `messages/no.json` **+ tilsvarende i en/th/zh** (i18n-valideringen fanger bare struktur, ikke innhold).
2. Oversett `trading.advancedStats.*` på nytt (rad 12–16 + bonusfunn) — dette er synlige UI-tekster i dag.
3. Slett eller oversett døde `common.*`-nøkler (rad 27–32 + bonusfunn).
4. Vurder forklarende verktøytips på «Maks tap»/«Vinnandel»-statistikker: «Største fall fra toppen av kontoen din», «Andel av handler som endte med gevinst».
