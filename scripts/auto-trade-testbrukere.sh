#!/bin/bash
# Auto-trading for 10 norske testbrukere
# Genererer 1-2 handler per bruker på BTC, ETH, SOL

set -e

cd "$(dirname "$0")/.."

SERVICE_KEY=$(grep 'SUPABASE_SERVICE_ROLE_KEY' .env.local | sed 's/SUPABASE_SERVICE_ROLE_KEY=//' | sed 's/[" ]//g')
SUPABASE_URL=$(grep 'NEXT_PUBLIC_SUPABASE_URL' .env.local | sed 's/NEXT_PUBLIC_SUPABASE_URL=//' | sed 's/[" ]//g')

BTC_USD=63177
ETH_USD=1877
SOL_USD=72.84
USDT_NOK=9.66

BTC_NOK=$(python3 -c "print(int($BTC_USD * $USDT_NOK))")
ETH_NOK=$(python3 -c "print(int($ETH_USD * $USDT_NOK))")
SOL_NOK=$(python3 -c "print(int($SOL_USD * $USDT_NOK))")

echo "Priser (NOK): BTC=$BTC_NOK ETH=$ETH_NOK SOL=$SOL_NOK"
echo ""

# userId|balance
USERS=(
  "241e1133-c895-4e64-a02f-447af4ea90b6|106294"
  "3cffa10f-af2b-42fc-a52c-3aea866a997f|105392"
  "5dd5a801-bd90-4f39-bd1d-3643866fcc35|105159"
  "d4480fda-6c67-4e77-b4a3-ad4b7d00f652|103975"
  "165b894d-f747-4c1a-8ca1-1e9e2df0925a|99736"
  "4cf6a791-e1c7-4ecf-a8f2-3c0d11eeecff|93991"
  "10de2b9b-62c3-43a0-8d83-c1e38aecba5d|93890"
  "1a15c6d2-a460-4ace-9ec6-03d6a075e2b3|91175"
  "4d5f00cd-5020-4f2e-9faf-77f8520f8948|110336"
  "a6b6f8c6-dcf6-4975-9577-4dd6c78468ee|76598"
)

# Generer UUID v4 (enkel versjon uten ekstern avhengighet)
gen_uuid() {
  local N=$(python3 -c "import uuid; print(uuid.uuid4())")
  echo "$N"
}

generate_trades() {
  local USER_ID="$1"
  local BALANCE="$2"
  local TRADES=$(( (RANDOM % 2) + 1 ))

  for ((t=0; t<TRADES; t++)); do
    # Coin selection
    local COIN_ROLL=$(( RANDOM % 100 ))
    local TICKER USD_PRICE NOK_PRICE
    if [ $COIN_ROLL -lt 40 ]; then
      TICKER="BTCUSDT"; USD_PRICE=$BTC_USD; NOK_PRICE=$BTC_NOK
    elif [ $COIN_ROLL -lt 75 ]; then
      TICKER="ETHUSDT"; USD_PRICE=$ETH_USD; NOK_PRICE=$ETH_NOK
    else
      TICKER="SOLUSDT"; USD_PRICE=$SOL_USD; NOK_PRICE=$SOL_NOK
    fi

    local SIDE="buy"
    [ $(( RANDOM % 100 )) -ge 55 ] && SIDE="sell"

    # Prisavvik ±1%
    local DEVIATION=$(python3 -c "print(($RANDOM % 200 - 100) / 10000)")
    local TRADE_PRICE_NOK=$(python3 -c "print(round($NOK_PRICE * (1 + $DEVIATION), 2))")
    local TRADE_PRICE_USDT=$(python3 -c "print(round($USD_PRICE * (1 + $DEVIATION), 2))")

    local PCT=$(python3 -c "print(3 + ($RANDOM % 10))")
    local RAW_VAL=$(python3 -c "print(int($BALANCE * $PCT / 100))")
    local TRADE_VALUE_NOK=$(python3 -c "print(max(500, (int($RAW_VAL / 500)) * 500))")

    local QTY=$(python3 -c "print($TRADE_VALUE_NOK / $TRADE_PRICE_NOK)")
    local FEE_NOK=$(python3 -c "print(round($TRADE_VALUE_NOK * 0.001, 2))")
    local FEE_USDT=$(python3 -c "print($FEE_NOK / $USDT_NOK)")
    local TOTAL_USDT=$(python3 -c "print($TRADE_VALUE_NOK / $USDT_NOK)")

    local PNL="null"
    if [ "$SIDE" = "sell" ]; then
      local PNL_PCT=$(python3 -c "print(($RANDOM % 1300 - 500) / 100)")
      PNL=$(python3 -c "print(round($TRADE_VALUE_NOK * $PNL_PCT / 100, 2))")
    fi

    local TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000000+00:00")
    local TRADE_UUID=$(gen_uuid)
    local ID_KEY=$(echo -n "${TRADE_UUID}" | md5 2>/dev/null || echo -n "${TRADE_UUID}" | md5sum | cut -c1-40)

    local VENUE="binance"
    [ $(( RANDOM % 10 )) -lt 3 ] && VENUE="simulation"

    # Build JSON — careful with null/empty PNL
    local PNL_JSON="null"
    [ "$PNL" != "null" ] && PNL_JSON=$PNL

    # Use python3 to generate valid JSON (avoid shell quoting issues)
    local JSON_DATA=$(python3 -c "
import json
data = {
    'id': '${TRADE_UUID}',
    'user_id': '${USER_ID}',
    'idempotency_key': '${ID_KEY}',
    'mode': 'paper',
    'trading_pair': '${TICKER}',
    'side': '${SIDE}',
    'order_type': 'market',
    'quantity': ${QTY},
    'price': ${TRADE_PRICE_USDT},
    'total_value': ${TOTAL_USDT},
    'fee': ${FEE_USDT},
    'status': 'filled',
    'executed_at': '${TIMESTAMP}',
    'created_at': '${TIMESTAMP}',
    'venue': '${VENUE}',
    'filled_quantity': ${QTY},
    'idempotency_scope': 'trade',
    'usdt_nok_rate': ${USDT_NOK},
    'joker_trade': False,
    'is_mock': False
}
if ${PNL:-null} != 'null':
    data['realized_pnl'] = ${PNL}
print(json.dumps(data))
" 2>/dev/null)

    echo "  → ${TICKER} ${SIDE}  qty=$(python3 -c "print(round($QTY, 4))") @ $(python3 -c "print(round($TRADE_PRICE_USDT))")USDT  val=$(python3 -c "print(round($TOTAL_USDT))")USDT  pnl=${PNL}"

    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
      -H "apikey: ${SERVICE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "${JSON_DATA}" \
      "${SUPABASE_URL}/rest/v1/trades" 2>/dev/null)

    HTTP_CODE=$(echo "$RESPONSE" | tail -1)

    if [ "$HTTP_CODE" = "201" ]; then
      local NEW_BALANCE=""
      if [ "$SIDE" = "buy" ]; then
        NEW_BALANCE=$(python3 -c "print($BALANCE - $TRADE_VALUE_NOK - $FEE_NOK)")
      else
        local PNL_VAL=0
        [ "$PNL" != "null" ] && PNL_VAL=$PNL
        NEW_BALANCE=$(python3 -c "print($BALANCE + $TRADE_VALUE_NOK - $FEE_NOK + $PNL_VAL)")
      fi

      curl -s -X PATCH \
        -H "apikey: ${SERVICE_KEY}" \
        -H "Authorization: Bearer ${SERVICE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"current_balance\": ${NEW_BALANCE}, \"updated_at\": \"${TIMESTAMP}\"}" \
        "${SUPABASE_URL}/rest/v1/paper_accounts?user_id=eq.${USER_ID}" > /dev/null 2>/dev/null

      BAL_INT=$(python3 -c "print(int($BALANCE))")
      NEW_INT=$(python3 -c "print(int($NEW_BALANCE))")
      echo "    ✅ Balance: ${BAL_INT} → ${NEW_INT} NOK"
    elif [ "$HTTP_CODE" = "409" ]; then
      echo "    ⏭️  Duplicate (idempotency key already exists)"
    else
      echo "    ❌ HTTP ${HTTP_CODE}"
      echo "    Response: $(echo "$RESPONSE" | head -1 | cut -c1-100)"
    fi

    sleep 0.2
  done
}

COUNT=0
for ENTRY in "${USERS[@]}"; do
  UID_VAL="${ENTRY%%|*}"
  BAL="${ENTRY##*|}"
  COUNT=$((COUNT + 1))
  BAL_INT=$(python3 -c "print(int($BAL))")
  echo "[${COUNT}/10] ${UID_VAL:0:12}... (bal=${BAL_INT})"
  generate_trades "$UID_VAL" "$BAL"
  echo ""
done

echo "=== 🎲 Auto-trading fullført ==="
