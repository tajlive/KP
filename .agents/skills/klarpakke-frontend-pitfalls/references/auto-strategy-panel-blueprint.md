# AutoStrategyPanel — multi-symbol rewrite (2026-08-01)

Drop-in-rewrite av `src/features/trading/AutoStrategyPanel.tsx` i UnifiedTradeTerminal-sidepanelet (300px kolonne på lg). API: **named export `AutoStrategyPanel`, ingen props** — alt state internt. Verifisert med tsc + eslint + vitest (202 filer / 1713 tester, alle grønne).

## Symbol-konstant (alle 11, rekkefølge = visningsrekkefølge)

| symbol | base | icon | navn |
|---|---|---|---|
| BTCUSDT | BTC | ₿ | Bitcoin |
| ETHUSDT | ETH | ⟠ | Ethereum |
| SOLUSDT | SOL | ◎ | Solana |
| BNBUSDT | BNB | ◈ | BNB |
| XRPUSDT | XRP | ◎ | XRP |
| ADAUSDT | ADA | ⬡ | Cardano |
| AVAXUSDT | AVAX | ▲ | Avalanche |
| DOTUSDT | DOT | ● | Polkadot |
| LINKUSDT | LINK | ⛓ | Chainlink |
| DOGEUSDT | DOGE | Ð | Dogecoin |
| MATICUSDT | MATIC | ◆ | Polygon |

Default pre-selected: `["BTCUSDT", "ETHUSDT", "SOLUSDT"]`. Krav: brukeren skal kunne velge hvilke mynter boten trader; minst én må være valgt (Start disabled ved 0).

## Dual-key prisoppslag (kritisk)

`usePrices()` kan ha BÅDE `prices["BTC"]` (fra coin_prices-DB) og `prices["BTCUSDT"]` (fra Binance WS, som oppretter nye entries). Slå opp begge:

```tsx
interface PriceRow { price?: number; price_change_percent_24h?: number | null; }

const changeOf = (meta: SymbolMeta): number | null => {
  const row = (prices[meta.symbol] ?? prices[meta.base]) as PriceRow | undefined;
  const pct = row?.price_change_percent_24h;
  return typeof pct === "number" && Number.isFinite(pct) ? pct : null;
};
// Format: `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%` — grønn ≥ 0, rød < 0, "—" ved null
```

## Stop-flow (Start/Stopp)

- **Mount:** GET `/api/trading/sessions?status=active` → lagre id-er i `activeSessionIdsRef` (useRef). Svar kan være array ELLER `{ sessions: [] }`.
- **Stopp:** PATCH `/api/trading/sessions` per id — `{ session_id, action: "stop" }` i `Promise.all`. **Bulk-variant (`all: true`) godtar kun `mode: "paper" | "live"` — feiler med 400 for auto.**
- Fallback ved tom ref: hent aktive sesjoner på nytt først.
- Kun `setStatus("idle")` når ALLE PATCH-er er `ok` (AGENTS.md: aldri falsk suksess-UI).

## Chip-oppsett (symbol multi-select)

- Grid: `grid grid-cols-2 gap-1.5` — kompakt på mobil og i 300px-sidepanelet, ingen horisontal scroll.
- Chip: `motion.button` med `aria-pressed`, `whileTap={{ scale: 0.96 }}`, `disabled` når `status === "active"`.
- Innhold: ikon-boks (`h-5 w-5 rounded-md`, amber når valgt) + base + 24h% (font-mono) + ✓-markør (`h-3.5 w-3.5`, amber-fylt når valgt).
- Valgt: `border-amber-500/40 bg-amber-500/[0.08]`; uvalgt: `border-[#1E2530] bg-[#0B0F19] hover:border-slate-600`.
- Teller: "N av 11 valgt" (`text-[10px] text-amber-400/90 tabular-nums`).

## Design-tokens (mørk glass, konsistent med terminalen)

- Kort: `bg-[#0A0D12] border border-[#1E2530] rounded-xl p-4`
- Inner-flate (input/tabs/chips): `bg-[#0B0F19] border border-[#1E2530] rounded-lg`
- Seksjons-label: `text-[11px] font-medium text-slate-500 uppercase tracking-wider`
- Auto-accent amber-400; suksess emerald-400; feil/stopp red-400
- Start-knapp: `bg-amber-500 text-black shadow-lg shadow-amber-500/20`; Stopp: `bg-red-500/10 text-red-400 border border-red-500/30`
- Aktiv-sesjon-kort: amber puls-dot (`animate-ping`) + emerald "● Bot aktiv — overvåker og trader automatisk"
- Animasjon: `AnimatePresence mode="wait"` for Start↔Stopp-bytte, motion for status-kort — subtilt, ikke janky

## API-kontrakt (OPPDATERT 2026-08-01)

- POST `/api/pilot` body `{ mode: "auto", live?: boolean, symbols?: string[] }` — **egen route-fil `src/app/api/pilot/route.ts`** (opprettet 2026-08-01; før det fantes ruten ikke og prod returnerte 200 med HTML → stille feil, se SKILL.md §21/§25). `live: true` krever aktiv Binance-kobling med `permissions.trading` + tier bachelor+; valideres server-side i ruten.
- GET `/api/trading/sessions?status=active` — array eller `{ sessions: [] }`
- PATCH `/api/trading/sessions` — `{ session_id, action: "stop" | "pause" | "resume" }`
- GET `/api/exchanges/connections` (NY 2026-08-01) — ved mount i live-toggle: svar `{ connections: [{ exchange, isActive, permissions: string[] }] }`. `permissions.includes("trading")` styrer om live-start er tillatt.

## Live-toggle (NY seksjon 2026-08-01)

- State: `liveMode` (bool), `binanceConnected` (bool|null), `binanceTradingPerm` (bool).
- Mount-effect: GET `/api/exchanges/connections` → finn `binance && isActive` → sett begge.
- UI: 2-kolonne toggle 🧪 Papir / 🔥 Live (Binance). Live-valgt → statusvindu (sjekker → ✅ klar / ⚠️ koble i Innstillinger → Binance API, lenke `/no/dashboard/settings`).
- Guard i `startAutoTrade`: `liveMode && !binanceTradingPerm` → error-melding, ingen fetch.
- `startAutoTrade` body: `{ mode: "auto", live: liveMode, symbols: selected }`.
- Live-arkitektur finnes allerede (søk før du bygger nytt): `exchange_connections`-tabell, `ExecutorFactory.create(db, userId, "live")`, `executeLiveTrade` i tick (se SKILL.md §26).

## Verifiseringskommandoer (kjør ALLE før ferdigmelding)

```bash
npx tsc --noEmit                                   # 0 feil
npx eslint src/features/trading/AutoStrategyPanel.tsx --max-warnings 300   # 0 feil
npx vitest run                                     # ~90-120s, 202 filer / 1713 tester
```
