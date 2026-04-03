#!/bin/bash
set -euo pipefail

# Source env vars
if [ -f .env.local ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.local
  set +a
fi

REPORT="analyze-report.md"
echo "# Klarpakke Repo Analyse Report" > "$REPORT"
echo "Generert: $(date -Iseconds)" >> "$REPORT"
echo "" >> "$REPORT"

echo "=== GIT METRIKKER ===" | tee -a "$REPORT"
echo "\`\`\`" >> "$REPORT"
git log --oneline -20 >> "$REPORT"
echo "\`\`\`" >> "$REPORT"
echo "" >> "$REPORT"
echo "Git status:" >> "$REPORT"
echo "\`\`\`" >> "$REPORT"
git status >> "$REPORT"
echo "\`\`\`" >> "$REPORT"
echo "" >> "$REPORT"

echo "=== FILSTRUKTUR ===" | tee -a "$REPORT"
TS_COUNT=$(find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l | tr -d ' ')
TOTAL_COUNT=$(find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | grep -v node_modules | wc -l | tr -d ' ')
echo "- TypeScript-filer i src/: $TS_COUNT" | tee -a "$REPORT"
echo "- TS/JS-filer totalt (ekskl. node_modules): $TOTAL_COUNT" | tee -a "$REPORT"
echo "" >> "$REPORT"

echo "=== NODE/VERSJONER ===" | tee -a "$REPORT"
echo "- Node: $(node -v)" | tee -a "$REPORT"
echo "- NPM: $(npm -v)" | tee -a "$REPORT"
echo "" >> "$REPORT"

echo "=== LINT & TYPE-CHECK ===" | tee -a "$REPORT"
LINT_OK=false
TYPE_OK=false
if npm run lint > /tmp/lint.log 2>&1; then
  echo "- ✅ ESLint: OK" | tee -a "$REPORT"
  LINT_OK=true
else
  echo "- ❌ ESLint: FAILED" | tee -a "$REPORT"
fi
if npm run type-check > /tmp/type-check.log 2>&1; then
  echo "- ✅ Type-check: OK" | tee -a "$REPORT"
  TYPE_OK=true
else
  echo "- ❌ Type-check: FAILED" | tee -a "$REPORT"
fi
echo "" >> "$REPORT"

echo "=== NPM AUDIT (high+) ===" | tee -a "$REPORT"
echo "\`\`\`" >> "$REPORT"
npm audit --audit-level high >> "$REPORT" 2>&1 || true
echo "\`\`\`" >> "$REPORT"
echo "" >> "$REPORT"

echo "=== SUPABASE STATS (via REST API) ===" | tee -a "$REPORT"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

FAILED_TRADES_COUNT=0
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  # Hent auto_trade_log failed
  AUTO_FAILED=$(curl -s "${SUPABASE_URL}/rest/v1/auto_trade_log?status=eq.failed&select=id" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" | grep -o '"id"' | wc -l | tr -d ' ' || true)
  echo "- auto_trade_log (failed): $AUTO_FAILED" | tee -a "$REPORT"

  # Hent trades med status != filled/closed/open (potensielt feilede)
  TRADE_STATUSES=$(curl -s "${SUPABASE_URL}/rest/v1/trades?select=status" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")
  TRADE_FAILED=$(echo "$TRADE_STATUSES" | grep -vE '"filled"|"closed"|"open"' | grep '"status"' | wc -l | tr -d ' ' || true)
  echo "- trades (avvikende status): $TRADE_FAILED" | tee -a "$REPORT"

  FAILED_TRADES_COUNT=${AUTO_FAILED:-0}
else
  echo "- Mangler Supabase env-vars; hopper over DB-stats." | tee -a "$REPORT"
fi
echo "" >> "$REPORT"

echo "=== PLAYWRIGHT E2E ===" | tee -a "$REPORT"
# Playwright config starter selv webServer på port 3001; sørg for at porten er ledig
for p in 3000 3001; do
  PID=$(lsof -ti :$p 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "Dreper gammel prosess på port $p (PID: $PID)"
    kill "$PID" 2>/dev/null || true
    sleep 1
  fi
done

PLAYWRIGHT_OK=false
PW_PASSED="N/A"
PW_FAILED="N/A"
if npx playwright test --project=smoke-chromium --reporter=list > /tmp/playwright.log 2>&1; then
  PW_SUMMARY=$(grep -E "^[[:space:]]*[0-9]+ passed" /tmp/playwright.log | tail -1 || true)
  echo "- ✅ Playwright smoke-chromium: OK ($PW_SUMMARY)" | tee -a "$REPORT"
  PLAYWRIGHT_OK=true
else
  PW_SUMMARY=$(grep -E "^[[:space:]]*[0-9]+ (passed|failed)" /tmp/playwright.log | tail -1 || true)
  echo "- ⚠️ Playwright smoke-chromium: $PW_SUMMARY (1 kjent feil: meta-description strict mode)" | tee -a "$REPORT"
  echo "Siste 40 linjer fra Playwright logg:" >> "$REPORT"
  echo "\`\`\`" >> "$REPORT"
  tail -40 /tmp/playwright.log >> "$REPORT" || true
  echo "\`\`\`" >> "$REPORT"
fi

echo "" >> "$REPORT"

echo "=== SAMMENDRAG ===" | tee -a "$REPORT"
echo "- Lint OK: $LINT_OK" | tee -a "$REPORT"
echo "- Type-check OK: $TYPE_OK" | tee -a "$REPORT"
echo "- Playwright OK: $PLAYWRIGHT_OK" | tee -a "$REPORT"
echo "- Failed trades (auto_trade_log): $FAILED_TRADES_COUNT" | tee -a "$REPORT"
echo "" >> "$REPORT"

if [ "$FAILED_TRADES_COUNT" -gt 5 ]; then
  echo "⚠️  ALERT: Mer enn 5 feilede trades oppdaget. Opprett Linear-issue!" | tee -a "$REPORT"
else
  echo "✅ Ingen kritiske feilede trades (>5). Ingen Linear-issue nødvendig." | tee -a "$REPORT"
fi

echo "" >> "$REPORT"
echo "---" >> "$REPORT"
echo "Rapport lagret til: $REPORT"
