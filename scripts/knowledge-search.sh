#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# KNOWLEDGE SEARCH - Søk i .knowledge uten ChromaDB
# ═══════════════════════════════════════════════════════════════════════════════
# Workaround for ChromaDB-feil på macOS ARM64
# ═══════════════════════════════════════════════════════════════════════════════

QUERY="${1:-}"

if [ -z "$QUERY" ]; then
    echo "🧠 Knowledge Search"
    echo ""
    echo "Bruk: knowledge-search <søkeord>"
    echo ""
    echo "Eksempler:"
    echo "   knowledge-search auth"
    echo "   knowledge-search TODO"
    echo "   knowledge-search deploy"
    exit 1
fi

echo "🔍 Søker etter: '$QUERY'"
echo ""

# Søk i alle knowledge-filer
RESULTS=$(grep -r -i "$QUERY" .knowledge/ --include="*.md" -l 2>/dev/null | head -10)

if [ -z "$RESULTS" ]; then
    echo "❌ Ingen resultater funnet"
    exit 1
fi

echo "📁 Fant $(echo "$RESULTS" | wc -l) filer:"
echo ""

for file in $RESULTS; do
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 $file"
    echo ""
    
    # Vis matching linjer med kontekst
    grep -i -B2 -A2 "$QUERY" "$file" 2>/dev/null | head -20
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips: Kjør 'npm run knowledge:mine' for å oppdatere index"
