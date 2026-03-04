#!/bin/bash
# =============================================================================
# MCP REPAIR ALL MIGRATIONS
# =============================================================================

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🔧 MCP REPAIR ALL MIGRATIONS                              ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

cd /Users/taj/klarpakke

# Liste over migrasjoner som må repareres (fra db pull output)
declare -a MIGRATIONS=(
    "20250213 reverted"
    "20240214 applied"
    "20240214 applied"
    "20250213 applied"
    "20250214 applied"
    "20250214 applied"
    "20260213 applied"
    "20260215000000 applied"
    "20260215000005 applied"
)

echo "🔧 Reparerer migrasjoner..."
echo ""

for migration in "${MIGRATIONS[@]}"; do
    version=$(echo $migration | cut -d' ' -f1)
    status=$(echo $migration | cut -d' ' -f2)
    
    echo "Reparerer: $version => $status"
    npx supabase migration repair $version --status $status 2>&1 | grep -E "(Repaired|Finished|error)" || true
    echo ""
done

echo ""
echo "🚀 Pusher migrasjoner..."
npx supabase db push 2>&1 | tail -10

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     ✅ REPAIR COMPLETE                                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
