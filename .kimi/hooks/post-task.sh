#!/bin/bash
# Post-Task Hook for KIMI
# Kjøres etter hver KIMI-oppgave for å lagre kontekst

TASK_TYPE="${1:-GENERAL}"
TASK_DESC="${2:-unnamed task}"
STATUS="${3:-WIP}"
FILES_CHANGED="${4:-0}"
RATING="${5:-★★★}"

echo "📝 KIMI Post-Task Hook"
echo "====================="
echo ""

# 1. Logg til diary
echo "💾 Saving to diary..."
if [ -f "./scripts/mempalace-diary.sh" ]; then
    ./scripts/mempalace-diary.sh write "$TASK_TYPE" "$TASK_DESC" "$STATUS" "$RATING" "$FILES_CHANGED"
fi
echo ""

# 2. Hent git summary
echo "📊 Git Summary:"
echo "  Files changed: $FILES_CHANGED"
if [ -d ".git" ]; then
    echo "  Last commit: $(git log -1 --oneline 2>/dev/null || echo 'N/A')"
fi
echo ""

echo "✅ Post-task hook complete"
