# I18N Pitfalls

> Flyttet fra SKILL.md for å holde hovedfokus på prosedyre.

> ✅ **EIER av i18n-pitfalls.** Operativ valideringsworkflow (npm-scripts) ligger i `klarpakke-operations/references/i18n-workflows.md`.


## 3. i18n namespace mismatch

**Symptom:** Rå nøkkelnavn i UI.

**Fiks:** `useTranslations("dashboard.portfolio")` — sjekk mot `messages/no.json`.

---


## 3b. i18n-nøkkelnavn mismatch — komponent bruker feil nøkkelnavn (2026-08-03)

**Symptom:** Dashboard viser rå nøkkelnavn som `dashboard.adaptive.pilotTradeTitle` i stedet for norsk tekst.

**Rotårsak:** Komponenten bruker `t("pilotTradeTitle")` men i18n-filen har `pilotTitle` (eller omvendt). `i18n:validate` sjekker KUN at nøkler finnes — ikke at komponenten bruker riktig navn.

**Eksempel (2026-08-03):**
```json
// messages/no.json hadde:
"pilotTitle": "🎭 Pilot — AI-en trader for deg"

// Men AdaptiveDashboard.tsx brukte:
t("pilotTradeTitle")  // ← feil navn, finnes ikke
```

**Fiks:** Grep komponenten etter `t("...")` og verifiser at nøkkelen finnes EKSAKT i i18n-filen. Ved mismatch: legg til manglende nøkkel (behold begge hvis andre komponenter bruker den gamle).

**Prevensjon:** Ved ny i18n-nøkkel: sjekk at komponenten faktisk bruker den. `i18n:validate` fanger ikke dette — kun visuell inspeksjon eller E2E-test.

---


## 23. usePrices dual-key lookup — DB-nøkkel vs WS-nøkkel

**Symptom:** Priskort/symbolchips viser "—" eller 0 % på 24h-endring selv om tickeren ellers kjører.

**Rotårsak:** `usePrices()` (`src/hooks/usePrices.ts`) bygger `prices`-mappa fra TO kilder med ULIKE nøkkelformater:
- `coin_prices`-DB-rader: nøkkel = base uten USDT-suffiks (`"BTC"`, `"ETH"`, `"SOL"`)
- Binance WS-tickers: nøkkel = `"BTCUSDT"` — og `usePrices` oppretter NYE entries for WS-nøkler som ikke finnes i DB-mappa

→ Begge formene kan eksistere samtidig i samme `prices`-objekt. Å slå opp kun én form gir tomme rader.

**Fiks — slå alltid opp begge former, WS-nøkkel først:**
```tsx
const row = prices[meta.symbol] ?? prices[meta.base]; // "BTCUSDT" ?? "BTC"
```

**Trading-panel design-tokens (mørk glass, `/trade`-sidepanelet):** kort `bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4`, inner-flate `bg-[#0B0F19]`, seksjons-label `text-[11px] font-medium text-slate-500 uppercase tracking-wider`, accent **amber-400** (Auto) / emerald (suksess) / violet (Joker) / red (feil/stopp). Mynt-ikoner (LiveTicker-konvensjon): ₿ BTC, ⟠ ETH, ◎ SOL, ▲ AVAX, Ð DOGE, ⛓ LINK, ⬢ ADA, ◈ DOT, 🦄 UNI, ◆ POL.

**LiveTicker symbol-filtrering:** ALDRI bruk `Object.entries(prices).slice(0,8)` — dette slapp inn BNB, MATIC (migrert til POL 2024) og XRP. Bruk en eksplisitt `TICKER_SYMBOLS`-konstant som matcher `TOP_SYMBOLS` i pilot-engine:

**Stopp av auto-sesjon (Start/Stopp-knapp i AutoStrategyPanel):** PATCH `/api/trading/sessions` **krever `session_id`** — bulk-stopp (`all: true, mode: ...`) godtar KUN `mode: "paper" | "live"`, ikke `"auto"`. Mønster: hent aktive id-er via GET `/api/trading/sessions?status=active` ved mount → lagre i `useRef` → stopp én-og-én med `{ action: "stop", session_id }` i `Promise.all`. Kun `setStatus("idle")` når ALLE PATCH-er svarer ok (AGENTS.md: aldri falsk suksess-UI).

**Se:** `references/auto-strategy-panel-blueprint.md` — full symbol/ikon-tabell, chip-oppsett og verifiseringskommandoer.

---


