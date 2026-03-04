#!/bin/bash
# =============================================================================
# Start Klarpakke MCP Server
# =============================================================================

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Klarpakke MCP Server...${NC}"
echo ""

# Sjekk at deno er installert
if ! command -v deno &> /dev/null; then
    echo "❌ Deno ikke funnet. Installerer..."
    brew install deno
fi

# Sett default miljøvariabler hvis .env ikke finnes
if [ -f ".env" ]; then
    echo "✅ Laster .env fil"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "⚠️  .env fil ikke funnet, bruker default verdier"
    export SUPABASE_URL="https://vuxbjlykgmzskxbclquf.supabase.co"
    export SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys"
    export SUPABASE_PROJECT_REF="vuxbjlykgmzskxbclquf"
fi

echo "Project: $SUPABASE_PROJECT_REF"
echo ""

# Start server
echo -e "${GREEN}✅ Server kjører!${NC}"
echo ""
echo "Tilgjengelige kommandoer:"
echo "  • list_edge_functions"
echo "  • test_system_status"
echo "  • test_edge_function"
echo "  • deploy_edge_function"
echo "  • list_secrets"
echo ""

deno run --allow-all src/index.ts
