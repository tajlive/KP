#!/usr/bin/env bash
# Full E2E: opprett testbruker, start dev-server, kjør alle tester, stopp server.
# Én kommando – ingen manuell oppstart av server.
#
# Bruk: npm run test:full   eller   bash scripts/full-e2e.sh
#
# Krever: Supabase URL + SUPABASE_SERVICE_ROLE_KEY i .env / .env.local / … (auto-last av create-test-users.js)
# Sjekk: npm run test:e2e:check-env
set -e
cd "$(dirname "$0")/.."

PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
MAX_WAIT=120
DEV_PID=""
TEST_EXIT=0

cleanup() {
  if [ -n "$DEV_PID" ]; then
    echo ""
    echo "🛑 Stopper dev-server (PID $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    # Fallback: drepe prosess på port
    if command -v lsof >/dev/null 2>&1; then
      lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
    fi
  fi
  exit "$TEST_EXIT"
}
trap cleanup EXIT INT TERM

echo "📋 1. Oppretter testbrukere i Supabase..."
node scripts/create-test-users.js
echo ""

echo "🚀 2. Sjekker om appen allerede kjører på port $PORT..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null | grep -q 200; then
  echo "   Appen kjører allerede – bruker den."
else
  echo "   Starter dev-server..."
  npm run dev &
  DEV_PID=$!
  echo "   (PID $DEV_PID)"
  echo ""
  echo "⏳ 3. Venter på at appen er klar (maks ${MAX_WAIT}s)..."
  WAITED=0
  while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null | grep -q 200; then
      echo "   Appen svarer på ${BASE_URL}"
      break
    fi
    if [ -n "$DEV_PID" ] && ! kill -0 "$DEV_PID" 2>/dev/null; then
      echo "   ❌ Dev-server stoppet uventet."
      exit 1
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    echo "   ... ${WAITED}s"
  done
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "   ❌ Timeout – appen startet ikke innen ${MAX_WAIT}s."
    exit 1
  fi
fi
echo ""

echo "🧪 4. Kjører E2E-tester (smoke + critical, med testbruker)..."
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-tom@klarpakke.no}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
export E2E_USER_EMAIL="${E2E_USER_EMAIL:-$TEST_USER_EMAIL}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$TEST_USER_PASSWORD}"
export PLAYWRIGHT_TEST_BASE_URL="$BASE_URL"
export BASE_URL="$BASE_URL"

# Ikke start webServer i Playwright – vi har allerede startet den
npx playwright test --project=smoke-chromium --project=critical-chromium --project=critical-firefox || TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Alle tester fullført. Rapport: npx playwright show-report playwright-report"
else
  echo "⚠️  Noen tester feilet (exit $TEST_EXIT). Rapport: npx playwright show-report playwright-report"
fi
exit $TEST_EXIT
