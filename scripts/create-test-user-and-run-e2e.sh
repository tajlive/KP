#!/usr/bin/env bash
# Opprett testbruker (tom@klarpakke.no) og kjør E2E-tester med innlogging
# Krever: .env.local med NEXT_PUBLIC_SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY
#
# Enklere alternativ (starter server automatisk): npm run test:full
#
# For manuell kjøring: Start dev-server først (npm run dev), deretter:
#   npm run test:e2e:with-user
# Mot produksjon: PLAYWRIGHT_TEST_BASE_URL=https://www.klarpakke.no npm run test:e2e:with-user
set -e
cd "$(dirname "$0")/.."

echo "📋 1. Oppretter testbruker i Supabase..."
node scripts/create-test-users.js
echo ""

echo "🧪 2. Kjører E2E-tester med testbruker..."
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-tom@klarpakke.no}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-TestPassword123!}"
export E2E_USER_EMAIL="${E2E_USER_EMAIL:-$TEST_USER_EMAIL}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-$TEST_USER_PASSWORD}"

npx playwright test --project=smoke-chromium --project=critical-chromium --project=critical-firefox
echo ""
echo "✅ Ferdig. Rapport: npx playwright show-report playwright-report"
