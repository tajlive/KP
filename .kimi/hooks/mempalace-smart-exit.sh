#!/bin/bash
# MemPalace Smart Exit Hook — Kjøres ved SessionEnd
# Definert i ~/.kimi/config.toml: [[hooks]] event = "SessionEnd"

PROJECT_DIR="/Users/taj/klarpakke"
cd "$PROJECT_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "🏛️  MemPalace Smart Exit — $TIMESTAMP"

# 1. Flush KG til disk (sikrer at alt er persistert)
if [ -f ".mempalace/kg.json" ]; then
  echo "   💾 KG flushed ($(wc -l < .mempalace/kg.json 2>/dev/null || echo 0) entities)"
fi

# 2. Kjør Auto-Optimizer for session-analyse
if command -v node &> /dev/null && [ -f "scripts/auto-optimizer-run.mjs" ]; then
  node scripts/auto-optimizer-run.mjs --quick 2>/dev/null
  echo "   🤖 Auto-Optimizer rapport: .kimi/session-summaries/"
fi

# 3. Git diff-analyse → anbefal verify/swarm
if command -v git &> /dev/null; then
  CHANGED=$(git diff --name-only | wc -l | tr -d ' ')
  if [ "$CHANGED" -gt 5 ]; then
    echo "   📊 $CHANGED filer endret → Anbefalt: npm run swarm:review"
  elif [ "$CHANGED" -gt 3 ]; then
    echo "   📊 $CHANGED filer endret → Anbefalt: node scripts/verify/run-all.mjs"
  fi
fi

echo "   ✅ SessionEnd complete"
