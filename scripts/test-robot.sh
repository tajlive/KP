#!/usr/bin/env bash
# «Test-robot»: lint → type-check → unit → E2E provision → critical Playwright (Chromium).
# Ikke en LLM — deterministisk CI-lignende kjede lokalt.
set -eo pipefail
cd "$(dirname "$0")/.."

if [ -s "${HOME}/.nvm/nvm.sh" ]; then
  # shellcheck source=/dev/null
  . "${HOME}/.nvm/nvm.sh"
  nvm use 2>/dev/null || true
fi
set -u
export PATH="/opt/homebrew/bin:/usr/local/bin:${PATH}"

echo "🤖 test-robot: lint"
npm run lint
echo "🤖 test-robot: type-check"
npm run type-check
echo "🤖 test-robot: unit"
npm run test:unit

export E2E_USER_EMAIL="${E2E_USER_EMAIL:-tom@klarpakke.no}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-TestPassword123!}"
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-$E2E_USER_EMAIL}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-$E2E_USER_PASSWORD}"

echo "🤖 test-robot: E2E provision ($E2E_USER_EMAIL)"
npm run test:e2e:prepare

# Playwright config leser BASE_URL fra .env.local (ofte https://www.klarpakke.no). test:robot skal treffe
# next dev (webServer) — ellers feiler nye /api/*-ruter til de er deployet. Overstyr kun når ikke satt.
export PLAYWRIGHT_TEST_BASE_URL="${PLAYWRIGHT_TEST_BASE_URL:-http://localhost:3000}"

echo "🤖 test-robot: Playwright critical-chromium (PLAYWRIGHT_TEST_BASE_URL=$PLAYWRIGHT_TEST_BASE_URL)"
npx playwright test --project=critical-chromium

echo "✅ test-robot fullført."
