# UnifiedTradeTerminal + /api/pilot — filkart og merge-blueprint

Oppdatert: 2026-08-01 (etter merge av JokerTradeDashboard → UnifiedTradeTerminal som 4. fane "Statistikk", OG opprettelse av ekte /api/pilot-route).

## Arkitektur: UnifiedTradeTerminal.tsx

`src/features/trading/UnifiedTradeTerminal.tsx` (~860 linjer) — terminalen på `/trade`.

### Typer og MODES

```ts
type TradeMode = "manual" | "auto" | "joker";  // → utvidet: "manual" | "auto" | "joker" | "stats" | "backtest"

const MODES: { id: TradeMode; label: string; short: string; accent: string }[] = [
  { id: "manual", label: "Manuell", short: "✋", accent: "data-[state=active]:border-emerald-400 data-[state=active]:text-emerald-400" },
  { id: "auto",   label: "Auto",    short: "🤖", accent: "data-[state=active]:border-amber-400 data-[state=active]:text-amber-400" },
  { id: "joker",  label: "Joker",   short: "🃏", accent: "data-[state=active]:border-violet-400 data-[state=active]:text-violet-400" },
  { id: "stats",  label: "Statistikk", short: "📊", accent: "data-[state=active]:border-cyan-400 data-[state=active]:text-cyan-400" },
  { id: "backtest", label: "Backtest", short: "🔬", accent: "data-[state=active]:border-blue-400 data-[state=active]:text-blue-400" },
];
```

- **Fane-rekkefølge i UI:** 1. Marked (manual), 2. Auto-strategi (auto), 3. Pilot (joker), 4. Statistikk (stats), 5. Backtest (backtest).
- `ModeTabs` (linje ~92): rendrer `MODES.map`, `data-state={active === m.id ? "active" : "inactive"}`, `isLocked && "opacity-50"` med 🔒-prefix.
- **Lås-logikk:** `lockedModes: TradeMode[] = hasTraded === false ? ["auto"] : []` — bare Auto låses for nye brukere (Tom 2026-07-29). `useHasTraded()` leser `/api/paper-trading/balance` → `recentTrades` filter `!t.is_bot`, lytter på `kp:trade-executed`-event.
- `handleModeChange` blokkerer locked modes med `setLockHint(true)`.
- **URL-param:** `useSearchParams()`-effect setter mode fra `?tab=auto|stats|joker|backtest|manual` og `?first=1 → joker`. Redirect-sider (`/dashboard/auto-trade`, `/dashboard/jokertrade`) peker nå hit.

### Sidepanel-switch (linje ~850)

```tsx
<div className="space-y-3">
  {mode === "manual" && (<><OrderPanel mode={mode} /><MiniPositionList /></>)}
  {mode === "auto" && <AutoStrategyPanel />}
  {mode === "joker" && <PilotDashboard />}   {/* fra JokerDashboard.tsx */}
  {mode === "stats" && <StatsTab />}         {/* portért fra dashboard/jokertrade */}
  {mode === "backtest" && <BacktestPanel />} {/* fra features/backtest/BacktestPanel.tsx */}
</div>
```

### Beskrivelsesbar

`motion.div` med `key={showUnlock ? "unlock" : lockHint ? "lock" : mode}` og per-mode fargeklasser:
manual → emerald, auto → amber, joker → violet, stats → cyan (`bg-cyan-500/5 border-cyan-500/20 text-cyan-400`), backtest → blue. `showUnlock`/`lockHint` overstyrer alltid.

### Andre komponenter i filen

- `LiveTicker` — scrollende ticker fra `usePrices()`, fallback-priser, `animate-scroll-x`.
- `PriceSparkline` — client-side Binance 15m klines (`/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=40`), Catmull-Rom bezier, 30s poll. **Merk:** direkte Binance-kall, NOK-konvertert via `usdtPriceToNok`.
- `PriceCard` — BTC/NOK-pris + sparkline, `#0A0D12`/`#1E2530`.
- `OrderPanel` — **symbol-selector (11 valutaer, Tom-krav 2026-08-01):** `SYMBOLS`-array med `{symbol, base, icon, name}`, `symbol`-state (default BTCUSDT), `pair: selectedMeta.base + "/USDT"` i body, pris/≈-tekst/knapp binder til `selectedMeta.base` — ikke hardkodet BTC. Kjøp/selg via `/api/paper-trading/execute`, dispatcher `kp:trade-executed`, e-post via `/api/email/send`.
- `MiniPositionList` — `/api/paper-trading/balance` → `positions || recentTrades`, trade-ikoner (🤖/🛑/🎯/✋).
- `StatsTab` — portért fra JokerTradeDashboard: 4 stat-kort (Resultat/Win-rate/Vinnere/Tapere), per-coin-tabell, siste-10-handler med `joker_explanation`. Fetch `GET /api/pilot` med `credentials: "include"`.
- `WalletBalance`, `FirstTradeFlow`, `FirstTradeReward` — importert.
- **Tema:** `bg-[#0B0F19]` sidebakgrunn, `#0A0D12` paneler, `#1E2530` borders. **Mobile-first:** `px-3 sm:px-4`, faner får egen rad på mobil (`order-3 w-full overflow-x-auto sm:order-none sm:w-auto`).

## /api/pilot — EGEN ROUTE (opprettet 2026-08-01)

**`src/app/api/pilot/route.ts` finnes NÅ.** Før 2026-08-01 fantes den IKKE — kommentarer i `jokertrade/{notifications,leaderboard}` hevdet feilaktig at `/api/pilot/*` var aliaser dit, men `curl https://www.klarpakke.no/api/pilot` returnerte **200 med HTML** (Next.js fallback til nærmeste side) — ikke JSON. `res.ok=true` men `data.success=undefined` → stille feil i AutoStrategyPanel, PilotDashboard og StatsTab. P0-lærdom: verifiser API-ruter med curl JSON-sjekk, ikke antagelser.

| URL | Faktisk fil |
|-----|-------------|
| `POST /api/pilot` | `src/app/api/pilot/route.ts` — start/aktiver sesjon: body `{mode: "auto"\|"joker", live?: boolean, symbols?: string[]}`. Live krever `exchange_connections` (binance, is_active, permissions.trading) + tier bachelor+. Eksisterende aktiv sesjon i samme mode gjenbrukes (touch heartbeat). |
| `GET /api/pilot` | `src/app/api/pilot/route.ts` — analytikk: `{analytics: {totalPnl, winRate, totalTrades, winningTrades, losingTrades, byCoin}, trades: [...]}`. Kun lukkede handler (`realized_pnl !== null`). |
| `GET /api/pilot/notifications` | `src/app/api/jokertrade/notifications/route.ts` (lever fortsatt) |
| `GET /api/pilot/leaderboard` | `src/app/api/jokertrade/leaderboard/route.ts` (lever fortsatt) |

Brukes av: `PilotDashboard` (JokerDashboard.tsx), `AutoStrategyPanel`, `StatsTab` — alle fetcher `/api/pilot` med `credentials: "include"`.

## AutoStrategyPanel (rewrite 2026-08-01)

`src/features/trading/AutoStrategyPanel.tsx` (~530 linjer):
- **Alle 11 symboler multi-select:** BTC/ETH/SOL/BNB/XRP/ADA/AVAX/DOT/LINK/DOGE/MATIC med ikoner + 24h-endring via `usePrices()` dual-key lookup (`prices[s.symbol] ?? prices[s.base]`). Default: BTC+ETH+SOL. 2-kolonne grid, amber-akcent for valgte.
- **Risiko segmentert:** Lav 1% / Medium 5% / Høy 10% per trade.
- **Kapital (NOK)** input.
- **Handelsmodus (NYTT 2026-08-01):** 🧪 Papir vs 🔥 Live (Binance) toggle. Live sjekker `GET /api/exchanges/connections` ved mount (`binanceConnected`, `binanceTradingPerm`), viser statusvindu, blokkerer start uten trading-tillatelse, lenke til `/no/dashboard/settings`.
- Start → `POST /api/pilot` med `{mode:"auto", live, symbols}`. Stopp → PATCH `/api/trading/sessions` per id (krever `session_id`).
- Aktive sesjoner sjekkes ved mount via `GET /api/trading/sessions?status=active` (server-side auth — browser-supabase er anon).

## GET /api/pilot respons-shape

```ts
{
  analytics: {
    totalPnl: number,          // sum realized_pnl over LUKKEDE trades
    winRate: number,           // wins/closed * 100
    totalTrades: number,       // antall rader (åpne + lukkede)
    winningTrades: number,     // realized_pnl > 0
    losingTrades: number,      // realized_pnl <= 0
    byCoin: { coin: string; trades: number; pnl: number; winRate: number }[],  // sortert på pnl desc
  },
  trades: Trade[],             // siste 10, toppnivå
}
```

**Kilde (pilot/route.ts GET):** `closed = trades.filter(t => t.realized_pnl !== null && t.realized_pnl !== undefined)`; alle statistikker regnes kun over lukkede handler. `byCoin`-aggregering per `trading_pair` med `coin = pair.replace("USDT","")`.

## Merge-blueprint: dashboard-page → terminal-fane

1. Utvid unionen: `type TradeMode = "manual" | "auto" | "joker" | "stats" | "backtest";`
2. Legg til MODES-entry med accent-farge (cyan for stats, blue for backtest).
3. Portér dashboard-komponenten inn i filen (f.eks. `StatsTab`): beholder fetch-`useEffect` mot `/api/pilot`, stat-kort-grid (`grid-cols-2 md:grid-cols-4`), per-coin-liste, siste-10-handler med `joker_explanation`.
4. Legg til `{mode === "stats" && <StatsTab />}` i sidepanel-swicten.
5. Legg til farge-variant i beskrivelsesbaren + melding.
6. **i18n:** ikke nødvendig — terminalen hardkoder norske labels inline (konsistent med resten av filen).
7. Legg til URL-param-håndtering (`?tab=...`) i `useSearchParams()`-effectet.

Dashboard-komponentens lokale helpers verdt å ta med: `formatNok` via `Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 })` og `formatCoin = pair.replace("USDT", "")`. Side-farging: buy → grønn, sell → rød.

## Backtest-tab (ny 2026-08-01)

`src/features/backtest/BacktestPanel.tsx` — eksisterte men var IKKE koblet inn noe sted. Nå 5. fane:
- Alle 11 symboler, 5 strategier (SMA_CROSSOVER, RSI_MEAN_REVERSION, DCA, GRID, MULTI_SIGNAL), kapital-slider 10k-500k, perioder 30/90/180/365 dager, Monte Carlo-toggle.
- Kaller server-action `executeBacktest` fra `@/lib/actions/backtest` (som bruker `@/lib/backtest/engine` — gammel motor).
- To motorer finnes: `src/lib/backtest/engine.ts` (gammel, brukes av API/action) og `src/lib/trading/backtestEngine.ts` (ny, "single source of truth", bruker shared strategy registry + cache + Monte Carlo + walk-forward). Konsolidering TODO.
- Dark theme: `#0A0D12`/`#1E2530`, equity-område-diagram via recharts, metrikk-kort (Avkastning/Max DD/Sharpe/Win-rate), disclaimer.

## Pitfalls

- **Ikke søk i build-artefakter.** `grep` mot `.open-next/`-minifiserte filer kan trigge hardline-blocklist og gir ingen ny informasjon — kildekoden i `src/` er fasiten. Bruk `search_files` på `src/`.
- `messages/no.json` har `"trading"`-namespacet (linje ~4266) med `firstTrade.*`, `positions.*` osv. — men terminalens hardkodede labels ligger inline i TSX-en, ikke i i18n.
- `formatNOK` fra `@/lib/format/currency` finnes og brukes i terminalen (locale `nb-NO`) — kan brukes i stedet for lokal `Intl`-helper.
- **`useSearchParams` er deklarert én gang** i UnifiedTradeTerminal — ikke deklarér på nytt i en annen funksjon/effect (TS2451 redeclare).
- **Subagent-merge kan returnere plan uten kode** (tool-iteration-limit) — les summary for "Files modified: none" og fullfør selv.
