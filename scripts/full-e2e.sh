#!/usr/bin/env bash
# Full E2E: opprett testbruker, start dev-server, kjør Playwright-prosjekter, stopp server.
# Én kommando – ingen manuell oppstart av server.
#
# Bruk: npm run test:full   eller   npm run test:auto (restart dev + full kjede)
#        bash scripts/full-e2e.sh
#
# Valgfrie miljøvariabler:
#   KP_TEST_FULL_QUALITY=1     — kjør lint + type-check + Vitest før E2E
#   KP_TEST_FULL_DEEP=1        — legg til regression-chromium
#   KP_TEST_FULL_NO_FIREFOX=1  — hopp over critical-firefox
#   KP_TEST_FULL_USERS=primary — kun tom@klarpakke.no (create-test-users --primary-only)
#   KP_TEST_FULL_RESTART_DEV=1 — hvis noe allerede lytter på PORT: kill + ny npm run dev (påkrevd etter endring av NEXT_PUBLIC_*)
#   KLARPAKKE_E2E_FROM_PROVISION=0 — ikke overstyr E2E_USER_* i playwright.config (bruk kun .env.local)
#   (Playwright webServer skrus av her — ellers dobbel next dev → port 3000 / «webServer exited early».)
#   PW_WORKERS                 — Playwright-workers (standard lokalt: 1 hvis ikke satt; CI: se playwright.config)
#
# Krever: Supabase URL + SUPABASE_SERVICE_ROLE_KEY i .env / .env.local / … (auto-last av create-test-users.js)
# Sjekk: npm run test:e2e:check-env
#
# Etter feil: npm run test:e2e:agent-brief (leser test-results.json) + playwright-report/
set -e
cd "$(dirname "$0")/.."

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use 2>/dev/null || true
fi
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
MAX_WAIT=120
DEV_PID=""
TEST_EXIT=0

# Dreper alt som lytter på TCP-port (macOS lsof). Uten dette kan Next hoppe til 3001 mens Playwright treffer feil prosess på 3000.
ensure_port_free() {
  local p="${1:-$PORT}"
  local round
  for round in 1 2 3 4 5 6 7 8 9 10 11 12; do
    local pids
    pids="$(lsof -nP -iTCP:"$p" -sTCP:LISTEN -t 2>/dev/null || true)"
    if [ -z "$pids" ]; then
      return 0
    fi
    echo "   … frigjør port $p (runde $round, PID: $pids)"
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  done
  if lsof -nP -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "❌ Klarte ikke frigjøre port $p. Kjør: lsof -nP -iTCP:$p -sTCP:LISTEN"
    exit 1
  fi
}

# Starter Next på eksplisitt port (unngår stille hopp til 3001 når PORT var opptatt et millisekund).
# Ikke bruk --hostname 127.0.0.1: Next 15.5 + next-intl gir da 307-loop på / (rewrite til
# http://localhost:PORT/no mens klienten er på 127.0.0.1 → ERR_TOO_MANY_REDIRECTS i Playwright).
# Standard next dev (localhost / alle grensesnitt) matcher BASE_URL=http://localhost og virker.
start_next_dev() {
  ensure_port_free "$PORT"
  PORT="$PORT" npm run dev -- --port "$PORT" &
  DEV_PID=$!
}

# Port svarer — brukes kun som første signal.
app_is_ready_loose() {
  local code path
  for path in "/api/health" "/no/innlogging" "/innlogging" "/no" "/"; do
    code="$(curl -s -o /dev/null -w "%{http_code}" -m 15 "$BASE_URL$path" 2>/dev/null || echo "000")"
    if [ "$code" != "000" ]; then
      return 0
    fi
  done
  return 1
}

# Streng: innloggingssiden må svare 200 (Next har kompilert rute + lytter stabilt).
# Unngår at Playwright setup treffer net::ERR_CONNECTION_REFUSED rett etter «løs» ready-sjekk.
app_is_ready_strict() {
  local code
  for path in "/innlogging" "/no/innlogging"; do
    code="$(curl -s -o /dev/null -w "%{http_code}" -m 20 "$BASE_URL$path" 2>/dev/null || echo "000")"
    if [ "$code" = "200" ]; then
      return 0
    fi
  done
  return 1
}

app_is_ready() {
  app_is_ready_loose
}

wait_for_app_ready() {
  echo "⏳ Venter på at appen er klar (maks ${MAX_WAIT}s)…"
  WAITED=0
  while [ $WAITED -lt $MAX_WAIT ]; do
    if app_is_ready_loose && app_is_ready_strict; then
      echo "   Appen svarer på ${BASE_URL} (innlogging GET 200)"
      return 0
    fi
    if [ -n "$DEV_PID" ] && ! kill -0 "$DEV_PID" 2>/dev/null; then
      echo "   ❌ Dev-server stoppet uventet."
      exit 1
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    echo "   … ${WAITED}s"
  done
  echo "   ❌ Timeout – appen startet ikke innen ${MAX_WAIT}s."
  exit 1
}

cleanup() {
  # Bevar exit-kode fra `exit 1` i wait_for_app_ready / `exit $TEST_EXIT` på slutten — ikke overstyr med TEST_EXIT=0.
  local ec=$?
  if [ -n "$DEV_PID" ]; then
    echo ""
    echo "🛑 Stopper dev-server (PID $DEV_PID)..."
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    if command -v lsof >/dev/null 2>&1; then
      pids="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
      if [ -n "$pids" ]; then
        # shellcheck disable=SC2086
        kill -9 $pids 2>/dev/null || true
      fi
    fi
  fi
  exit "$ec"
}
trap cleanup EXIT INT TERM

if [ "${KP_TEST_FULL_QUALITY:-0}" = "1" ]; then
  echo "🔍 0. Kvalitet (lint + type-check + unit) — KP_TEST_FULL_QUALITY=1"
  npm run lint
  npm run type-check
  npm run test:unit
  echo ""
fi

echo "📋 1. Oppretter testbrukere i Supabase..."
if [ "${KP_TEST_FULL_USERS:-}" = "primary" ]; then
  echo "   (kun primær — KP_TEST_FULL_USERS=primary)"
  node scripts/create-test-users.js --primary-only
else
  node scripts/create-test-users.js
fi
echo ""

echo "🚀 2. Sjekker om appen allerede kjører på port $PORT..."
if app_is_ready; then
  if [ "${KP_TEST_FULL_RESTART_DEV:-0}" = "1" ]; then
    echo "   🔄 KP_TEST_FULL_RESTART_DEV=1 — frigjør port $PORT og starter dev på nytt (fersk NEXT_PUBLIC_*)."
    if ! command -v lsof >/dev/null 2>&1; then
      echo "❌ Krever \`lsof\` for å frigjøre port (eller stopp manuelt det som bruker :$PORT)."
      exit 1
    fi
    echo "   Starter dev-server (låst til --port $PORT)…"
    start_next_dev
    echo "   (PID $DEV_PID)"
    echo ""
    wait_for_app_ready
  else
    echo "   Appen kjører allerede – bruker den."
    echo ""
    echo "   ⚠️  Endret du nettopp .env.local (NEXT_PUBLIC_SUPABASE_*)? Klienten får ikke nye nøkler før dev restartes."
    echo "      Stopp/start \`npm run dev\`, eller kjør: KP_TEST_FULL_RESTART_DEV=1 npm run test:full"
    echo ""
  fi
else
  if ! command -v lsof >/dev/null 2>&1; then
    echo "   ⚠️  \`lsof\` mangler — kan ikke verifisere fri port før start."
  fi
  echo "   Starter dev-server (låst til --port $PORT)…"
  start_next_dev
  echo "   (PID $DEV_PID)"
  echo ""
  wait_for_app_ready
fi
echo ""

PW_ARGS=(--project=smoke-chromium --project=critical-chromium)
if [ "${KP_TEST_FULL_NO_FIREFOX:-0}" != "1" ]; then
  PW_ARGS+=(--project=critical-firefox)
else
  echo "ℹ️  Hopper over Firefox (KP_TEST_FULL_NO_FIREFOX=1)"
fi
if [ "${KP_TEST_FULL_DEEP:-0}" = "1" ]; then
  PW_ARGS+=(--project=regression-chromium)
  echo "ℹ️  Deep: inkluderer regression-chromium (KP_TEST_FULL_DEEP=1)"
fi

echo "🧪 4. Kjører E2E (${PW_ARGS[*]})..."
echo "   Live i terminal: list/line fra playwright.config; HTML: playwright-report/"
# Etter create-test-users: tving samme innlogging som admin API satte (playwright.config leser dette etter .env.local).
export KLARPAKKE_E2E_FROM_PROVISION="${KLARPAKKE_E2E_FROM_PROVISION:-1}"
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-tom@klarpakke.no}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
export E2E_USER_EMAIL="${E2E_USER_EMAIL:-$TEST_USER_EMAIL}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$TEST_USER_PASSWORD}"
export PLAYWRIGHT_TEST_BASE_URL="$BASE_URL"
export BASE_URL="$BASE_URL"
export PLAYWRIGHT_SKIP_WEBSERVER=1

# Én worker lokalt reduserer konkurranse mellom setup og smoke mot `next dev` (auth-flak).
if [ -z "${CI:-}" ] && [ -z "${PW_WORKERS:-}" ]; then
  export PW_WORKERS=1
fi

# Firefox + ffmpeg lastes ikke alltid ved npm install; uten dem feiler critical-firefox og video/trace.
if [ "${KP_TEST_FULL_NO_FIREFOX:-0}" != "1" ]; then
  echo "📦 4a. Sikrer Playwright chromium, firefox og ffmpeg (idempotent)…"
  npx playwright install chromium firefox || true
  npx playwright install ffmpeg 2>/dev/null || true
fi

npx playwright test "${PW_ARGS[@]}" || TEST_EXIT=$?

echo ""
if [ $TEST_EXIT -eq 0 ]; then
  echo "✅ Alle tester fullført. Rapport: npx playwright show-report playwright-report"
else
  echo "⚠️  Noen tester feilet (exit $TEST_EXIT). Rapport: npx playwright show-report playwright-report"
  echo ""
  echo "📋 Agent-brief (lim inn i Cursor Chat):"
  node scripts/playwright-agent-brief.mjs 2>/dev/null || true
fi
exit $TEST_EXIT
