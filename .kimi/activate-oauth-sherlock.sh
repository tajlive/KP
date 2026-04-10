#!/bin/bash
# ============================================================
# 🔐 OAuth Sherlock Agent Activator
# Specialized OAuth/Authentication debugging for Klarpakke
# ============================================================

set -e

echo "═══════════════════════════════════════════════════════════"
echo "🕵️  OAuth Sherlock - Authentication Detective"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd "$(dirname "$0")/.."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from klarpakke root directory"
    exit 1
fi

echo -e "${BLUE}📚 Loading OAuth knowledge from MemPalace...${NC}"
echo ""

# Query MemPalace for OAuth context
echo "Recent OAuth issues:"
if command -v mempalace &> /dev/null; then
    mempalace search "OAuth" --limit 5 2>/dev/null || echo "  (MemPalace search not available)"
else
    echo "  (MemPalace CLI not installed)"
fi

echo ""
echo -e "${BLUE}📂 Critical auth files:${NC}"
echo "  • src/middleware/auth.ts"
echo "  • src/middleware/auth-guard.ts"
echo "  • src/app/[locale]/auth/callback/route.ts"
echo "  • src/lib/auth/googleAuth.ts"
echo ""

echo -e "${BLUE}🔧 OAuth Sherlock is ready${NC}"
echo ""
echo "Usage:"
echo "  1. Describe the OAuth issue you're experiencing"
echo "  2. Sherlock will:"
echo "     • Query MemPalace for similar issues"
echo "     • Analyze current auth configuration"
echo "     • Research if needed (Perplexity)"
echo "     • Apply systematic debugging"
echo "     • Document fix in MemPalace"
echo ""
echo -e "${YELLOW}💡 Common issues:${NC}"
echo "  • access_denied → Google OAuth scopes"
echo "  • Session lost → Cookie domain mismatch"
echo "  • Redirect loop → Middleware auth guard conflict"
echo "  • PKCE error → Code verifier cookie issue"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "Ready to investigate. Describe the auth issue:"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Export agent context
export KIMI_AGENT="klarpakke-oauth-sherlock"
export KIMI_AGENT_FILE=".agent/agents/klarpakke-oauth-sherlock.md"
export KIMI_WORKFLOW=".agent/workflows/oauth-debug.md"

# Show agent definition
cat .agent/agents/klarpakke-oauth-sherlock.md | head -50

echo ""
echo -e "${GREEN}✅ OAuth Sherlock activated${NC}"
echo "Agent definition: .agent/agents/klarpakke-oauth-sherlock.md"
echo "Workflow: .agent/workflows/oauth-debug.md"
