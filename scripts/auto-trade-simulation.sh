#!/bin/bash
# Auto-trading simulation for Klarpakke test users
set -e
cd /Users/taj/klarpakke

SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
SERVICE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | sed 's/.*=//' | tr -d '\n')

# Get current prices from Binance (USD)
BINANCE_DATA=$(curl -s 'https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22ETHUSDT%22,%22SOLUSDT%22%5D')
BTC_USD=$(echo "$BINANCE_DATA" | python3 -c "import sys,json;d=json.load(sys.stdin);print([x['price'] for x in d if x['symbol']=='BTCUSDT'][0])")
ETH_USD=$(echo "$BINANCE_DATA" | python3 -c "import sys,json;d=json.load(sys.stdin);print([x['price'] for x in d if x['symbol']=='ETHUSDT'][0])")
SOL_USD=$(echo "$BINANCE_DATA" | python3 -c "import sys,json;d=json.load(sys.stdin);print([x['price'] for x in d if x['symbol']=='SOLUSDT'][0])")

NOK_RATE=9.6
BTC_NOK=$(python3 -c "print(round(float($BTC_USD) * $NOK_RATE, 2))")
ETH_NOK=$(python3 -c "print(round(float($ETH_USD) * $NOK_RATE, 2))")
SOL_NOK=$(python3 -c "print(round(float($SOL_USD) * $NOK_RATE, 2))")

echo "Prices: BTC=${BTC_NOK} NOK, ETH=${ETH_NOK} NOK, SOL=${SOL_NOK} NOK"

# 10 active test users
USER_IDS=(
  "eb292ddd-c3ee-45d0-be98-2ce6bd7f10a8"
  "241e1133-c895-4e64-a02f-447af4ea90b6"
  "db00be5b-2558-44fe-a5e3-b3af5f22c3bc"
  "ded5288d-c979-48f7-943b-360c6dd0ed40"
  "814b8c67-1534-4a47-8c66-40a3f80870cd"
  "165b894d-f747-4c1a-8ca1-1e9e2df0925a"
  "832bf495-487d-44a2-8ace-67580e6a851c"
  "1a40e4f1-332f-4451-86f6-0f258f08ed9c"
  "f4d68672-d994-4d4b-855a-36f39c71d09d"
  "1016b26e-f165-4046-a356-a1146bc98af9"
)

pair_price_nok() {
  case "$1" in
    BTCUSDT) echo "$BTC_NOK" ;;
    ETHUSDT) echo "$ETH_NOK" ;;
    SOLUSDT) echo "$SOL_NOK" ;;
  esac
}

TOTAL_TRADES=0
TOTAL_WINS=0
TOTAL_LOSSES=0

for USER_ID in "${USER_IDS[@]}"; do
  NUM_TRADES=$(( RANDOM % 2 + 1 ))
  
  for (( t=1; t<=NUM_TRADES; t++ )); do
    PAIRS_ARRAY=("BTCUSDT" "ETHUSDT" "SOLUSDT")
    PAIR=${PAIRS_ARRAY[$(( RANDOM % 3 ))]}
    BASE_NOK=$(pair_price_nok "$PAIR")
    
    # 60% sell bias (profit-taking)
    if [ $(( RANDOM % 10 )) -lt 6 ]; then
      SIDE="sell"
    else
      SIDE="buy"
    fi
    
    PRICE=$(python3 -c "import random; print(round($BASE_NOK * (1 + random.uniform(-0.015, 0.015)), 2))" 2>/dev/null)
    [ -z "$PRICE" ] && PRICE=$BASE_NOK
    
    case "$PAIR" in
      BTCUSDT) QTY=$(python3 -c "import random; print(round(random.uniform(0.001, 0.05), 6))" 2>/dev/null || echo "0.01" ;;
      ETHUSDT) QTY=$(python3 -c "import random; print(round(random.uniform(0.01, 2.0), 6))" 2>/dev/null || echo "0.5" ;;
      SOLUSDT) QTY=$(python3 -c "import random; print(round(random.uniform(0.1, 30.0), 4))" 2>/dev/null || echo "5.0" ;;
    esac
    
    TOTAL_VAL=$(python3 -c "print(round($PRICE * $QTY, 2))" 2>/dev/null)
    FEE=$(python3 -c "print(round($TOTAL_VAL * 0.002, 2))" 2>/dev/null)
    
    if [ "$SIDE" = "sell" ]; then
      if [ $(( RANDOM % 10 )) -lt 4 ]; then
        PNL_PCT=$(python3 -c "import random; print(round(random.uniform(0.5, 8.0), 2))" 2>/dev/null || echo "2.5")
        PNL=$(python3 -c "print(round($TOTAL_VAL * $PNL_PCT/100, 2))" 2>/dev/null)
        TOTAL_WINS=$((TOTAL_WINS + 1))
      else
        PNL_PCT=$(python3 -c "import random; print(round(random.uniform(-12.0, -0.5), 2))" 2>/dev/null || echo "-3.0")
        PNL=$(python3 -c "print(round($TOTAL_VAL * $PNL_PCT/100, 2))" 2>/dev/null)
        TOTAL_LOSSES=$((TOTAL_LOSSES + 1))
      fi
    else
      PNL="null"
    fi
    
    IDEM_KEY=$(python3 -c "import uuid; print(str(uuid.uuid4()))" 2>/dev/null)
    NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%S.%3N+00:00")
    
    # Build JSON properly
    if [ "$PNL" = "null" ]; then
      PNL_FIELD="null"
    else
      PNL_FIELD=$PNL
    fi
    
    JSON="{\"user_id\":\"${USER_ID}\",\"trading_pair\":\"${PAIR}\",\"side\":\"${SIDE}\",\"order_type\":\"market\",\"quantity\":${QTY},\"price\":${PRICE},\"total_value\":${TOTAL_VAL},\"fee\":${FEE},\"status\":\"filled\",\"mode\":\"paper\",\"idempotency_key\":\"${IDEM_KEY}\",\"executed_at\":\"${NOW_ISO}\",\"created_at\":\"${NOW_ISO}\",\"is_mock\":true,\"usdt_nok_rate\":${NOK_RATE},\"realized_pnl\":${PNL_FIELD}}"
    
    curl -s -X POST "$SUPABASE_URL/rest/v1/trades" \
      -H "apikey: $SERVICE_KEY" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$JSON" > /dev/null 2>&1
    
    echo "Trade: ${USER_ID:0:8}... ${SIDE} ${QTY} ${PAIR} @ ${PRICE} NOK (total=${TOTAL_VAL}, pnl=${PNL})"
    TOTAL_TRADES=$((TOTAL_TRADES + 1))
    sleep 0.05
  done
done

echo ""
echo "=== Auto-trading complete ==="
echo "Total trades: $TOTAL_TRADES"
echo "Profitable: $TOTAL_WINS"
echo "Loss-making: $TOTAL_LOSSES"
