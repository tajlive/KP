#!/bin/bash
# Full Audit Script for Klarpakke

echo "======================================"
echo "KLARPAKKE FULL AUDIT & HEALTH CHECK"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "1. CHECKING TRANSLATION FILES..."
echo "-----------------------------------"

# Check for missing keys between en and no
for key in $(jq -r 'paths | map(tostring) | join(".")' messages/en.json | sort | uniq); do
    if ! jq -e ".$key" messages/no.json > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠ Missing in no.json: $key${NC}"
    fi
done

echo ""
echo "2. CHECKING FOR HARDCODED NORWEGIAN TEXT..."
echo "-----------------------------------"

# Common Norwegian words that shouldn't be hardcoded
NORWEGIAN_WORDS=(
    "Skriv inn"
    "Logg inn"
    "Registrer"
    "Lagre"
    "Avbryt"
    "Slett"
    "Rediger"
    "Opprett"
    "Tilbake"
    "Neste"
    "Forrige"
    "Send"
    "Lukk"
    "Åpne"
    "Vis"
    "Skjul"
    "Merk"
    "Velg"
    "Endre"
    "Søk"
    "Filtrer"
    "Sorter"
    "Laster"
    "Vent"
    "OK"
    "Ja"
    "Nei"
)

for word in "${NORWEGIAN_WORDS[@]}"; do
    count=$(grep -rn "\"$word\"" src/app/[locale]/ --include="*.tsx" 2>/dev/null | wc -l)
    if [ $count -gt 0 ]; then
        echo -e "${YELLOW}⚠ Found '$word' in $count places${NC}"
        grep -rn "\"$word\"" src/app/[locale]/ --include="*.tsx" 2>/dev/null | head -3
    fi
done

echo ""
echo "3. CHECKING MOBILE RESPONSIVENESS..."
echo "-----------------------------------"

# Check for common mobile issues
if grep -r "min-w-\[.*px\]" src/ --include="*.tsx" | grep -v "min-w-full\|min-w-0" > /dev/null; then
    echo -e "${YELLOW}⚠ Fixed min-width values found (may break mobile)${NC}"
fi

if grep -r "max-w-\[.*px\]" src/ --include="*.tsx" | head -5 > /dev/null; then
    echo -e "${YELLOW}⚠ Fixed max-width values found${NC}"
fi

echo ""
echo "4. CHECKING IMAGE OPTIMIZATION..."
echo "-----------------------------------"

# Check for unoptimized images
if grep -r "<img" src/ --include="*.tsx" | grep -v "Image" > /dev/null; then
    echo -e "${YELLOW}⚠ Found <img> tags not using Next.js Image component${NC}"
    grep -rn "<img" src/ --include="*.tsx" | grep -v "Image" | head -5
fi

echo ""
echo "5. CHECKING PERFORMANCE ISSUES..."
echo "-----------------------------------"

# Check for console.log
log_count=$(grep -rn "console.log" src/ --include="*.tsx" | wc -l)
echo -e "${YELLOW}⚠ console.log statements found: $log_count${NC}"

# Check for unused imports (basic check)
echo ""
echo "6. CHECKING BUILD STATUS..."
echo "-----------------------------------"

if npm run build > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
else
    echo -e "${RED}✗ Build failed - check /tmp/build.log${NC}"
fi

echo ""
echo "======================================"
echo "AUDIT COMPLETE"
echo "======================================"
