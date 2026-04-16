#!/bin/bash
# Post-Task Hook for KIMI — v2.1 (2026-04-16)
# Kjøres etter hver KIMI-oppgave for å lagre kontekst

TASK_TYPE="${1:-GENERAL}"
TASK_DESC="${2:-unnamed task}"
STATUS="${3:-WIP}"
FILES_CHANGED="${4:-0}"
RATING="${5:-★★★}"

echo "📝 KIMI Post-Task Hook"
echo "====================="
echo ""

TIMESTAMP=$(date +"%Y-%m-%dT%H:%M:%S%z")

# 1. Logg til local diary JSONL
DIARY_ENTRY="{\"timestamp\":\"$TIMESTAMP\",\"type\":\"$TASK_TYPE\",\"desc\":\"$TASK_DESC\",\"status\":\"$STATUS\",\"rating\":\"$RATING\",\"files_changed\":$FILES_CHANGED}"
echo "$DIARY_ENTRY" >> .kimi/diary.jsonl
echo "💾 Saved to .kimi/diary.jsonl"

# 2. Hent git summary
echo ""
echo "📊 Git Summary:"
echo "  Files changed: $FILES_CHANGED"
if [ -d ".git" ]; then
    echo "  Last commit: $(git log -1 --oneline 2>/dev/null || echo 'N/A')"
fi
echo ""

# 3. Synk til MemPalace knowledge hvis tilgjengelig
if command -v mempalace >/dev/null 2>&1; then
    echo "🔄 Syncing knowledge to MemPalace..."
    npm run knowledge:sync 2>/dev/null || echo "  (knowledge:sync skipped or failed)"
else
    echo "ℹ️  mempalace not available — knowledge will sync on next availability"
fi

echo ""
echo "✅ Post-task hook complete"
