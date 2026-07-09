#!/usr/bin/env bash
# Periodisk E2E smoke-test mot produksjon — kjøres via Hermes cron
# Usage: bash scripts/e2e-prod-smoke.sh
# Exit 0 = alt OK, Exit 1 = ≥1 test feilet
set -euo pipefail

cd /Users/taj/klarpakke || { echo "❌ Kan ikke cd til prosjektmappe"; exit 1; }

export PLAYWRIGHT_TEST_BASE_URL="https://www.klarpakke.no"
export BASE_URL="https://www.klarpakke.no"

OUTPUT_DIR="e2e-prod-output/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUTPUT_DIR"

echo "=== E2E Prod Smoke Test ==="
echo "Tid:     $(date)"
echo "Base:    $PLAYWRIGHT_TEST_BASE_URL"
echo "Output:  $OUTPUT_DIR"
echo ""

# Kjør testene — fang opp både exit code og output
set +e
npx playwright test \
  --config=playwright.allure.config.ts \
  --project=chromium \
  e2e/smoke/critical-flows.spec.ts \
  e2e/smoke/health.spec.ts \
  --reporter=json \
  > "$OUTPUT_DIR/results.json" 2>&1

EXIT_CODE=$?
set -e

# Parse resultat fra JSON
if [ -f "$OUTPUT_DIR/results.json" ] && command -v jq &>/dev/null; then
  TOTAL=$(jq '.stats.expected + .stats.unexpected + .stats.flaky' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "?")
  PASSED=$(jq '.stats.expected' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "?")
  FAILED=$(jq '.stats.unexpected' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "?")
  FLAKY=$(jq '.stats.flaky' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "?")
  DURATION=$(jq '.stats.duration' "$OUTPUT_DIR/results.json" 2>/dev/null || echo "?")
else
  TOTAL="?"
  PASSED="?"
  FAILED="?"
  FLAKY="?"
  DURATION="?"
fi

echo ""
echo "=== Resultat ==="
echo "Total:    $TOTAL"
echo "Pass:     $PASSED"
echo "Fail:     $FAILED"
echo "Flaky:    $FLAKY"
echo "Tid:      ${DURATION}ms"
echo ""

if [ "$FAILED" = "?" ]; then
  echo "⚠️  Kunne ikke parse testresultater (mangler jq?)"
  echo "Rå output:"
  head -30 "$OUTPUT_DIR/results.json"
  exit 1
fi

if [ "$FAILED" -gt 0 ] || [ "$EXIT_CODE" -ne 0 ]; then
  echo "❌ TEST FAILURE — $FAILED tester feilet"
  echo ""
  echo "Feilede tester:"
  jq -r '.suites[]?.specs[]? | select(.ok == false) | "  - \(.title)"' \
    "$OUTPUT_DIR/results.json" 2>/dev/null || echo "  (kunne ikke parse specs)"
  echo ""
  echo "Rådata: $OUTPUT_DIR/results.json"
  exit 1
fi

if [ "$FLAKY" -gt 0 ]; then
  echo "⚠️  $FLAKY flaky tester (bestått på retry)"
  echo "Flaky specs:"
  jq -r '.suites[]?.specs[]? | select(.flaky == true) | "  - \(.title)"' \
    "$OUTPUT_DIR/results.json" 2>/dev/null || true
fi

echo "✅ Alle $TOTAL tester OK"
exit 0
