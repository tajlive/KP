#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# MEMPALACE WAKE - Laster L0+L1 kontekst for KIMI
# ═══════════════════════════════════════════════════════════════════════════════
# Bruk: source ./scripts/mempalace-wake.sh
#    eller: kimi -p "$(./scripts/mempalace-wake.sh)"
# ═══════════════════════════════════════════════════════════════════════════════

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
if [ -d /Users/taj/klarpakke/memory ]; then
    echo "### Recent Decisions"
    ls -t /Users/taj/klarpakke/memory/*.md 2>/dev/null | head -5 | while read f; do
        echo "- $(basename "$f"): $(head -1 "$f" | sed 's/^# //')"
    done
    echo ""
fi

# Hvis MemPalace er tilgjengelig, bruk wake-up
if command -v mempalace &> /dev/null; then
    # Prøv å få wake-up fra palace
    WAKE_OUTPUT=$(mempalace wake-up 2>/dev/null || echo "")
    if [ -n "$WAKE_OUTPUT" ]; then
        echo "$WAKE_OUTPUT"
    else
        echo "### Active Projects"
        echo "- Klarpakke (trading platform)"
        echo ""
        echo "### Key Context"
        echo "- Stack: Next.js 15, Supabase, Vercel"
        echo "- Auth: Google OAuth + Vipps"
        echo "- Trading: Paper + Live modes"
        echo "- Test: Playwright E2E + Vitest"
    fi
else
    echo "### MemPalace not available"
    echo "Install: pip install mempalace"
fi

echo ""
echo "## Usage"
echo "Ask: 'What did we decide about X?' or 'Search for auth-migration'"
