#!/bin/bash
set -e

LOG_FILE="/tmp/klarpakke-mcp-test-$(date +%Y%m%d-%H%M%S).log"
PROJECT_ROOT="/Users/taj/klarpakke"

echo "═══════════════════════════════════════════════════════════" | tee "$LOG_FILE"
echo "🧪 FASE 4: TEST ALLE MCP-TOOLS" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd "$PROJECT_ROOT/mcp-server" || exit 1

# 4.1 - Tell alle tilgjengelige tools
echo "📊 Teller alle MCP tools..." | tee -a "$LOG_FILE"

# Source modules
MODULES=(
  "stripe-tools.ts:stripe_"
  "linkedin-tools.ts:linkedin_"
  "sales-navigator-tools.ts:sn_"
  "auth-tools.ts:auth_"
  "github-tools.ts:github_"
  "cloudflare-tools.ts:cf_"
  "cloud-run-tools.ts:cloudrun_"
  "cloud-run-tools.ts:gcloud_"
  "supabase-tools.ts:supabase_"
  "cloudflare-dns-tools.ts:cf_dns_"
  "cloudrun-domain-tools.ts:cloudrun_"
  "build-tools.ts:build_"
  "monitor-tools.ts:monitor_"
)

TOTAL_TOOLS=0
MODULE_COUNT=0

echo "" | tee -a "$LOG_FILE"
echo "**Modul-fordeling:**" | tee -a "$LOG_FILE"

for module_info in "${MODULES[@]}"; do
  IFS=':' read -r file prefix <<< "$module_info"
  if [ -f "src/$file" ]; then
    COUNT=$(grep -c "name:" "src/$file" 2>/dev/null || echo "0")
    TOTAL_TOOLS=$((TOTAL_TOOLS + COUNT))
    MODULE_COUNT=$((MODULE_COUNT + 1))
    echo "  • $file: $COUNT tools ($prefix*)" | tee -a "$LOG_FILE"
  fi
done

# Legg til generic tools
GENERIC_TOOLS=5
echo "  • index.ts: $GENERIC_TOOLS tools (git_*, read_file, list_files)" | tee -a "$LOG_FILE"
TOTAL_TOOLS=$((TOTAL_TOOLS + GENERIC_TOOLS))

echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "📈 SAMMENDRAG:" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "  • Moduler: $MODULE_COUNT" | tee -a "$LOG_FILE"
echo "  • Totalt antall tools: $TOTAL_TOOLS" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 4.2 - Test at serveren starter
echo "🚀 Test: MCP server starter..." | tee -a "$LOG_FILE"
cd "$PROJECT_ROOT" && \
bash mcp-server/mcp-wrapper.sh &
MCP_PID=$!
sleep 2

if kill -0 $MCP_PID 2>/dev/null; then
  echo "  ✅ Server kjører (PID: $MCP_PID)" | tee -a "$LOG_FILE"
  kill $MCP_PID 2>/dev/null || true
else
  echo "  ❌ Server startet ikke" | tee -a "$LOG_FILE"
fi
wait $MCP_PID 2>/dev/null || true
echo "" | tee -a "$LOG_FILE"

# 4.3 - Kategoriser tools
echo "📂 TOOL-KATEGORIER:" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

CATEGORIES=(
  "Cloud (GCP/Cloud Run):cloudrun_,gcloud_"
  "Database (Supabase):supabase_"
  "DNS (Cloudflare):cf_dns_,cf_"
  "Betaling (Stripe):stripe_"
  "Sosialt (LinkedIn):linkedin_,sn_"
  "Auth:auth_"
  "GitHub:github_"
  "Bygg/Deploy:build_"
  "Monitoring:monitor_"
  "Git/Utils:git_,read_file,list_files"
)

for cat_info in "${CATEGORIES[@]}"; do
  IFS=':' read -r name prefixes <<< "$cat_info"
  COUNT=0
  IFS=',' read -ra PREFS <<< "$prefixes"
  for file in src/*-tools.ts; do
    if [ -f "$file" ]; then
      for prefix in "${PREFS[@]}"; do
        FILE_COUNT=$(grep -c "\"$prefix" "$file" 2>/dev/null || echo "0")
        COUNT=$((COUNT + FILE_COUNT))
      done
    fi
  done
  echo "  • $name: $COUNT tools" | tee -a "$LOG_FILE"
done

echo "" | tee -a "$LOG_FILE"

# 4.4 - List ut alle tools
echo "🔍 ALLE TILGJENGELIGE TOOLS:" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

for file in src/*-tools.ts; do
  if [ -f "$file" ]; then
    BASENAME=$(basename "$file" .ts)
    echo "**$BASENAME:**" | tee -a "$LOG_FILE"
    grep -E 'name:\s*"' "$file" | sed 's/.*name:\s*"\([^"]*\)".*/  - \1/' | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"
  fi
done

echo "**Generic tools:**" | tee -a "$LOG_FILE"
echo "  - git_status" | tee -a "$LOG_FILE"
echo "  - git_commit" | tee -a "$LOG_FILE"
echo "  - git_push" | tee -a "$LOG_FILE"
echo "  - read_file" | tee -a "$LOG_FILE"
echo "  - list_files" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "✅ FASE 4 FULLFØRT" | tee -a "$LOG_FILE"
echo "📄 Logg: $LOG_FILE" | tee -a "$LOG_FILE"
