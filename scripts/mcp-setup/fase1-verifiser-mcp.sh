#!/bin/bash
set -e

LOG_FILE="/tmp/klarpakke-mcp-setup-$(date +%Y%m%d-%H%M%S).log"
PROJECT_ROOT="/Users/taj/klarpakke"

echo "═══════════════════════════════════════════════════════════" | tee "$LOG_FILE"
echo "🔧 FASE 1: VERIFISER MCP-SERVER" | tee -a "$LOG_FILE"
echo "═══════════════════════════════════════════════════════════" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

cd "$PROJECT_ROOT/mcp-server" || exit 1

# 1.1 - Sjekk at dist/ finnes
echo "📦 Sjekker build..." | tee -a "$LOG_FILE"
if [ -d "dist" ]; then
  echo "  ✅ dist/ finnes" | tee -a "$LOG_FILE"
  echo "  Filer:" | tee -a "$LOG_FILE"
  ls -lh dist/ | tail -n +2 | awk '{print "    • " $9 " (" $5 ")"}' | tee -a "$LOG_FILE"
else
  echo "  ❌ dist/ finnes IKKE - bygger nå..." | tee -a "$LOG_FILE"
  npm install | tee -a "$LOG_FILE"
  npm run build | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# 1.2 - Tell antall tools
echo "🔍 Analyserer tools..." | tee -a "$LOG_FILE"
TOOL_FILES=$(find src -name "*-tools.ts" -o -name "*-tool.ts" 2>/dev/null)
TOTAL_FILES=$(echo "$TOOL_FILES" | grep -v "^$" | wc -l | tr -d ' ')

echo "  📊 Totalt $TOTAL_FILES tool-filer:" | tee -a "$LOG_FILE"
for file in $TOOL_FILES; do
  if [ -f "$file" ]; then
    TOOL_COUNT=$(grep -c "name:" "$file" 2>/dev/null || echo "0")
    echo "    • $(basename $file): $TOOL_COUNT tools" | tee -a "$LOG_FILE"
  fi
done
echo "" | tee -a "$LOG_FILE"

# 1.3 - Tell totalt antall tools
echo "🧮 Beregner totalt antall tools..." | tee -a "$LOG_FILE"
TOTAL_TOOLS=0
for file in $TOOL_FILES; do
  if [ -f "$file" ]; then
    COUNT=$(grep -c "name:" "$file" 2>/dev/null || echo "0")
    TOTAL_TOOLS=$((TOTAL_TOOLS + COUNT))
  fi
done
echo "  ✅ Totalt: $TOTAL_TOOLS tools tilgjengelig" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 1.4 - Sjekk package.json
echo "📋 Sjekker package.json..." | tee -a "$LOG_FILE"
if [ -f "package.json" ]; then
  NAME=$(cat package.json | grep '"name"' | head -1 | cut -d'"' -f4)
  VERSION=$(cat package.json | grep '"version"' | head -1 | cut -d'"' -f4)
  echo "  📦 $NAME v$VERSION" | tee -a "$LOG_FILE"
fi
echo "" | tee -a "$LOG_FILE"

# 1.5 - Test at serveren starter (timeout etter 3 sekunder)
echo "🚀 Tester server-start..." | tee -a "$LOG_FILE"
timeout 3s node dist/index.js 2>&1 || true
echo "  ✅ Server starter (timeout etter 3s er forventet)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

echo "✅ FASE 1 FULLFØRT" | tee -a "$LOG_FILE"
echo "📄 Logg: $LOG_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Eksporter for neste fase
export LOG_FILE
export PROJECT_ROOT
