#!/bin/bash
# SUPER_MCP Aktivering for Klarpakke
# Bruk: ./activate-super-mcp.sh [level1|level2|level3|all]

set -e

LEVEL=${1:-"level1"}
echo "🚀 Aktiverer SUPER_MCP - $LEVEL"
echo "================================"

case $LEVEL in
  level1)
    echo "📋 Level 1: Grunnleggende Verifisering"
    echo ""
    echo "1️⃣  Sjekker Git config..."
    cd ~/Klarpakke
    echo "   Bruker: $(git config user.name)"
    echo "   Email: $(git config user.email)"
    echo ""
    echo "2️⃣  Sjekker Vercel CLI..."
    vercel --version
    echo ""
    echo "3️⃣  Sjekker produksjons-URL..."
    curl -sI https://www.klarpakke.no/no | grep HTTP
    echo ""
    echo "4️⃣  Sjekker API health..."
    curl -s https://www.klarpakke.no/api/health 2>/dev/null || echo "   ⚠️  Health endpoint ikke funnet"
    echo ""
    echo "✅ Level 1 fullført!"
    ;;
    
  level2)
    echo "🚀 Level 2: Full Deploy"
    ./activate-super-mcp.sh level1
    echo ""
    echo "5️⃣  Bygger prosjekt..."
    cd ~/Klarpakke
    npm run build
    echo ""
    echo "6️⃣  Deploy til Vercel..."
    vercel --prod --yes
    echo ""
    echo "7️⃣  Verifiserer deploy..."
    sleep 10
    curl -sI https://www.klarpakke.no/no | grep HTTP
    echo ""
    echo "✅ Level 2 fullført!"
    ;;
    
  level3)
    echo "🛡️  Level 3: Sikkerhet & Overvåking"
    ./activate-super-mcp.sh level2
    echo ""
    echo "8️⃣  Sjekker Sentry..."
    echo "   (Manuell konfigurasjon nødvendig)"
    echo ""
    echo "9️⃣  Verifiserer CSP..."
    curl -sI https://www.klarpakke.no/no | grep -i content-security
    echo ""
    echo "✅ Level 3 fullført!"
    ;;
    
  all)
    echo "🎯 Level ALL: Komplett Oppsett"
    ./activate-super-mcp.sh level3
    echo ""
    echo "🔟  Verifiserer CI/CD..."
    echo "   Sjekk: https://github.com/tajlive/KP/actions"
    echo ""
    echo "✅ ALLE LEVELS fullført!"
    ;;
    
  *)
    echo "❌ Ukjent level: $LEVEL"
    echo "Bruk: $0 [level1|level2|level3|all]"
    exit 1
    ;;
esac

echo ""
echo "🎉 SUPER_MCP $LEVEL ferdig!"
echo "Sjekk www.klarpakke.no for å verifisere."
