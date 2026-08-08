# OKX-integrasjonsplan — Klarpakke (Børs #2, kontrakt-parity med Kraken)

> Status: Plan — ingen kode endret ennå. Dato: 2026-08-08.
> Mål: OKX som børs #2 med **samme kontrakt-parity-standard som Kraken-skruben**:
> lekepenger og live deler trade-engine, samme fee-regnskap, samme symbol-normalisering, samme gates.
> Forutsetning: OKX Broker-søknad godkjent (se `okx-broker-soknad-2026-08-08.md`) — rebate krever brokerCode.

---

## 0. Prinsipp (arvet fra 2026-08-08-mandatet)

> «LEKEPENGER OG LIVE SKAL BRUKE SAMME TRADE ENGINE — ellers er det ikke fakta.»
> «KUN Kraken som tallkilde» gjelder frem til OKX er integrert; OKX blir deretter **andre** kilde,
> aldri erstatning — Kraken forblir primær (høyest inntekt per krone + allerede verifisert).

**Arkitekturkrav:** ALLE børs-spesifikke detaljer isoleres bak `canonical/`-laget.
Ingen OKX-strenger i strategier, gates, UI-tekster eller P&L — kun i børs-adaptere + brokerCode-tag.

---

## 1. DB — `user_okx_keys` (speil av `user_kraken_keys`)

Migrasjon `create_user_okx_keys`:

```sql
create table if not exists public.user_okx_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  api_key_encrypted text not null,
  api_secret_encrypted text not null,
  passphrase_encrypted text not null,          -- OKX krever passphrase i tillegg til key/secret!
  broker_code text,                            -- OKX brokerCode for rebate-tagging
  is_active boolean not null default true,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists user_okx_keys_user_active_idx
  on public.user_okx_keys(user_id) where is_active;
```

- **Viktig forskjell fra Kraken:** OKX V5 krever 3 hemmeligheter (apiKey, secretKey, **passphrase**).
- Kryptering: samme helper som `decryptApiKey` (se `kraken-executor.ts` fromUser) — flytt til felles `lib/trading/keys.ts`.
- RLS: eier kan lese egne, service-role alt (samme mønster som `user_kraken_keys`).
- `broker_code` fylles fra OKX-broker-dashbordet etter onboarding; alle ordrer sender `tag: brokerCode`.

---

## 2. Symbol-normalisering — `canonical/symbols/registry.ts` + OKX-adapter

Interne symboler (SSoT, uendret): `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, … (USDT-norm KUN lokalt per tick).

Ny mapping i `src/lib/trading/canonical/market-data/okx-provider.ts`:

```ts
// OKX bruker «BTC-USDT» (bindestrek) — motsatt av Kraken som bruker «XBTUSDC».
const INTERNAL_TO_OKX: Record<string, string> = {
  BTCUSDT: "BTC-USDT",
  ETHUSDT: "ETH-USDT",
  SOLUSDT: "SOL-USDT",
  AVAXUSDT: "AVAX-USDT",
  DOGEUSDT: "DOGE-USDT",
  LINKUSDT: "LINK-USDT",
  ADAUSDT: "ADA-USDT",
  DOTUSDT: "DOT-USDT",
  POLUSDT: "POL-USDT",
  // MATIC er migrert til POL også på OKX.
  MATICUSDT: "POL-USDT",
};
```

- OKX har INGEN XBT/XETH-prefiks-felle — BTC er «BTC». Enklere enn Kraken.
- USDT er fortsatt lovlig på OKX EEA (OKX tilbyr USDT-par; USDC også). **Kontrakt-parity-krav:**
  hvis Kraken-kjøringene bruker USDC-kvote, må OKX-adapteren kunne kjøre USDC-par (`BTC-USDC`).
  Avgjøres i Fase 2 (se §9 — «Kvote-valg»).

---

## 3. Market-data — `okx-provider.ts` (speil av kraken-provider)

- Base: `https://www.okx.com/api/v5/market`
- Ticker: `GET /api/v5/market/ticker?instId=BTC-USDT` → `data[0].last`
- OHLC: `GET /api/v5/market/candles?instId=…&bar=15m/1H/4H`
- Feilhåndtering: OKX feilkoder er numeriske (`code: "0"` = ok, `"51000"`+ = feil) — egen `OkxApiError`.
- Rate-limit: OKX IP-basert, ~20 req/2s for ticker — langt rausere enn Kraken, men bygg egen
  `OkxLockoutError`-klasse + backoff for konsistens (samme mønster som `KrakenLockoutError`).
- `getPrice`/`getOHLCV` implementerer `MarketDataProvider`-grensesnittet — ingen endring i kallere.

---

## 4. Executor — `okx-executor.ts` (speil av kraken-executor)

- `OkxExecutor.fromUser(supabase, userId)` — leser `user_okx_keys`, dekrypterer, returnerer null hvis ingen.
- `executeOrder(params)`:
  - `POST /api/v5/trade/order` med `{ instId, tdMode: "cash", side, ordType: "market"|"limit", sz, px?, tag: brokerCode }`
  - HMAC-SHA256-signering (OKX: `sign = base64(hmac_sha256(timestamp + method + requestPath + body, secret))`,
    header `x-simulated-trading: 1` for testnet/sandbox).
- **Fee:** OKX EEA Regular-tier = 0,08 % maker / 0,10 % taker (2026-08-tall, okx.com/fees).
  `fill-constants.ts` får `OKX_FEE_CONFIG = { maker: 0.0008, taker: 0.001 }`.
- Returnerer samme `OrderResult`-kontrakt — P&L, TCA og backtest er uendret.

---

## 5. Factory + gates — `executor-factory.ts` + `mode/route.ts`

```ts
// executor-factory.ts (utvidelse — paper først, deretter Kraken, deretter OKX)
if (mode === "paper") return new PaperExecutor(...);
const kraken = await KrakenExecutor.fromUser(supabase, userId);
if (kraken) return kraken;
const okx = await OkxExecutor.fromUser(supabase, userId);
if (okx) return okx;
throw new Error("Ingen børs-konto koblet (Kraken eller OKX)");
```

- **Kraken har prioritet** (primær børs). OKX brukes kun hvis brukeren ikke har Kraken.
- `mode/route.ts` gates: legg til `okxConnected` + `KRAKEN_NOT_CONNECTED`-lignende
  `OKX_NOT_CONNECTED` — men UI viser **én** samlet «Børs tilkoblet?»-tilstand
  (tom-krav: ikke forvirre nybegynnere med to børs-avhengige meldinger).
- Ny rute: `POST /api/kraken/keys` → generisk `POST /api/exchange/keys` (valgfri refactor — se §9).

---

## 6. Tester (parity-suite, speil av Kraken-testene)

| Test | Innhold |
|---|---|
| `okx-provider.test.ts` | Symbol-mapping (BTCUSDT→BTC-USDT), feilkoder, rate-limit-lockout |
| `okx-executor.test.ts` | Signering, ordre-request-shape, fee-parity (0,10 % taker) |
| `executor-factory.test.ts` | Kraken-prioritet, OKX-fallback, ingen-nøkler → error |
| `order-executor-contract-parity.test.ts` | Utvid: OKX-resultat = samme kontrakt som Kraken (17/17-parity) |
| `fill-constants.test.ts` | `OKX_FEE_CONFIG` tilstede og riktig |
| `mode-route.test.ts` | Gates: okxConnected true/false, OKX_NOT_CONNECTED-feilkode |

**Pitfall fra Kraken-skruben:** `binance`-strenger lekket inn i tester. For OKX:
- I tester brukes ALLTID `createOkxMarketDataProvider`-mock, aldri duplisert inline.
- Ingen «okx» i strategier/gates/UI — kun adaptere + tester.

---

## 7. i18n + UI

- **Ingen OKX-merkevare i UI-tekster.** Brukeren ser «Koblet til børs» — ikke «OKX».
  (Unntak: ConnectOKXModal som forklarer hva brukeren må gjøre på OKX-siden.)
- ConnectOKXModal: 3 steg (lag konto på OKX → generer API-nøkkel med passphrase → lim inn 3 felt).
- Feilmeldinger: «Børsen svarer ikke» — aldri tekniske OKX-koder for sluttbrukere.
- i18n: nøkler `connect.okx.*` på no/en/zh/th (zh testes i i18n-keys.spec; th er pre-eksisterende mangelfull).

---

## 8. Faser (hver fase = commit + CI-grønn + prod-verifisering)

| Fase | Innhold | Verifisering |
|---|---|---|
| **0** | Broker-søknad godkjent; få `client_id`/`client_secret` + brokerCode | OKX-e-post |
| **1** | `user_okx_keys`-migrasjon + types-regenerering | tsc 0, `generate_typescript_types` |
| **2** | `okx-provider.ts` (ticker/OHLC) + mapping + tester | vitest grønn; curl mot OKX-public |
| **3** | `okx-executor.ts` + `fill-constants` OKX_FEE_CONFIG + `executor-factory`-utvidelse | vitest grønn; contract-parity 17/17 |
| **4** | Gates (`mode/route.ts`), ConnectOKXModal, i18n | lint 0, i18n-keys 10/10 |
| **5** | Testbruker: koble OKX-nøkler → lekepenger-handel (paper) | prod-verifisert med curl + DB-sjekk |
| **6** | BrokerCode-tag på ordrer; rebate-kvittering via `GET /api/v5/broker/fd/if-rebate` | rebate synlig i OKX-dashbord |

**Kill switch:** `OKX_ENABLED` env-var (default off) — OKX eksponeres ikke for brukere før Fase 5 er grønn.

---

## 9. Åpne beslutninger (krever Tom)

1. **Kvote:** USDT eller USDC-par på OKX? (Kraken-kjøringen bruker USDC-kvote; OKX støtter begge.)
   - Anbefaling: **USDT internt, USDC på OKX-kontoen** for å matche Kraken-kontrakten — men USDC-par har
     lavere likviditet på OKX. Må testes i Fase 2.
2. **Børs-valg i ConnectModal:** radio «Kraken (anbefalt)» / «OKX (lavere gebyr)» — eller bare OKX som
   fallback når Kraken ikke er koblet? (Anbefaling: kun vis OKX-alternativet hvis Kraken mangler —
   én primær børs per bruker, ingen forvirring.)
3. **Broker-rebate til brukeren:** start med 0 % klient-rebate, innfør `clientRebateRatio` 10–20 %
   senere som konkurransefortrinn?
4. **Kraken fee Tier 3:** parallelt — flytt Klarpakke-volum til ett sted for å nå $20K+ AoP → 0,38 % taker
   på Kraken (uavhengig av OKX).

---

## 10. Kilder

- OKX V5 Broker-docs: https://www.okx.com/docs-v5/broker_en
- OKX broker-regler (5. aug 2026): https://www.okx.com/help/introduction-of-rules-on-okx-brokers
- OKX EEA-fees: https://www.okx.com/help/what-are-the-new-trading-fees-for-eea-users (Regular 0,08/0,10 %)
- Kraken fee-tier (9. jul 2026): https://support.kraken.com/articles/cross-platform-fee-tier-changes
