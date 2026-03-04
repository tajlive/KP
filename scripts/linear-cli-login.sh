#!/bin/bash
# Linear CLI Login Helper

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🔑 Linear CLI Login                                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Sjekk om allerede logget inn
echo "Sjekker om du er logget inn..."
if lin me &>/dev/null; then
    echo "✅ Du er allerede logget inn!"
    lin me
    exit 0
fi

echo "Du må logge inn på Linear CLI."
echo ""
echo "Dette vil:"
echo "1. Åpne nettleseren din"
echo "2. Be deg logge inn på Linear (hvis ikke allerede logget inn)"
echo "3. Autorisere CLI-applikasjonen"
echo ""
read -p "Fortsett? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Åpner Linear login..."
    lin login
    
    echo ""
    echo "Etter innlogging i nettleseren, trykk Enter her:"
    read
    
    # Verifiser
    if lin me &>/dev/null; then
        echo "✅ Login vellykket!"
        lin me
    else
        echo "❌ Login feilet eller ikke fullført"
    fi
fi
