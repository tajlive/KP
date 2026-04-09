#!/bin/bash
# KIMI Autostart Sequence
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
NC='\033[0m' # No Color

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
echo -e "${BLUE}🏛️  MemPalace Wake-up:${NC}"
if [ -f "./scripts/knowledge-search.sh" ]; then
    echo "  Critical decisions loaded:"
    ./scripts/knowledge-search.sh "cron" critical_decisions 2>/dev/null | grep -E "(📄|docs/)" | head -3 | sed 's/^/    /' || echo "    (search available)"
else
    echo "  ⚠️  knowledge-search.sh not found"
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
            echo "  Rooms: auth_system, error_patterns"
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
            echo "  Rooms: project_status"
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
if [ -f "./scripts/mempalace-diary.sh" ] && [ -f ".kimi/diary.log" ]; then
    ENTRIES=$(./scripts/mempalace-diary.sh status 2>/dev/null || echo "0")
    echo "  Total diary entries: $ENTRIES"
    ./scripts/mempalace-diary.sh read 2 2>/dev/null | tail -6 | sed 's/^/  /' || echo "  No entries"
else
    echo "  No diary entries yet"
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
echo "  ./scripts/knowledge-search.sh <query>  # Search memory"
echo "  ./scripts/mempalace-diary.sh read      # View activity"
echo "  npm run verify                         # Check environment"
echo "  npm run dev                            # Start dev server"
echo ""
echo "YOLO mode: ACTIVE | MemPalace: CONNECTED | Skills: AUTO"
echo ""
