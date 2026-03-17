#!/usr/bin/env bash
# Full audit: dev-server → testbrukere → alle E2E (Allure) → Lighthouse → rapport.
# Bruk: bash scripts/full-audit.sh
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
MAX_WAIT=180
DEV_PID=""
E2E_EXIT=0
LH_EXIT=0

cleanup() {
  if [ -n "$DEV_PID" ]; then
    echo ""
    echo "🛑 Stopper dev-server (PID $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    if command -v lsof >/dev/null 2>&1; then
      lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
    fi
  fi
  echo ""
  echo "════════════════════════════════════════"
  echo "  OPPSUMMERING"
  echo "════════════════════════════════════════"
  echo "  E2E exit:        $E2E_EXIT"
  echo "  Lighthouse exit: $LH_EXIT"
  echo ""
  echo "  Allure:     npm run allure:open"
  echo "  Playwright: npx playwright show-report playwright-report"
  echo "  Lighthouse: se .lighthouseci/ (HTML-rapporter)"
  echo "════════════════════════════════════════"
  if [ "$E2E_EXIT" -ne 0 ] || [ "$LH_EXIT" -ne 0 ]; then
    exit 1
  fi
}
trap cleanup EXIT INT TERM

# ── 1. Testbrukere ──
echo "📋 1/5 Oppretter testbrukere..."
node scripts/create-test-users.js || echo "⚠️  Testbruker-script feilet (fortsetter)"
echo ""

# ── 2. Dev-server ──
echo "🚀 2/5 Sjekker dev-server på port $PORT..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null | grep -q 200; then
  echo "   Appen kjører allerede."
else
  echo "   Starter dev-server..."
  npm run dev -- --port "$PORT" &
  DEV_PID=$!
  echo "   PID $DEV_PID"
  echo "⏳ Venter på at appen er klar (maks ${MAX_WAIT}s)..."
  WAITED=0
  while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null | grep -q 200; then
      echo "   ✅ Appen svarer på ${BASE_URL}"
      break
    fi
    if [ -n "$DEV_PID" ] && ! kill -0 "$DEV_PID" 2>/dev/null; then
      echo "   ❌ Dev-server stoppet uventet."
      exit 1
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    printf "   ... %ds\r" "$WAITED"
  done
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "   ❌ Timeout – appen startet ikke innen ${MAX_WAIT}s."
    exit 1
  fi
fi
echo ""

# ── 3. E2E med Allure-reporter ──
echo "🧪 3/5 Kjører ALLE E2E-tester med Allure-reporter..."
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-tom@klarpakke.no}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
export E2E_USER_EMAIL="${E2E_USER_EMAIL:-$TEST_USER_EMAIL}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$TEST_USER_PASSWORD}"
export PLAYWRIGHT_TEST_BASE_URL="$BASE_URL"
export BASE_URL="$BASE_URL"

# Export all needed vars from .env.local for Playwright
if [ -f .env.local ]; then
  while IFS='=' read -r key value; do
    key=$(echo "$key" | xargs)
    [[ "$key" =~ ^#.*$ || -z "$key" ]] && continue
    value=$(echo "$value" | sed 's/^["'\''"]//;s/["'\''"]$//')
    export "$key=$value"
  done < .env.local
fi

rm -rf allure-results
npx playwright test --reporter=allure-playwright,line || E2E_EXIT=$?
echo ""

# ── 4. Allure-rapport ──
echo "📊 4/5 Genererer Allure-rapport..."
npx allure generate allure-results --clean -o allure-report 2>/dev/null || echo "⚠️  Allure generate feilet"
echo ""

# ── 5. Lighthouse ──
echo "🔦 5/5 Kjører Lighthouse mot lokal app..."
rm -rf .lighthouseci
npx lhci autorun \
  --collect.url="$BASE_URL/no" \
  --collect.url="$BASE_URL/no/innlogging" \
  --collect.url="$BASE_URL/no/priser" \
  --collect.url="$BASE_URL/no/dashboard" \
  || LH_EXIT=$?
echo ""
