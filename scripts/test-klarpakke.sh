#!/bin/bash
# Klarpakke Auto-Test
# Bruk: ./test-klarpakke.sh [production|staging]

TARGET=${1:-"production"}
URL="https://www.klarpakke.no"

if [ "$TARGET" = "staging" ]; then
  URL="https://staging.klarpakke.no"
fi

echo "🧪 Starter Klarpakke E2E Testing"
echo "================================"
echo "Target: $TARGET"
echo "URL: $URL"
echo ""

# Sjekk om vi er i riktig mappe
if [ ! -f "package.json" ]; then
  echo "❌ Feil: Må kjøres fra Klarpakke rot-mappe"
  exit 1
fi

# Installer avhengigheter
echo "📦 Sjekker avhengigheter..."
npm ci

# Installer Playwright
echo "🎭 Sjekker Playwright..."
npx playwright install chromium

# Kjør tester
echo ""
echo "🧪 Kjører E2E tester..."
TEST_BASE_URL=$URL npx playwright test tests/e2e/klarpakke-production.spec.ts --reporter=allure-playwright,line

TEST_RESULT=$?

# Generer rapport
echo ""
echo "📊 Genererer Allure rapport..."
npm run allure:generate

# Åpne rapport
echo ""
echo "🌐 Åpner rapport i nettleser..."
if command -v open &> /dev/null; then
  open allure-report/index.html
elif command -v xdg-open &> /dev/null; then
  xdg-open allure-report/index.html
else
  echo "📄 Rapport tilgjengelig i: allure-report/index.html"
fi

echo ""
if [ $TEST_RESULT -eq 0 ]; then
  echo "✅ Alle tester bestått!"
else
  echo "❌ Noen tester feilet. Sjekk rapporten."
fi

exit $TEST_RESULT
