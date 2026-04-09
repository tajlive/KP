#!/bin/bash
# Seed MemPalace med kritisk prosjektkunnskap
# Usage: ./scripts/mempalace-seed.sh

set -e

echo "🏛️ Seeding MemPalace..."

# Funksjon for å legge til drawer
add_drawer() {
    local wing="$1"
    local room="$2"
    local file="$3"
    
    if [ -f "$file" ]; then
        echo "Adding: $file → $wing/$room"
        # I praksis: kall mempalace MCP eller API
        # mempalace_add_drawer --wing="$wing" --room="$room" --content="$(cat "$file")"
    fi
}

# 1. ADR-er → architecture room
echo "📋 Processing ADRs..."
for f in docs/adr/*.md; do
    add_drawer "klarpakke" "architecture" "$f"
done

# 2. Type Debt → tech_debt room
echo "📋 Processing Type Debt..."
add_drawer "klarpakke" "tech_debt" "src/lib/supabase/TYPE_DEBT.md"

# 3. Error patterns → error_patterns room
echo "📋 Processing TODOs/FIXMEs..."
if [ -f ".knowledge/current-todos.md" ]; then
    add_drawer "klarpakke" "error_patterns" ".knowledge/current-todos.md"
fi

# 4. Critical decisions → critical_decisions room
echo "📋 Processing decisions..."
for f in docs/*DECISION*.md docs/adr/*.md; do
    if [ -f "$f" ]; then
        add_drawer "klarpakke" "critical_decisions" "$f"
    fi
done

# 5. API documentation → api_contracts room
echo "📋 Processing API docs..."
add_drawer "klarpakke" "api_contracts" "docs/api-routes.md"

echo "✅ Seeding complete!"
echo ""
echo "Next steps:"
echo "1. Run: mempalace_status"
echo "2. Test search: mempalace_search 'auth pattern'"
