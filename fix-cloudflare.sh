#!/bin/bash
# Cloudflare Proxy Fix Script
# Kjør: chmod +x fix-cloudflare.sh && ./fix-cloudflare.sh

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Cloudflare Proxy Fix - Klarpakke.no                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Be om API Token
echo "Cloudflare API Token kreves."
echo "Hent fra: https://dash.cloudflare.com/profile/api-tokens"
echo "Token må ha: Zone:Read + DNS:Edit permissions"
echo ""
read -s -p "Lim inn Cloudflare API Token: " CF_TOKEN
echo ""

export CF_API_TOKEN="$CF_TOKEN"

# Verifiser token
echo ""
echo "=== Verifiserer token ==="
VERIFY=$(curl -s "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer $CF_API_TOKEN")

if echo "$VERIFY" | grep -q '"success":true'; then
    echo "✅ Token gyldig!"
else
    echo "❌ Token ugyldig:"
    echo "$VERIFY" | grep -o '"message":"[^"]*"' | head -1
    exit 1
fi

# Hent Zone ID
echo ""
echo "=== Henter Zone ID ==="
ZONE_RESPONSE=$(curl -s "https://api.cloudflare.com/client/v4/zones?name=klarpakke.no" \
  -H "Authorization: Bearer $CF_API_TOKEN")

ZONE_ID=$(echo "$ZONE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ZONE_ID" ]; then
    echo "❌ Kunne ikke hente Zone ID"
    echo "Sjekk at token har 'Zone:Read' permission"
    exit 1
fi

echo "✅ Zone ID: $ZONE_ID"

# Hent alle DNS records
echo ""
echo "=== Henter DNS records ==="
DNS_RESPONSE=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?per_page=100" \
  -H "Authorization: Bearer $CF_API_TOKEN")

# Sjekk om vi fikk data
if echo "$DNS_RESPONSE" | grep -q '"success":false'; then
    echo "❌ Feil ved henting av DNS records:"
    echo "$DNS_RESPONSE" | grep -o '"message":"[^"]*"' | head -1
    exit 1
fi

# Finn proxied records
echo ""
echo "=== DNS Records med Proxy (orange cloud) ==="
echo "$DNS_RESPONSE" | grep -o '"name":"[^"]*","type":"[^"]*","content":"[^"]*","proxied":true' | while read -r line; do
    NAME=$(echo "$line" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    TYPE=$(echo "$line" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
    CONTENT=$(echo "$line" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    echo "🟠 $NAME ($TYPE) → $CONTENT"
done

echo ""
echo "=== Slår av Proxy for alle records ==="

# Hent record IDs for proxied records
echo "$DNS_RESPONSE" | grep -o '"id":"[^"]*","name":"[^"]*","type":"[^"]*"[^}]*"proxied":true' | while read -r record; do
    RECORD_ID=$(echo "$record" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    RECORD_NAME=$(echo "$record" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    RECORD_TYPE=$(echo "$record" | grep -o '"type":"[^"]*"' | cut -d'"' -f4)
    RECORD_CONTENT=$(echo "$record" | grep -o '"content":"[^"]*"' | cut -d'"' -f4)
    
    echo ""
    echo "Oppdaterer: $RECORD_NAME"
    
    # Oppdater record til proxied: false
    UPDATE=$(curl -s -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
      -H "Authorization: Bearer $CF_API_TOKEN" \
      -H "Content-Type: application/json" \
      --data "{\"type\":\"$RECORD_TYPE\",\"name\":\"$RECORD_NAME\",\"content\":\"$RECORD_CONTENT\",\"proxied\":false}")
    
    if echo "$UPDATE" | grep -q '"success":true'; then
        echo "✅ $RECORD_NAME - Proxy AV (grey cloud)"
    else
        echo "❌ $RECORD_NAME - Feil:"
        echo "$UPDATE" | grep -o '"message":"[^"]*"' | head -1
    fi
done

echo ""
echo "=== Verifisering ==="
echo "Venter 5 sekunder..."
sleep 5

DNS_CHECK=$(curl -s "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?per_page=100" \
  -H "Authorization: Bearer $CF_API_TOKEN")

echo ""
echo "DNS Records etter endring:"
echo "$DNS_CHECK" | grep -o '"name":"[^"]*","type":"[^"]*","proxied":[^,}]*' | while read -r line; do
    NAME=$(echo "$line" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    PROXIED=$(echo "$line" | grep -o '"proxied":[^,}]*' | cut -d':' -f2)
    if [ "$PROXIED" = "true" ]; then
        echo "🟠 $NAME - Proxy PÅ (orange cloud)"
    else
        echo "⚪ $NAME - Proxy AV (grey cloud)"
    fi
done

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FERDIG!                                                   ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  DNS-endringer kan ta 5 minutter til flere timer å         ║"
echo "║  propagere globalt.                                        ║"
echo "║                                                            ║"
echo "║  Test etter 5 minutter:                                    ║"
echo "║  curl -I https://www.klarpakke.no/                         ║"
echo "║                                                            ║"
echo "║  Forventet resultat:                                       ║"
echo "║  - Ingen "Proxy Detected" advarsel i Vercel                 ║"
echo "║  - HTTP 200 for / og /no/login                             ║"
echo "╚════════════════════════════════════════════════════════════╝"
