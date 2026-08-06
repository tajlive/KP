# USDT/NOK pris-konvensjon + formatNOK API

## Canonical enhet

- `public.coin_prices.price` er **NOK**.
- `usePrices()` returnerer **NOK**. Binance WebSocket gir USDT og konverteres i hooken før `setPrices`.
- Trade-terminal bruker `prices[symbol].price` direkte som NOK. Ikke kall `usdtPriceToNok()` på `usePrices()`-verdier — det er dobbelkonvertering.
- Kun fallback-konstanter i komponenter er USDT og konverteres med `usdtPriceToNok()`.
- For å vise USDT-kurs fra NOK-pris: `nokPriceToUsdt(priceNok)`.

## Hjelpere: `src/lib/market/nok.ts`

```typescript
const FALLBACK_USDT_NOK = 10.92;

export function getDisplayUsdtToNokRate(): number {
  const env = process.env.NEXT_PUBLIC_USDT_NOK_RATE;
  if (env) {
    const parsed = Number(env);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return FALLBACK_USDT_NOK;
}

export function usdtPriceToNok(priceUsdt: number, rate = getDisplayUsdtToNokRate()): number {
  return priceUsdt * rate;
}

export function nokPriceToUsdt(priceNok: number, rate = getDisplayUsdtToNokRate()): number {
  return rate > 0 ? priceNok / rate : 0;
}
```

## Skriveveier som må lagre NOK

Disse skal konvertere Binance USDT til NOK før upsert til `coin_prices`:

- `src/app/api/cron/sync-prices/route.ts`
- `supabase/functions/binance-websocket/index.ts`

Konverter `lastPrice`, `highPrice`, `lowPrice`. La `volume_24h` og prosent være uendret.

**Midlertidig data-drift:** DB kan ha blandede enheter (BTC/ETH/SOL NOK, enkelte altcoins USDT). Etter deploy skal neste `sync-prices` overskrive alle med NOK. Probe:

```sql
select symbol, name, price, price_change_percent_24h, last_updated
from public.coin_prices
order by symbol;
```

## formatNOK API — viktige forskjeller fra Intl.NumberFormat

`FormatNOKOptions` i `src/lib/format/currency.ts`:

| Felt | Type | Standard | Notat |
|------|------|----------|-------|
| `locale` | `string` | `"no-NO"` | `"no"` → `"nb-NO"` |
| `showSign` | `boolean` | `false` | `true` → `+/- kr` |
| `style` | `"currency" \| "decimal"` | `"currency"` | Currency: `kr`-suffix |
| `fractionDigits` | `number` | `2` | **HETER IKKE** `maximumFractionDigits` |

```typescript
// ✅ KORREKT
formatNOK(priceNok, { locale: "nb-NO", fractionDigits: 0 })

// ❌ FEIL — finnes ikke i typen
formatNOK(priceNok, { locale: "nb-NO", maximumFractionDigits: 0 })
```

## Test-mock-mønster for trading-komponenter

`usePrices()` mock skal returnere NOK:

```typescript
vi.mock("@/hooks/usePrices", () => ({
  usePrices: () => ({
    // NOK, ikke USDT — hooken har allerede normalisert WebSocket USDT → NOK.
    prices: { BTCUSDT: { price: 690777, price_change_percent_24h: 2.3 } },
    loading: false,
    isConnected: true,
  }),
}));
```

`next-intl` mock: `useTranslations("ns")` returnerer funksjon som forventer KORTE nøkler (`noData`), ikke fulle (`ns.noData`).

## Feilmønster: USDT priser merket som `kr`

**Før (BUG):**
```tsx
<span>{price.toLocaleString("no")} kr</span>
```

**Etter (FIX):**
```tsx
const { prices } = usePrices(); // NOK
const priceNok = prices["BTCUSDT"]?.price ?? usdtPriceToNok(63258);
<span>{formatNOK(priceNok, { locale: "nb-NO", fractionDigits: 0 })}</span>
```

## ⚠️ `useRealtimePrices` ≠ `usePrices` — rå USDT (2026-07-24)

**To pris-hooks med MOTSATT enhet:**

| Hook / API | Enhet | Merknad |
|---|---|---|
| `usePrices()` / `coin_prices` | **NOK** | Konvertert i hook/cron |
| `useRealtimePrices()` / `/api/market/binance-24hr` | **rå USDT** | Direkte Binance-proxy, INGEN konvertering |
| `trades.price` i DB | **NOK** | Verifisert: BTC-trade 712 362 |

**Symptom (portefølje 2026-07-24):** Åpne posisjoner viste −90 % P&L fordi live USDT-pris (74 000) ble sammenlignet med avgBuyPrice i NOK (712 000).

**Konverteringsmønster (fra PortfolioDashboard):**
```tsx
const [rate, setRate] = useState(10.9); // fallback
useEffect(() => {
  fetch("/api/fx/usdt-nok").then(r => r.json()).then(d => setRate(d.rate));
}, []);
const livePriceNok = livePriceUsdt * rate;
```

## ⚠️ Miksede enheter i historiske `trades`-rader (data-korrupsjon)

Gamle skriveveier har lagret USDT-priser rett i `trades.price` (BTC 62 9xx i stedet for 629 3xx). Én slik rad forurenser ALT nedstrøms: `realized_pnl` (én USDT-priset salgsrad ga −10 429 kr fantomtap), stats-summer, graf og posisjons-aggregering.

**Deteksjon:** BTC-pris < 200 000 eller ETH < 10 000 i `trades.price` = USDT-enhet.
**Reparasjon:** Regn om med kurs implisitt fra paret (motpart-raden): `price_nok = price_usdt × rate`, oppdater `total_value`, `fee` og `realized_pnl` med samme formel som originalen (`qty × (sell−buy) − fee`). `usdt_nok_rate`-kolonnen finnes men var null på de korrupte radene.
**Kvote-aggregering på tvers av sesjoner:** Posisjoner aggregert over ALLE sesjoner gir fantombeholdning (0.837 BTC verdt 524k på en 100k-konto) fordi gamle sesjoner med blandede enheter aldri ble "solgt". Se archived-scoping under.

## ⚠️ `trading_sessions.archived` — scoping-regel (2026-07-24)

`archived = true` betyr "test-era, ikke en del av reell historikk". Sider som viser brukerdata MÅ scope:

- **Stats/historikk/graf:** kun ikke-arkiverte sesjoner (ellers: +310 707 kr "realisert P&L" på historikksiden vs −62 kr reelt).
- **Åpne posisjoner:** kun sesjoner med status `active`/`paused` — stoppete sesjoner er avviklet, beholdningen deres er ikke reell.
- **Mønster i API-route:** hent sesjon-id-er først (`trading_sessions.select("id").eq("user_id",…).is("archived", false)`), deretter `.in("session_id", ids)` på trades. Tom liste → returner tomt svar tidlig.

**QA-signal — krysssidekonsistens:** Samme metrikk på to sider (portefølje vs historikk: 19 vs 71 handler, −62 vs +310 707 kr) avslørte scoping-bug. Sammenlign ALLTID overlappende nøkkeltall på tvers av sider ved review.

## Undermønster: BTC-estimat og "1 BTC = ..." må bruke NOK

```tsx
const priceNok = prices["BTCUSDT"]?.price ?? usdtPriceToNok(63258);
<span>≈ {(Number(amount) / priceNok).toFixed(6)} BTC</span>
<span>1 BTC = {formatNOK(priceNok, { locale: "nb-NO", fractionDigits: 0 })}</span>
```

## Feilmønster: Fake chart-data som vises som reell pris

**Før (BUG):** `SparklineChart` genererte candlestick-data med `Math.random()` og viste tilfeldig NOK-pris.

**Fiks:** Erstatt med `PriceCard` som viser reell NOK-pris fra `usePrices()` og USDT-kurs via `nokPriceToUsdt(priceNok)`.

## Validering beløp ≤ 0

To-lags validering i OrderPanel:

```tsx
const amountNum = Number(amount);
const amountError = amountNum <= 0 ? "Beløpet må være større enn 0" : "";

if (amountNum <= 0) {
  setFeedback({ ok: false, msg: "Beløpet må være større enn 0" });
  return;
}
```

## Verifikasjon

1. `npx vitest run src/lib/market/__tests__/nok.test.ts`
2. `npx vitest run src/features/trading/__tests__/UnifiedTradeTerminal.prices.test.tsx`
3. `npx vitest run src/features/trading/__tests__/UnifiedTradeTerminal.validation.test.tsx`
4. `npm run lint`
