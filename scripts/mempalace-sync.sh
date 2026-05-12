#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MEMPALACE SYNC - Holder klarpakke-minner synkronisert
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: ./scripts/mempalace-sync.sh [full|incremental]
#
# "full"    - Sletter cache og tvinger reindex ved neste MCP-start
# "incr"    - Informerer at MCP auto-reindexerer (default)
# ═══════════════════════════════════════════════════════════════════════════════
# MERK: Python CLI "mempalace mine" er deprecated pga segfault på macOS.
#       Bruker Node.js MCP auto-reindex i stedet.
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_DIR="/Users/taj/klarpakke"
MODE="${1:-incr}"

echo "🏛️  MemPalace Sync for Klarpakke"
echo "   Mode: $MODE"
echo "   Backend: Node.js MCP v3.3.0 (Python CLI deprecated)"
echo ""

cd "$PROJECT_DIR"

if [ "$MODE" = "full" ]; then
    echo "🔄 Full sync - tømmer cache for reindex..."
    node scripts/mempalace-reindex.mjs
elif [ "$MODE" = "incr" ]; then
    echo "⚡ Incremental sync"
    echo "   MemPalace MCP reindexerer automatisk ved neste oppstart"
    echo "   basert på fil-mtime. Ingen manuell handling nødvendig."
fi

echo ""
echo "✅ Sync konfigurert!"
echo "📊 Neste KIMI-session vil auto-reindexere ved MCP-start."
echo "   Kjør 'kimi mcp list' for å verifisere MCP-status."
