#!/bin/bash
# KIMI Autostart Sequence — v3.0 (2026-04-30)
# Kjør ved hver KIMI oppstart for maksimal optimalisering

set -euo pipefail

KP_DIR="/Users/taj/klarpakke"
cd "$KP_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "🚀 KIMI Autostart Sequence"
echo "=========================="
echo ""

# 1. Git Status
echo -e "${BLUE}📊 Git Status:${NC}"
if git diff --quiet HEAD 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} Working directory clean"
else
    echo -e "  ${YELLOW}⚠️${NC}  Uncommitted changes:"
    git status --short | head -3 | sed 's/^/     /'
fi
echo ""

# 2. MemPalace Wake-up (v3.1.1 MCP)
echo -e "${BLUE}🏛️  MemPalace Context:${NC}"
if [ -f "scripts/mempalace-status.mjs" ]; then
    node scripts/mempalace-status.mjs 2>/dev/null || echo "  (status script returned non-zero)"
else
    echo "  ℹ️  mempalace-status.mjs not found"
fi
echo ""

# 3. Domain Detection & Skills
echo -e "${BLUE}🛠️  Context Detection:${NC}"
if [ -f ".kimi/context-predictor.sh" ]; then
    bash .kimi/context-predictor.sh
else
    echo "  Domain: general (predictor not available)"
fi
echo ""

# 4. Swarm / Architect status
echo -e "${BLUE}🐝 Swarm Status:${NC}"
if [ -f ".knowledge/session/swarm-report-latest.json" ]; then
    SWARM_STATUS=$(cat .knowledge/session/swarm-report-latest.json 2>/dev/null | grep '"swarm_status"' | head -1 | sed 's/.*: "\([^"]*\)".*/\1/' || echo "unknown")
    echo "  Last swarm run: $SWARM_STATUS"
else
    echo "  No recent swarm runs"
fi
echo ""

# 5. Quick Stats
echo -e "${BLUE}📈 Project Stats:${NC}"
echo "  Node: $(node --version 2>/dev/null || echo 'N/A')"
echo "  Branch: $(git branch --show-current 2>/dev/null || echo 'N/A')"
echo "  Last commit: $(git log -1 --format=%h 2>/dev/null || echo 'N/A')"
echo ""

# 6. MCP Status
echo -e "${BLUE}🔌 MCP Servers:${NC}"
if [ -f "$HOME/.kimi/mcp.json" ]; then
    MCP_COUNT=$(grep -c '"command"' "$HOME/.kimi/mcp.json" 2>/dev/null || echo "0")
    echo "  Active profile: $(basename $(readlink "$HOME/.kimi/mcp.json" 2>/dev/null) || echo 'mcp.json') ($MCP_COUNT servers)"
else
    echo "  No MCP config found"
fi
echo ""

# 7. Ready Message
echo -e "${GREEN}✅ KIMI Ready!${NC}"
echo "=========================="
echo ""
echo "Quick commands:"
echo "  node scripts/mempalace-status.mjs  # MemPalace status"
echo "  node scripts/mempalace-search.mjs  # Search memory"
echo "  bash .kimi/kimi-architect.sh task  # Lead architect mode"
echo "  npm run swarm:review               # Run swarm QA"
echo "  npm run verify                     # Check environment"
echo "  npm run dev                        # Start dev server"
echo ""
echo "YOLO mode: ACTIVE | Skills: AUTO | Architect: READY"
echo ""
