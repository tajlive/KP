#!/bin/bash
# KIMI Autostart Sequence — v2.1 (FTS5-optimisert)
# Kjør ved hver KIMI oppstart for maksimal optimalisering

set -e

echo ""
echo "🚀 KIMI Autostart Sequence"
echo "=========================="
echo ""

# Farger
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Git Status
echo -e "${BLUE}📊 Git Status:${NC}"
if git diff --quiet HEAD 2>/dev/null; then
    echo -e "  ${GREEN}✅${NC} Working directory clean"
else
    echo -e "  ${YELLOW}⚠️${NC}  Uncommitted changes:"
    git status --short | head -3 | sed 's/^/     /'
fi
echo ""

# 2. MemPalace Wake-up (FTS5)
echo -e "${BLUE}🏛️  MemPalace Wake-up (FTS5):${NC}"
WAKE_OUTPUT=$(mempalace wake-up --wing klarpakke 2>/dev/null | tail -20 || echo "")
if [ -n "$WAKE_OUTPUT" ]; then
    echo "$WAKE_OUTPUT" | head -12 | sed 's/^/  /'
else
    echo "  Using local knowledge graph..."
fi
echo ""

# 3. Domain Detection & Skills
echo -e "${BLUE}🛠️  Context Detection:${NC}"
if [ -f ".kimi/context-predictor.sh" ]; then
    DOMAIN=$(.kimi/context-predictor.sh --json 2>/dev/null | grep -o '"domain": "[^"]*"' | cut -d'"' -f4 || echo "general")
    echo "  Domain: ${YELLOW}$DOMAIN${NC}"
    
    case "$DOMAIN" in
        auth)
            echo "  Skills: vulnerability-scanner, security-testing"
            echo "  Rooms: auth_system, auth, error_patterns"
            ;;
        trading)
            echo "  Skills: crypto-specialist, api-patterns"
            echo "  Rooms: critical_decisions, api_contracts"
            ;;
        api)
            echo "  Skills: api-patterns, rate-limiting"
            echo "  Rooms: api_contracts"
            ;;
        ui)
            echo "  Skills: frontend-design, nextjs-react-expert"
            echo "  Rooms: ux_engineering"
            ;;
        *)
            echo "  Skills: clean-code, testing-patterns"
            echo "  Rooms: critical_decisions"
            ;;
    esac
else
    echo "  Domain: general (predictor not available)"
fi
echo ""

# 4. Recent Activity
echo -e "${BLUE}📖 Recent Activity:${NC}"
DIARY_COUNT=$(find ~/.mempalace/palace -name "diary" -o -name "kimi_sessions" 2>/dev/null | wc -l || echo "0")
if [ "$DIARY_COUNT" -gt 0 ]; then
    echo "  Diary wings active: $DIARY_COUNT"
    mempalace status 2>/dev/null | grep "drawers" | sed 's/^/  /' || echo "  Status available"
else
    echo "  No recent diary entries"
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
echo "  mempalace search \"auth\"         # Search memory (FTS5)"
echo "  mempalace wake-up --wing klarpakke  # Full context"
echo "  npm run verify                  # Check environment"
echo "  npm run dev                     # Start dev server"
echo ""
echo "YOLO mode: ACTIVE | MemPalace: FTS5 | Skills: AUTO"
echo ""
