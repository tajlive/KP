#!/bin/bash
# Setup permanent Cloudflare tunnel for Klarpakke
# Krever: cloudflared login (gjøres en gang)

echo "🚀 Setter opp permanent Cloudflare tunnel..."
echo ""

# Sjekk om brukeren er logget inn
if [ ! -f ~/.cloudflared/*.json ]; then
    echo "🔐 Du må logge inn på Cloudflare først:"
    echo "   cloudflared tunnel login"
    echo ""
    echo "Dette åpner en nettleser der du velger din Cloudflare-konto."
    exit 1
fi

echo "✅ Du er logget inn på Cloudflare"
echo ""

# List eksisterende tunneler
echo "📋 Eksisterende tunneler:"
cloudflared tunnel list

echo ""
echo "📝 For å lage en ny permanent tunnel:"
echo "   cloudflared tunnel create klarpakke-dev"
echo ""
echo "📝 For å konfigurere tunnelen:"
echo "   cloudflared tunnel route dns klarpakke-dev klarpakke-dev.din-domain.no"
echo ""
echo "🔧 Deretter start tunnelen med:"
echo "   cloudflared tunnel run klarpakke-dev"
echo ""

# Spør om brukeren vil fortsette
read -p "Vil du lage en ny tunnel nå? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Navn på tunnel (f.eks. klarpakke-dev): " TUNNEL_NAME
    
    echo "🆙 Lager tunnel: $TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME"
    
    echo ""
    echo "📝 Konfigurasjonsfil laget! For å bruke den:"
    echo "   1. cp ~/.cloudflared/${TUNNEL_NAME}.json ./tunnel-credentials.json"
    echo "   2. Lag config.yml (se mal nedenfor)"
    echo ""
fi

echo ""
echo "=== Config.yml mal ==="
cat << 'EOF'
# ~/.cloudflared/config.yml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: klarpakke-dev.din-domain.no
    service: http://localhost:3000
  - service: http_status:404
EOF

echo ""
echo "✨ Ferdig! Start tunnelen med: cloudflared tunnel run <TUNNEL_NAME>"
