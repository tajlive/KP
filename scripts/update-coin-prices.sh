#!/bin/bash
# Update coin_prices table via Binance proxy
# Called by Hermes cron every 5 minutes
# Kaller Supabase Edge Function binance-proxy for sanntidspriser
# Upserter til coin_prices-tabellen via Supabase REST API
set -euo pipefail

cd /Users/taj/klarpakke

# === Konfigurasjon ===
SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
PROXY_ENDPOINT="${SUPABASE_URL}/functions/v1/binance-proxy"
REST_ENDPOINT="${SUPABASE_URL}/rest/v1/coin_prices"

USDT_NOK_RATE="9.61"

SYMBOLS=("BTCUSDT" "ETHUSDT" "SOLUSDT" "BNBUSDT" "XRPUSDT" "ADAUSDT" "DOGEUSDT" "AVAXUSDT" "DOTUSDT" "POLUSDT" "UNIUSDT" "LINKUSDT")

# === Hent secrets fra .env.local ===
BINANCE_PROXY_SECRET=$(grep '^BINANCE_PROXY_SECRET=' .env.local | sed 's/^BINANCE_PROXY_SECRET=//' | tr -d '\n')
SUPABASE_SERVICE_ROLE_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env.local | sed 's/^SUPABASE_SERVICE_ROLE_KEY=//' | tr -d '\n')
SUPABASE_ANON_KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | sed 's/^NEXT_PUBLIC_SUPABASE_ANON_KEY=//' | tr -d '\n')

if [ -z "$BINANCE_PROXY_SECRET" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "ERROR: Mangler secrets i .env.local (BINANCE_PROXY_SECRET eller SUPABASE_SERVICE_ROLE_KEY)"
  exit 1
fi

if [ -z "$SUPABASE_ANON_KEY" ]; then
  echo "ERROR: Mangler NEXT_PUBLIC_SUPABASE_ANON_KEY i .env.local"
  exit 1
fi

echo "=== Coin Price Update $(date -u +'%Y-%m-%dT%H:%M:%SZ') ==="

# === Bygg symbol-array for proxy ===
# Binance /api/v3/ticker/24hr tar symbols som JSON-encoded array
SYMBOLS_JSON=$(printf '%s\n' "${SYMBOLS[@]}" | python3 -c "import sys,json; print(json.dumps([l.strip() for l in sys.stdin if l.strip()], separators=(',',':')))" 2>/dev/null)
if [ -z "$SYMBOLS_JSON" ]; then
  SYMBOLS_JSON='["BTCUSDT","ETHUSDT","SOLUSDT","BNBUSDT","XRPUSDT","ADAUSDT","DOGEUSDT","AVAXUSDT","DOTUSDT","POLUSDT","UNIUSDT","LINKUSDT"]'
fi
ENCODED_SYMBOLS=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$SYMBOLS_JSON'))")

echo "Symbols: ${SYMBOLS[*]}"

# === Hent ticker-data via Binance proxy ===
PROXY_RESPONSE=$(curl -s --max-time 20 --retry 2 --retry-delay 2 \
  -X POST "$PROXY_ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "x-binance-proxy-secret: $BINANCE_PROXY_SECRET" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d "{\"action\":\"publicApi\",\"publicApiPath\":\"/api/v3/ticker/24hr?symbols=${ENCODED_SYMBOLS}\"}")

# === Valider proxy-respons ===
PROXY_OK=$(echo "$PROXY_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('ok') else 'false')" 2>/dev/null || echo "false")

if [ "$PROXY_OK" != "true" ]; then
  echo "ERROR: Binance proxy feilet"
  echo "Response: $PROXY_RESPONSE" | head -c 500
  exit 1
fi

# === Parser ticker-data og bygg upsert JSON ===
NOW_ISO=$(python3 -c "from datetime import datetime, timezone; print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + '+00:00')")

UPSERT_JSON=$(echo "$PROXY_RESPONSE" | python3 -c "
import sys, json

NOK_RATE = float('${USDT_NOK_RATE}')

data = json.load(sys.stdin)
tickers = data.get('data', [])

records = []
for t in tickers:
    symbol = t['symbol']
    name = symbol.replace('USDT', '')
    last_price = float(t.get('lastPrice', 0))
    price_change = float(t.get('priceChange', 0))
    price_change_pct = float(t.get('priceChangePercent', 0))
    volume = float(t.get('volume', 0))
    high_price = float(t.get('highPrice', 0))
    low_price = float(t.get('lowPrice', 0))
    
    records.append({
        'symbol': symbol,
        'name': name,
        'price': round(last_price * NOK_RATE, 2),
        'price_change_24h': round(price_change * NOK_RATE, 2),
        'price_change_percent_24h': round(price_change_pct, 4),
        'volume_24h': round(volume, 2),
        'high_24h': round(high_price * NOK_RATE, 2),
        'low_24h': round(low_price * NOK_RATE, 2),
        'last_updated': '${NOW_ISO}',
    })

print(json.dumps(records))
" 2>/dev/null)

RECORD_COUNT=$(echo "$UPSERT_JSON" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

if [ "$RECORD_COUNT" -lt 10 ]; then
  echo "ERROR: Forventet 10 records, fikk $RECORD_COUNT"
  echo "UPSERT_JSON: $UPSERT_JSON" | head -c 500
  exit 1
fi

echo "Parsed $RECORD_COUNT records fra Binance proxy"

# === Upsert til coin_prices via Supabase REST API ===
UPSERT_BODY_FILE=$(mktemp)
trap 'rm -f "$UPSERT_BODY_FILE"' EXIT

HTTP_STATUS=$(curl -s --max-time 20 --retry 2 --retry-delay 2 \
  -o "$UPSERT_BODY_FILE" \
  -w "%{http_code}" \
  -X POST "${REST_ENDPOINT}?on_conflict=symbol" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$UPSERT_JSON" 2>&1)

UPSERT_RESULT=$(cat "$UPSERT_BODY_FILE" 2>/dev/null || true)

if [ "$HTTP_STATUS" != "200" ] && [ "$HTTP_STATUS" != "201" ]; then
  echo "ERROR: Supabase upsert feilet med HTTP $HTTP_STATUS"
  echo "$UPSERT_RESULT" | head -c 500
  exit 1
fi

rm -f "$UPSERT_BODY_FILE"
trap - EXIT

# === Verifiser ved å lese tilbake ===
VERIFY_DATA=$(curl -s --max-time 10 --retry 2 --retry-delay 2 \
  -X GET "${REST_ENDPOINT}?select=symbol,name,price,last_updated&order=name.asc" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_ANON_KEY")

VERIFY_COUNT=$(echo "$VERIFY_DATA" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")

echo ""
echo "=== Oppsummering ==="
echo "Tid: $NOW_ISO"
echo "Symboler: ${SYMBOLS[*]}"
echo "USDT→NOK: $USDT_NOK_RATE"
echo "Priser oppdatert: $RECORD_COUNT"
echo "Verifisert i DB: $VERIFY_COUNT rader"
echo ""

# Vis priser
echo "$VERIFY_DATA" | python3 -c "
import sys, json
records = json.load(sys.stdin)
print('{:<10} {:<6} {:<15} Sist oppdatert'.format('Symbol','Navn','Pris (NOK)'))
print('-' * 55)
for r in records:
    print('{:<10} {:<6} {:>15,.2f} {}'.format(r['symbol'], r['name'], float(r['price']), r['last_updated'][:19]))
" 2>/dev/null

echo ""
echo "=== OK ==="
