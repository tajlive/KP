#!/usr/bin/env bash
# Standard testbruker + provisjon + Playwright critical (Chromium).
# Krever: .env med SUPABASE_SERVICE_ROLE_KEY (som create-test-users.js)
set -euo pipefail
cd "$(dirname "$0")/.."

export E2E_USER_EMAIL="${E2E_USER_EMAIL:-tom@klarpakke.no}"
export E2E_USER_PASSWORD="${E2E_USER_PASSWORD:-TestPassword123!}"
export TEST_USER_EMAIL="${TEST_USER_EMAIL:-$E2E_USER_EMAIL}"
export TEST_USER_PASSWORD="${TEST_USER_PASSWORD:-$E2E_USER_PASSWORD}"

echo "📋 E2E-bruker: $E2E_USER_EMAIL"
npm run test:e2e:prepare
echo ""
echo "🧪 Playwright critical-chromium…"
npx playwright test --project=critical-chromium
echo ""
echo "✅ Ferdig."
