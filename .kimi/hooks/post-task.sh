#!/bin/bash
# Post-Task Hook for KIMI — v2.2 (2026-05-03)
# Kjøres etter hver KIMI-oppgave for å lagre kontekst

TASK_TYPE="${1:-GENERAL}"
TASK_DESC="${2:-unnamed task}"
STATUS="${3:-WIP}"
FILES_CHANGED="${4:-0}"
RATING="${5:-★★★}"

echo "📝 KIMI Post-Task Hook v2.2"
echo "====================="
echo ""

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
PROJECT_DIR="/Users/taj/klarpakke"
cd "$PROJECT_DIR"

# 1. Logg til local diary JSONL
DIARY_ENTRY="{\"ts\":\"$TIMESTAMP\",\"type\":\"$TASK_TYPE\",\"task\":\"$TASK_DESC\",\"status\":\"$STATUS\",\"rating\":\"$RATING\",\"files\":$FILES_CHANGED,\"agent\":\"kimi\"}"
echo "$DIARY_ENTRY" >> .kimi/diary.jsonl
echo "💾 Saved to .kimi/diary.jsonl"

# 2. Logg til MemPalace diary v2 (hvis tilgjengelig)
if [ -f "scripts/mempalace-diary-v2.sh" ]; then
    echo "📝 Syncing to MemPalace diary..."
    # Convert stars to rating number
    RATING_NUM=$(echo "$RATING" | grep -o '★' | wc -l | tr -d ' ')
    [ "$RATING_NUM" -eq 0 ] && RATING_NUM=3
    scripts/mempalace-diary-v2.sh write "$TASK_TYPE" "$TASK_DESC" "$STATUS" "$RATING_NUM" "$FILES_CHANGED" 2>/dev/null || true
fi

# 3. Hent git summary
echo ""
echo "📊 Git Summary:"
echo "  Files changed: $FILES_CHANGED"
if [ -d ".git" ]; then
    echo "  Last commit: $(git log -1 --oneline 2>/dev/null || echo 'N/A')"
fi
echo ""

# 4. Synk til MemPalace knowledge hvis tilgjengelig
# Sjekk flere steder for mempalace CLI
MEMPALACE_BIN=""
for path in "/usr/local/bin/mempalace" "/Library/Frameworks/Python.framework/Versions/3.13/bin/mempalace" "$HOME/.local/bin/mempalace"; do
    if [ -x "$path" ]; then
        MEMPALACE_BIN="$path"
        break
    fi
done

if [ -n "$MEMPALACE_BIN" ] || command -v mempalace >/dev/null 2>&1; then
    echo "🔄 Syncing knowledge to MemPalace..."
    # Incremental sync — kun nylig endrede filer
    scripts/mempalace-sync.sh incr 2>/dev/null || echo "  (sync skipped or failed)"
else
    echo "ℹ️  mempalace CLI not found — knowledge will sync on next availability"
fi

echo ""
echo "✅ Post-task hook complete"
