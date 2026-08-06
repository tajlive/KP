# Coin Price Update Cron — fullt debugging-transcript

Opprettet: 2026-07-28
Prod-script: `/Users/taj/klarpakke/scripts/update-coin-prices.sh`
Cron-script: `~/.hermes/scripts/update-coin-prices.sh` (kopi)
Cron job ID: `ff92ffffb27c` (i `~/.hermes/cron/jobs.json`)
Schedule: every 5 min, no-agent mode

## coin_prices tabellskjema

```sql
CREATE TABLE IF NOT EXISTS coin_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL UNIQUE,          -- f.eks. 'BTCUSDT'
  name TEXT NOT NULL,                    -- f.eks. 'BTC'
  price DECIMAL(24,8) NOT NULL DEFAULT 0,
  price_change_24h DECIMAL(24,8),
  price_change_percent_24h DECIMAL(10,4),
  volume_24h DECIMAL(24,8),
  market_cap DECIMAL(24,2),
  high_24h DECIMAL(24,8),
  low_24h DECIMAL(24,8),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coin_prices_symbol ON coin_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_coin_prices_updated ON coin_prices(last_updated DESC);
```

RLS: Kun `service_role` kan skrive (policy `coin_prices_write_service`).

## Seed-data

```sql
INSERT INTO coin_prices (symbol, name, price) VALUES
  ('BTCUSDT', 'BTC', 0), ('ETHUSDT', 'ETH', 0),
  ('BNBUSDT', 'BNB', 0), ('SOLUSDT', 'SOL', 0),
  ('XRPUSDT', 'XRP', 0), ('ADAUSDT', 'ADA', 0),
  ('DOGEUSDT', 'DOGE', 0), ('AVAXUSDT', 'AVAX', 0),
  ('DOTUSDT', 'DOT', 0), ('MATICUSDT', 'MATIC', 0)
ON CONFLICT (symbol) DO NOTHING;
```

## Proxy API-kall

**Endpoint:** `POST https://pskhryjzkobytnfwucrb.supabase.co/functions/v1/binance-proxy`

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <NEXT_PUBLIC_SUPABASE_ANON_KEY>`
- `x-binance-proxy-secret: <BINANCE_PROXY_SECRET>`
- `apikey: <NEXT_PUBLIC_SUPABASE_ANON_KEY>`

**Body:**
```json
{"action":"publicApi","publicApiPath":"/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C...%22%5D"}
```

**Response (ok=true):**
```json
{"ok":true,"status":200,"data":[{"symbol":"BTCUSDT","priceChange":"-328.38000000","priceChangePercent":"-0.511","lastPrice":"63886.37000000","highPrice":"64280.42000000","lowPrice":"62742.47000000","volume":"14598.27921000"},...]}
```

## Debugging-transcript

### Problem 1: Proxy returnerte "All public API endpoints failed"

**Årsak:** Python `json.dumps()` legger til mellomrom etter komma som standard (pretty-print).
`["BTCUSDT", "ETHUSDT", ...]` blir URI-encodet som `%5B%22BTCUSDT%22%2C%20%22ETHUSDT%22...`
(stjeler et `%20`-mellomrom). Binance API forkaster denne som ugyldig.

**Fiks:**
```python
json.dumps(data, separators=(',', ':'))  # Kompakt — ingen mellomrom
```

### Problem 2: Supabase upsert returnerte HTTP 409

**Årsak:** `coin_prices` har `UNIQUE (symbol)` men `PRIMARY KEY (id)`. POST uten
`?on_conflict=symbol` prøver å INSERTe ny rad, men `symbol`-kolonnen har UNIQUE →
PG kaster `duplicate key value violates unique constraint "coin_prices_symbol_key"`.

`Prefer: resolution=merge-duplicates` alene ER IKKE NOK — må kombineres med
`?on_conflict=<kolonne>` i URL.

**Fiks:**
```
POST /rest/v1/coin_prices?on_conflict=symbol
Prefer: resolution=merge-duplicates
```

### Problem 3: Python nested quotes i f-string (exit code 1)

**Symptom:** Scriptet kjører, printer alt, men avslutter med `EXIT_CODE=1`.
Ingen synlig feilmelding.

**Årsak:** Inni en shell `python3 -c "..."` (double quotes) brukte koden:
```python
print(f'{'Symbol':<10} {'Navn':<6} ...')
```
Python kan ikke skille de indre enkle anførselstegnene fra f-string-delimiteren →
syntax error som er slukt av `2>/dev/null`.

**Fiks:** Bruk `.format()` i stedet:
```python
print('{:<10} {:<6} {:>15,.2f} {}'.format(r['symbol'], r['name'], float(r['price']), ...))
```

### Problem 4: `hermes cron create` feilet

**Årsak:** `No module named 'urllib3.exceptions'` — en Python-avhengighet mangler i
miljøet der Hermes CLI kjører. Vi har `urllib3` installert men kanskje feil version.

**Fiks:** Legg jobben manuelt i `~/.hermes/cron/jobs.json`:
```bash
python3 -c "
import json
with open('/Users/taj/.hermes/cron/jobs.json') as f:
    data = json.load(f)
data['jobs'].append({
    'id': '<uuid>',
    'name': 'update-coin-prices',
    'script': 'update-coin-prices.sh',
    'mode': 'no-agent',
    'schedule': {'kind': 'interval', 'minutes': 5, 'display': 'every 5m'},
    'workdir': '/Users/taj/klarpakke',
    'enabled_toolsets': ['terminal', 'file'],
    'status': 'active',
})
with open('/Users/taj/.hermes/cron/jobs.json', 'w') as f:
    json.dump(data, f, indent=2)
"
```

## Verifisert output (2026-07-28)

```
=== Coin Price Update 2026-07-28T22:43:03Z ===
Symbols: BTCUSDT ETHUSDT SOLUSDT BNBUSDT XRPUSDT ADAUSDT DOGEUSDT AVAXUSDT DOTUSDT MATICUSDT
Parsed 10 records fra Binance proxy

=== Oppsummering ===
Priser oppdatert: 10
Verifisert i DB: 20 rader

Symbol     Navn   Pris (NOK)      Sist oppdatert
-------------------------------------------------------
ADAUSDT    ADA               1.56  2026-07-28T22:43:03
AVAXUSDT   AVAX             63.08  2026-07-28T22:43:03
BNBUSDT    BNB           5,477.80  2026-07-28T22:43:03
BTCUSDT    BTC         614,006.06  2026-07-28T22:43:03
DOGEUSDT   DOGE              0.68  2026-07-28T22:43:03
DOTUSDT    DOT               7.34  2026-07-28T22:43:03
ETHUSDT    ETH          18,429.48  2026-07-28T22:43:03
MATICUSDT  MATIC             3.65  2026-07-28T22:43:03
SOLUSDT    SOL             709.41  2026-07-28T22:43:03
XRPUSDT    XRP              10.25  2026-07-28T22:43:03

=== OK ===
EXIT_CODE=0
```

NB: DB har 20 rader fordi det også finnes legacy-rader med symbol uten USDT-suffix
(f.eks. `'BTC'`, `'ETH'`) fra en tidligere datakilde. Disse røres ikke av upserten
som matcher på `symbol`-kolonnen.
