#!/bin/bash
# MemPalace Knowledge Search v2 - M1 Mac
# Søker i alle knowledge-rom + diary + source code

set -e

QUERY="$1"
ROOM="${2:-all}"
LIMIT="${3:-10}"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 <query> [room] [limit]"
    echo ""
    echo "Rooms: all, auth, decisions, errors, patterns, trading, i18n, deployment, api-contracts, diary, source"
    exit 1
fi

echo "🔍 Searching for: '$QUERY'"
echo ""

# Search helper
search_dir() {
    local dir="$1"
    local label="$2"

    if [ -d "$dir" ]; then
        local results
        results=$(grep -r -i -l "$QUERY" "$dir" 2>/dev/null | head -$LIMIT)
        if [ -n "$results" ]; then
            echo "📁 $label:"
            echo "$results" | while read -r file; do
                echo "  📄 $file"
                grep -i -n "$QUERY" "$file" 2>/dev/null | head -3 | sed 's/^/    /'
                echo ""
            done
        fi
    fi
}

# Knowledge rooms
ROOMS_MAP=(
    "auth:.knowledge/auth:Auth Knowledge"
    "decisions:.knowledge/decisions:Decisions"
    "errors:.knowledge/errors:Error Patterns"
    "patterns:.knowledge/patterns:Code Patterns"
    "trading:.knowledge/trading:Trading Engine"
    "i18n:.knowledge/i18n:i18n Patterns"
    "deployment:.knowledge/deployment:Deployment"
    "api-contracts:.knowledge/api-contracts:API Contracts"
)

for entry in "${ROOMS_MAP[@]}"; do
    IFS=: read -r room_name room_path room_label <<< "$entry"
    if [ "$ROOM" = "all" ] || [ "$ROOM" = "$room_name" ]; then
        search_dir "$room_path" "$room_label"
    fi
done

# ADR docs
if [ "$ROOM" = "all" ] || [ "$ROOM" = "decisions" ]; then
    search_dir "docs/adr" "Architecture Decisions (ADR)"
fi

# Type Debt
if [ "$ROOM" = "all" ] || [ "$ROOM" = "errors" ]; then
    if [ -f "src/lib/supabase/TYPE_DEBT.md" ]; then
        if grep -q -i "$QUERY" src/lib/supabase/TYPE_DEBT.md 2>/dev/null; then
            echo "📁 Type Debt:"
            grep -i -n "$QUERY" src/lib/supabase/TYPE_DEBT.md 2>/dev/null | head -5 | sed 's/^/  /'
            echo ""
        fi
    fi
fi

# Diary search
if [ "$ROOM" = "all" ] || [ "$ROOM" = "diary" ]; then
    if [ -f ".kimi/diary.jsonl" ]; then
        local_results=$(grep -i "$QUERY" .kimi/diary.jsonl 2>/dev/null | tail -$LIMIT)
        if [ -n "$local_results" ]; then
            echo "📓 Diary Matches:"
            echo "$local_results" | while IFS= read -r line; do
                ts=$(echo "$line" | sed 's/.*"ts":"\([^"]*\)".*/\1/' | cut -dT -f1)
                type=$(echo "$line" | sed 's/.*"type":"\([^"]*\)".*/\1/')
                task=$(echo "$line" | sed 's/.*"task":"\([^"]*\)".*/\1/')
                echo "  📅 $ts | $type | $task"
            done
            echo ""
        fi
    fi
fi

# Source code search
if [ "$ROOM" = "all" ] || [ "$ROOM" = "source" ]; then
    echo "🔎 Source code matches:"
    grep -r -i --include="*.ts" --include="*.tsx" -l "$QUERY" src/ 2>/dev/null | head -5 | while read -r file; do
        echo "  📄 $file"
    done
    echo ""
fi

echo "✅ Search complete"
