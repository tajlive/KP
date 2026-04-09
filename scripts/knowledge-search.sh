#!/bin/bash
# MemPalace Knowledge Search - M1 Mac Workaround
# Bruker grep/ag istedenfor ChromaDB

set -e

QUERY="$1"
ROOM="${2:-all}"
LIMIT="${3:-10}"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 <query> [room] [limit]"
    echo ""
    echo "Rooms: critical_decisions, error_patterns, tech_debt, api_contracts, project_status"
    exit 1
fi

echo "🔍 Searching for: '$QUERY'"
echo ""

# Funksjon for å søke i spesifikk mappe
search_dir() {
    local dir="$1"
    local label="$2"
    
    if [ -d "$dir" ]; then
        echo "📁 $label:"
        grep -r -i -l "$QUERY" "$dir" 2>/dev/null | head -$LIMIT | while read -r file; do
            echo "  📄 $file"
            grep -i -n "$QUERY" "$file" 2>/dev/null | head -3 | sed 's/^/    /'
            echo ""
        done
    fi
}

# Søk basert på rom
if [ "$ROOM" = "all" ] || [ "$ROOM" = "critical_decisions" ]; then
    search_dir "docs/adr" "Architecture Decisions"
    search_dir ".knowledge/decisions" "Decisions"
fi

if [ "$ROOM" = "all" ] || [ "$ROOM" = "error_patterns" ]; then
    search_dir ".knowledge/errors" "Error Patterns"
fi

if [ "$ROOM" = "all" ] || [ "$ROOM" = "tech_debt" ]; then
    if [ -f "src/lib/supabase/TYPE_DEBT.md" ]; then
        echo "📁 Type Debt:"
        grep -i -n "$QUERY" src/lib/supabase/TYPE_DEBT.md 2>/dev/null | head -5 | sed 's/^/  /'
        echo ""
    fi
fi

if [ "$ROOM" = "all" ] || [ "$ROOM" = "api_contracts" ]; then
    search_dir "src/app/api" "API Routes"
fi

if [ "$ROOM" = "all" ] || [ "$ROOM" = "project_status" ]; then
    for file in PROJECT_STATUS.md PRODUCTION-READINESS*.md; do
        if [ -f "$file" ]; then
            if grep -q -i "$QUERY" "$file" 2>/dev/null; then
                echo "📄 $file"
                grep -i -n "$QUERY" "$file" 2>/dev/null | head -3 | sed 's/^/  /'
                echo ""
            fi
        fi
    done
fi

# Søk i kildekode hvis ingenting funnet i docs
echo "🔎 Source code matches:"
grep -r -i --include="*.ts" --include="*.tsx" -l "$QUERY" src/ 2>/dev/null | head -5 | while read -r file; do
    echo "  📄 $file"
done

echo ""
echo "✅ Search complete"
