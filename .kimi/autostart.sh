#!/bin/bash
# KIMI Autostart Sequence — v2.3 (2026-04-16)
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

# 2. MemPalace Wake-up
echo -e "${BLUE}🏛️  MemPalace Context:${NC}"
if command -v mempalace >/dev/null 2>&1; then
    mempalace wake-up --wing klarpakke 2>/dev/null | tail -12 | sed 's/^/  /' || echo "  (wake-up returned non-zero)"
    echo ""
    echo -e "  ${CYAN}Recent decisions:${NC}"
    mempalace search "decision" --wing klarpakke 2>/dev/null | head -6 | sed 's/^/    /' || true
else
    echo "  ℹ️  mempalace not in PATH — skipping"
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

# 6. Ready Message
echo -e "${GREEN}✅ KIMI Ready!${NC}"
echo "=========================="
echo ""
echo "Quick commands:"
if command -v mempalace >/dev/null 2>&1; then
    echo "  mempalace search \"auth\"         # Search memory"
    echo "  mempalace wake-up --wing klarpakke  # Full context"
fi
echo "  bash .kimi/kimi-architect.sh "task"  # Lead architect mode"
echo "  npm run swarm:review            # Run swarm QA"
echo "  npm run verify                  # Check environment"
echo "  npm run dev                     # Start dev server"
echo ""
echo "YOLO mode: ACTIVE | Skills: AUTO | Architect: READY"
echo ""
