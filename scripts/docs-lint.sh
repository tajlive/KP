#!/bin/bash

# Klarpakke Universitet - Dokumentasjonslinter
# Sikrer at vi IKKE introduserer ugyldige tier-navn eller priser

ERRORS=0

echo "🔍 Sjekker dokumentasjon mot Universitet-modellen..."

# FORBUDTE BEGREPER (trading/AI-forvaltning)
forbidden=(
    "AI trading signals"
    "auto-trading"
    "Spar-Bot"
    "87% accuracy"
    "VIP community"
    "1-1 coaching"
    "89% nøyaktighet"
    "auto-trade"
    "automatisert trading"
    "trading robot"
    "AI-robot"
)

# GYLDIGE PRISER (4-nivå modell: 0/199/399/999)
valid_prices=("199 kr" "399 kr" "999 kr" "0 kr" "Gratis")

# TIER-NAVN SOM IKKE ER TILLATT I UI/DOKUMENTASJON
forbidden_tiers=("\"Professor\"" "\"Elite\"" "\"VIP\"" "\"Club\"")

# GYLDIGE TIER-NAVN
valid_tiers=("Gratis" "Basis" "Komplett" "Pro")

# Sjekk forbødte begreper (ikke i arkiv)
echo ""
echo "📋 Sjekker for forbødte begreper..."
for term in "${forbidden[@]}"; do
    matches=$(grep -r "$term" docs/ src/ --include="*.md" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "archive/" | grep -v "node_modules" | grep -v "KIMI-PROMPT" | grep -v "KIMI-BRIEF" || true)
    if [ -n "$matches" ]; then
        echo "❌ FORBUDT BEGREP: '$term'"
        echo "$matches" | head -3
        ERRORS=$((ERRORS + 1))
    fi
done

# Sjekk at nye tier-navn brukes i kildekoden (ikke gamle i UI)
echo ""
echo "📋 Sjekker at riktige tier-navn brukes i kildekode..."
source_files=$(find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules || true)
if [ -n "$source_files" ]; then
    for tier in "Professor" "Elite" "VIP"; do
        # Sjekk etter tier-navn i UI-kode (displayName)
        if echo "$source_files" | xargs grep -l "displayName.*\"$tier\"" 2>/dev/null | grep -v node_modules; then
            echo "❌ FORBUDT TIER-NAVN I UI: '$tier'"
            echo "   Gyldige navn: ${valid_tiers[*]}"
            ERRORS=$((ERRORS + 1))
        fi
    done
fi

# Sjekk README for riktige nye priser
echo ""
echo "📋 Sjekker at README har riktige priser (0/199/399/999)..."
if ! grep -q "199 kr" docs/README.md 2>/dev/null; then
    echo "❌ README mangler pris: 199 kr"
    ERRORS=$((ERRORS + 1))
fi
if ! grep -q "399 kr" docs/README.md 2>/dev/null; then
    echo "❌ README mangler pris: 399 kr"
    ERRORS=$((ERRORS + 1))
fi
if ! grep -q "999 kr" docs/README.md 2>/dev/null; then
    echo "❌ README mangler pris: 999 kr"
    ERRORS=$((ERRORS + 1))
fi

# Sjekk at gamle priser (599) ikke finnes
echo ""
echo "📋 Sjekker at gamle priser (599) er fjernet..."
if grep -q "599 kr" docs/README.md 2>/dev/null; then
    echo "❌ UTDATERT PRIS FUNNET: 599 kr (skal være 999 kr)"
    ERRORS=$((ERRORS + 1))
fi

# Sjekk pricing.config.ts for riktige verdier
echo ""
echo "📋 Sjekker pricing.config.ts..."
if [ -f "src/lib/pricing.config.ts" ]; then
    if grep -q "199" src/lib/pricing.config.ts && grep -q "399" src/lib/pricing.config.ts && grep -q "999" src/lib/pricing.config.ts; then
        echo "✅ pricing.config.ts har riktige priser (199/399/999)"
    else
        echo "❌ pricing.config.ts mangler en eller flere priser (199/399/999)"
        ERRORS=$((ERRORS + 1))
    fi
    
    if grep -q "basis" src/lib/pricing.config.ts && grep -q "komplett" src/lib/pricing.config.ts && grep -q "pro" src/lib/pricing.config.ts; then
        echo "✅ pricing.config.ts har riktige tier-navn (basis/komplett/pro)"
    else
        echo "❌ pricing.config.ts mangler en eller flere tiers"
        ERRORS=$((ERRORS + 1))
    fi
    
    # Sjekk at Pro har 999, ikke 599
    if grep -A5 "pro:" src/lib/pricing.config.ts | grep -q "monthlyPrice: 999"; then
        echo "✅ Pro-tier har riktig pris: 999 kr"
    else
        echo "❌ Pro-tier har feil pris (skal være 999 kr)"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ pricing.config.ts finnes ikke"
    ERRORS=$((ERRORS + 1))
fi

# Oppsummering
echo ""
echo "========================================="
if [ $ERRORS -eq 0 ]; then
    echo "✅ ALLE SJEKKER BESTÅTT"
    echo ""
    echo "   4-nivå læringsmodell implementert:"
    echo "   • Gratis (0 kr) - Smakebit"
    echo "   • Basis (199 kr) - Grunnkurs"
    echo "   • Komplett (399 kr) - Alt + sertifikat ⭐"
    echo "   • Pro (999 kr) - Alt + ekstra ressurser"
    echo ""
    echo "   Stripe-priser: Student/Master/Professor (backend)"
    echo "   UI-priser: Gratis/Basis/Komplett/Pro (0/199/399/999)"
    exit 0
else
    echo "❌ FEIL FUNNET: $ERRORS problem(er)"
    echo ""
    echo "HUSK: Klarpakke Universitet er et LÆRINGS-produkt"
    echo "      • Ikke AI trading signals"
    echo "      • Ikke 1-1 coaching"
    echo "      • Kun læring, simulator, kurs"
    exit 1
fi
