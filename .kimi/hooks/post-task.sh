#!/bin/bash
# Post-Task Hook for KIMI — v3.0 (2026-05-03)
# KANONISK EXIT: ~/.kimi/hooks/mempalace-smart-exit.sh (SessionEnd-hook)
# Dette scriptet er for MANUELL logging midt i en sesjon.

TASK_TYPE="${1:-GENERAL}"
TASK_DESC="${2:-unnamed task}"
STATUS="${3:-WIP}"
FILES_CHANGED="${4:-0}"
RATING="${5:-★★★}"

echo "📝 KIMI Post-Task Hook v3.0"
echo "====================="
echo ""
echo "⚠️  Merk: Kanonisk exit-hook er mempalace-smart-exit.sh"
echo "   Kjøres automatisk ved SessionEnd via ~/.kimi/config.toml"
echo ""

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PROJECT_DIR="/Users/taj/klarpakke"
cd "$PROJECT_DIR"

# 1. Logg til local diary JSONL
DIARY_ENTRY="{\"ts\":\"$TIMESTAMP\",\"type\":\"$TASK_TYPE\",\"task\":\"$TASK_DESC\",\"status\":\"$STATUS\",\"rating\":\"$RATING\",\"files\":$FILES_CHANGED,\"agent\":\"kimi\"}"
echo "$DIARY_ENTRY" >> .kimi/diary.jsonl
echo "💾 Saved to .kimi/diary.jsonl"

# 2. Kjør Auto-Optimizer i bakgrunn (ikke blokker)
if command -v node &> /dev/null; then
  node scripts/auto-optimizer-run.mjs --quick > /dev/null 2>&1 &
  echo "🤖 Auto-Optimizer kjører i bakgrunn (rapport: .kimi/session-summaries/)"
fi

echo ""
echo "✅ Post-task hook complete"
echo "   For full session-analyse: ~/.kimi/hooks/mempalace-smart-exit.sh"
