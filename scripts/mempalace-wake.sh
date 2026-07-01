#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MEMPALACE WAKE — Laster L0+L1 kontekst for KIMI via Node.js MCP-server v3.4.0
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: source ./scripts/mempalace-wake.sh
#    eller: kimi -p "$(./scripts/mempalace-wake.sh)"
# ═══════════════════════════════════════════════════════════════════════════════

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# L0: Identity (hvis finnes)
if [ -f ~/.mempalace/identity.txt ]; then
    echo "## L0 — IDENTITY"
    cat ~/.mempalace/identity.txt
    echo ""
fi

# L1: Critical facts from Klarpakke wing
echo "## L1 — KLARPAKKE CRITICAL FACTS"
echo ""

# Siste viktige hendelser fra memory/
if [ -d "$ROOT/memory" ]; then
    echo "### Recent Decisions"
    ls -t "$ROOT/memory"/*.md 2>/dev/null | head -5 | while read f; do
        echo "- $(basename "$f"): $(head -1 "$f" | sed 's/^# //')"
    done
    echo ""
fi

# Wake MemPalace Node.js MCP-server via status-script
echo "### MemPalace Status"
if [ -f "$ROOT/scripts/mempalace-status.mjs" ]; then
    node "$ROOT/scripts/mempalace-status.mjs" 2>/dev/null || echo "⚠️  MemPalace status check failed"
else
    echo "⚠️  scripts/mempalace-status.mjs not found"
fi
echo ""

# Key project context
echo "### Key Context"
echo "- Stack: Next.js 16, React 19, TypeScript 5.9, Supabase, Fly.io"
echo "- Auth: Google OAuth + Vipps"
echo "- Trading: Paper + Live modes"
echo "- Test: Playwright E2E + Vitest"
echo "- MemPalace: Node.js MCP v3.4.0 (zero-dep, TF-IDF + bigram + cross-lingual)"
echo ""

echo "## Usage"
echo "- MCP server: auto-started by Cursor/Claude via ~/.cursor/mcp.json -> ~/.kimi/mempalace-server.mjs"
echo "- Manual status: npm run mempalace:status"
echo "- Search knowledge: node scripts/mempalace-search.mjs 'auth pattern'"
echo "- Sync knowledge: npm run knowledge:sync"
echo "- Ask: 'What did we decide about X?' or 'Search for auth-migration'"
