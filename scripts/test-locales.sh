#!/bin/bash
# Test alle locales i produksjon med Playwright

echo "═══════════════════════════════════════════════════════════"
echo "🧪 TESTER ALLE SPRÅK (LOCALES)"
echo "═══════════════════════════════════════════════════════════"
echo ""

cd "$(dirname "$0")/.."

# Sjekk om Playwright er installert
if ! npx playwright --version &> /dev/null; then
    echo "❌ Playwright ikke installert. Installerer..."
    npm install -D @playwright/test
    npx playwright install chromium
fi

echo "Kjører Playwright-test for alle språk..."
echo ""

npx playwright test tests/e2e/locale.spec.ts \
    --config=playwright.config.prod.ts \
    --reporter=line

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ ALLE SPRÅK-TESTER BESTÅTT!"
    echo ""
    echo "Resultat:"
    echo "  - /no: Norsk tekst vises korrekt"
    echo "  - /en: Engelsk tekst vises korrekt"
    echo "  - /th: Thai (fallback til engelsk)"
    echo "  - /zh: Kinesisk (fallback til engelsk)"
    echo "  - Ingen MISSING_MESSAGE feil"
else
    echo "❌ EN ELLER FLERE TESTER FEILET"
    echo ""
    echo "Sjekk feilmeldinger ovenfor."
fi

exit $EXIT_CODE
