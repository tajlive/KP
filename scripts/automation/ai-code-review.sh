#!/bin/bash
# AI Code Review - Automatisk kodegjennomgang
# Kjør: bash scripts/automation/ai-code-review.sh

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🤖 AI Code Review                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Sjekk for endringer
if git diff --cached --quiet && git diff --quiet; then
    echo "Ingen endringer å reviewe"
    exit 0
fi

# Hent endrede filer
CHANGED_FILES=$(git diff --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx|js|jsx)$' || true)

ALL_FILES=$(echo -e "$CHANGED_FILES\n$STAGED_FILES" | sort -u | grep -v '^$')

if [ -z "$ALL_FILES" ]; then
    echo "Ingen relevante filer å reviewe"
    exit 0
fi

echo "📁 Filer til review:"
echo "$ALL_FILES" | head -10
if [ $(echo "$ALL_FILES" | wc -l) -gt 10 ]; then
    echo "... og flere"
fi
echo ""

# Vis diff stat
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Endringsstatistikk:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git diff --stat | tail -10

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 AI Code Review Punkter:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Sjekk for vanlige problemer
echo "1. Type Safety:"
if git diff | grep -q "any\|unknown"; then
    echo "   ⚠️  'any' eller 'unknown' funnet - vurder strengere typer"
else
    echo "   ✅ God type safety"
fi

echo ""
echo "2. Error Handling:"
if git diff | grep -q "catch.*{"; then
    echo "   ⚠️  Sjekk at alle catch-blocks håndterer feil riktig"
else
    echo "   ✅ Ingen nye catch-blocks"
fi

echo ""
echo "3. Console Statements:"
CONSOLE_COUNT=$(git diff | grep -c "console\." || echo "0")
if [ "$CONSOLE_COUNT" -gt 0 ]; then
    echo "   ⚠️  $CONSOLE_COUNT console statements funnet"
else
    echo "   ✅ Ingen console statements"
fi

echo ""
echo "4. Performance:"
if git diff | grep -q "useEffect.*\[\]"; then
    echo "   ⚠️  Sjekk useEffect dependencies"
fi
if git diff | grep -q "map.*filter\|filter.*map"; then
    echo "   💡 Vurder å kombinere map/filter for bedre performance"
fi

echo ""
echo "5. Security:"
if git diff | grep -q "innerHTML\|dangerouslySetInnerHTML"; then
    echo "   ⚠️  InnerHTML funnet - sikkerhetsrisiko!"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 Tips for god kode:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "• Bruk meningsfulle variabelnavn"
echo "• Del opp store funksjoner"
echo "• Legg til kommentarer for kompleks logikk"
echo "• Sjekk for duplisert kode"
echo "• Vurder å legge til tester"
echo ""
