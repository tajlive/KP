#!/bin/bash
# 🔥 ONE-CLICK SETUP - Maksimal automasjon for Klarpakke
# Kjør: bash ONE_CLICK_SETUP.sh

echo "🚀 Starter maksimal automasjon..."
echo ""

# Sjekk at vi er i riktig mappe
if [ ! -f "package.json" ]; then
    echo "❌ Feil: Kjør dette scriptet fra klarpakke-mappen (der package.json ligger)"
    exit 1
fi

# Kjør full automasjon
bash scripts/MAX_AUTOMATION.sh

echo ""
echo "✅ AUTOMASJON FERDIG!"
echo ""
echo "📋 NÅ MÅ DU GJØRE (30 minutter):"
echo ""
echo "   1. LinkedIn (15 min):"
echo "      cat LINKEDIN_SETUP.txt"
echo ""
echo "   2. Google (5 min):"
echo "      cat GOOGLE_SETUP.txt"
echo ""
echo "   3. Resend SMTP (10 min):"
echo "      cat RESEND_SETUP.txt"
echo ""
