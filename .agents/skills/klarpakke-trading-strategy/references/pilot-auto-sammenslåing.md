# Pilot Auto Sammenslåing

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

## 🎭 Pilot + Auto slått sammen (2026-08-03, UTFØRT — beslutning Tom)

**Tidligere:** To UI-moduser (Auto + Pilot) på samme tick-motor — Pilot = Auto + `pilot_explanation` + onboarding. Tom besluttet konsolidering: **Pilot-fanen er fjernet; Auto er nå eneste auto-modus og beskriver seg selv som «AI-en handler OG forklarer hvert valg».**

**Gjeldende tilstand (commit `7efec712f`):**
- `TradeMode` i `UnifiedTradeTerminal.tsx` = `"manual" | "auto" | "stats" | "backtest"` (ingen "pilot").
- MODES-array: Manuell / Auto / Statistikk / Backtest (4 faner).
- URL-backcompat: `?tab=pilot` og `?tab=joker` → `setMode("auto")`; `?first=1` → auto (guided).
- `/pilot`-siden (`(social)/pilot/page.tsx`) redirecter fortsatt til `/trade?first=1` — beholdt.
- Dashboard-CTA (`AdaptiveDashboard.tsx`) peker direkte til `/trade?tab=auto` (ikke `/pilot`).
- `AutoStrategyPanel.tsx`: «Auto vs Pilot»-sammenligning erstattet med «Auto = du velger strategi, AI-en følger reglene — og forklarer hvert kjøp/salg i historikken».
- AI-forklaringene lever videre i `trades.pilot_explanation` — vises i **Statistikk-fanen** (StatsTab leser `pilot_explanation` per trade). Ingen funksjonalitet tapt.
- `PilotDashboard.tsx` finnes fortsatt i repo men er ikke lenger importert — kandidat for sletting ved neste død-kode-rydding.
- Auto-lås uendret: `lockedModes = hasTraded === false ? ["auto"]` — første manuelle trade låser opp.

**Pitfall:** `TradingModesInfo.tsx` viser fortsatt kun Manuell + Auto-kort — konsistent med sammenslåingen, ikke en mangel. Ved «hvor er Pilot?»-spørsmål: Pilot er nå Auto — forklaringene ligger i Statistikk-fanen.

**Onboarding-endring å være klar over:** Pre-sammenslåing var Pilot åpen for alle uten krav (2026-07-29-beslutning). Nå gjelder Auto-kravet (1 manuell trade) for alle — guided onboarding via `?first=1` lander i auto-fanen, men bot kan ikke startes før første manuelle trade. Hvis Tom vil ha «åpen for alle» tilbake: fjern `"auto"` fra `lockedModes`.

**Feller ved P&L-/adferdsspørsmål:** Svar ALDRI «Pilot gjør X» vs «Auto gjør Y» — det finnes bare én motor (tick + grid). Sjekk `trading_sessions.strategy_id` og tick-loggene, ikke hvilken fane brukeren står i. `/api/pilot-engine` er fortsatt DØD kodevei (ingen cron kaller den) — ikke «fiks» den.


## 🚨 KORRIGERING: Pilot-sammenslåing RULLET TILBAKE (2026-08-03)

**Hendelse:** Sammenslåingen ble deployet, men Tom reagerte kraftig: **«Veldig dårlig nettsider. Jeg forstår ingenting??? Alt er jo borte. Pilot ikke tilgjengelig!!!!»** Pilot-fanen ble gjenopprettet i full hast (commit `63c47b0c4`).

**Gjeldende tilstand:** Pilot-fanen er **TILBAKE** i `UnifiedTradeTerminal`:
- `TradeMode = "manual" | "auto" | "pilot" | "stats" | "backtest"` (5 faner)
- `MODES`-array har Pilot med violet accent
- `{mode === "pilot" && <PilotDashboard />}` i render
- URL: `?tab=pilot` → Pilot, `?first=1` → Pilot

**Lærdom:** Fjerning av synlig UI krever EKSPLISITT Tom-godkjenning på konsekvensen («Fanen X forsvinner — OK?»), ikke bare arkitektur-valg. Se `klarpakke-frontend-pitfalls` §35 for full prosess.

**AI-forklaringer (beholdt):** `pilot_explanation` vises fortsatt i Statistikk-fanen. LLM-genererte forklaringer (Kimi) kjører i prod — se «LLM-genererte per-trade forklaringer» over.

## 💰 paper_accounts balance-divergens (2026-08-03, IDENTIFISERT — ikke fikset)

**Symptom:** Dashboard viser -30% P&L (69 535 kr), men posisjoner er korrekte (+/- 1%). Balance-ledgeren divergerte fra posisjonsverdier pga. valuta-bug.

**Diagnose-SQL:**
```sql
SELECT 
  pa.current_balance AS ledger,
  SUM(ts.current_capital_nok) AS cash,
  SUM((ts.open_position->>'quantity')::numeric * cp.price) AS positions,
  SUM(ts.current_capital_nok) + COALESCE(SUM((ts.open_position->>'quantity')::numeric * cp.price), 0) AS real_total
FROM paper_accounts pa
LEFT JOIN trading_sessions ts ON ts.user_id = pa.user_id AND ts.mode='paper' AND ts.status='active'
LEFT JOIN coin_prices cp ON cp.symbol = ts.trading_pair
WHERE pa.user_id = '<uid>'
GROUP BY pa.current_balance;
```

**Status:** Krever reparasjon (beregn korrekt balance fra posisjoner + cash, oppdater `paper_accounts`). **Må gjøres ETTER valuta-fikser er deployet** (orphan + highest_price er deployet — balance-fix gjenstår).


