#!/bin/bash
# =============================================================================
# MCP-STYLE MIGRATION RUNNER
# =============================================================================
# Kjører migrasjons-kommandoer med MCP-style output
# =============================================================================

PROJECT_REF="vuxbjlykgmzskxbclquf"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🛠️  MCP MIGRATION RUNNER                                  ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Funksjon for MCP-style output
mcp_output() {
    local status=$1
    local message=$2
    local details=$3
    
    if [ "$status" = "success" ]; then
        echo "✅ $message"
    else
        echo "❌ $message"
    fi
    
    if [ -n "$details" ]; then
        echo ""
        echo "$details"
    fi
    echo ""
}

# 1. Sjekk migrasjons-status først
echo "🔍 TOOL: check_migration_status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cd /Users/taj/klarpakke

BEFORE_LIST=$(npx supabase migration list --project-ref $PROJECT_REF 2>&1)
if [ $? -eq 0 ]; then
    mcp_output "success" "Migration status retrieved" "$BEFORE_LIST"
else
    mcp_output "error" "Failed to get migration status" "$BEFORE_LIST"
fi

# 2. Repair migration
echo "🔧 TOOL: repair_migration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Version: 20250213"
echo "Status: applied"
echo ""

REPAIR_RESULT=$(npx supabase migration repair --status applied 20250213 --project-ref $PROJECT_REF 2>&1)
if [ $? -eq 0 ]; then
    mcp_output "success" "Migration 20250213 repaired successfully" "$REPAIR_RESULT"
else
    mcp_output "error" "Repair may have failed or already applied" "$REPAIR_RESULT"
fi

# 3. Push migrasjoner
echo "🚀 TOOL: push_migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PUSH_RESULT=$(npx supabase db push --project-ref $PROJECT_REF 2>&1)
PUSH_STATUS=$?

if [ $PUSH_STATUS -eq 0 ]; then
    mcp_output "success" "All migrations pushed successfully!" "$PUSH_RESULT"
else
    mcp_output "error" "Migration push failed" "$PUSH_RESULT"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   - Check if remote database is accessible"
    echo "   - Verify SUPABASE_ACCESS_TOKEN is set"
    echo "   - Run: supabase login"
fi

# 4. Verifiser etterpå
echo "✅ TOOL: verify_migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

AFTER_LIST=$(npx supabase migration list --project-ref $PROJECT_REF 2>&1)
if [ $? -eq 0 ]; then
    echo "Migration status after repair/push:"
    echo "$AFTER_LIST"
else
    echo "Could not verify status"
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║     🎉 MCP MIGRATION COMPLETE                                 ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
