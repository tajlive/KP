#!/bin/bash
# Test OAuth endpoint functionality

echo "═══════════════════════════════════════════════════════════════"
echo "  OAuth Endpoint Test"
echo "═══════════════════════════════════════════════════════════════"
echo ""

TUNNEL_URL="https://ringtones-dedicated-mutual-scoring.trycloudflare.com"
LOCAL_URL="http://localhost:3000"

echo "🔍 Tester OAuth endpoints..."
echo ""

# Test 1: Sjekk at login-siden laster
echo "1. Sjekker login-side..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL/login" 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ]; then
    echo "   ✅ Login-side OK (HTTP 200)"
else
    echo "   ❌ Login-side feilet (HTTP $HTTP_STATUS)"
fi

# Test 2: Sjekk at auth/callback er tilgjengelig
echo ""
echo "2. Sjekker auth/callback..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$TUNNEL_URL/auth/callback" 2>/dev/null)
if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "307" ] || [ "$HTTP_STATUS" = "302" ]; then
    echo "   ✅ Auth callback OK (HTTP $HTTP_STATUS)"
else
    echo "   ❌ Auth callback feilet (HTTP $HTTP_STATUS)"
fi

# Test 3: Sjekk Supabase Auth endpoint
echo ""
echo "3. Sjekker Supabase Auth..."
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL /Users/taj/klarpakke/.env.local | cut -d'=' -f2)
if [ -n "$SUPABASE_URL" ]; then
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SUPABASE_URL/auth/v1/authorize?provider=google" 2>/dev/null)
    if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "302" ] || [ "$HTTP_STATUS" = "303" ]; then
        echo "   ✅ Supabase Auth OK (HTTP $HTTP_STATUS)"
    else
        echo "   ⚠️  Supabase Auth svarer (HTTP $HTTP_STATUS) - kan være normalt"
    fi
else
    echo "   ❌ Supabase URL ikke funnet"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Google Cloud Console Sjekkliste"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Åpne: https://console.cloud.google.com/apis/credentials"
echo ""
echo "Under 'OAuth 2.0 Client ID' (Web client), verifiser:"
echo ""
echo "Authorized JavaScript origins:"
echo "   ☐ http://localhost:3000"
echo "   ☐ https://www.klarpakke.no"
echo "   ☐ https://klarpakke.no"
echo "   ☐ $TUNNEL_URL"
echo ""
echo "Authorized redirect URIs:"
echo "   ☐ http://localhost:3000/auth/callback"
echo "   ☐ https://www.klarpakke.no/auth/callback"
echo "   ☐ https://klarpakke.no/auth/callback"
echo "   ☐ $TUNNEL_URL/auth/callback"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Supabase Dashboard Sjekkliste"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Åpne: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration"
echo ""
echo "URL Configuration:"
echo "   Site URL: $TUNNEL_URL"
echo "   Redirect URLs: $TUNNEL_URL/auth/callback"
echo ""
echo "Providers → Google:"
echo "   ☐ Enabled: ON"
echo "   ☐ Client ID: (fra Google Cloud Console)"
echo "   ☐ Secret: (fra Google Cloud Console)"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🧪 Manuell test:"
echo "   1. Åpne: $TUNNEL_URL/login"
echo "   2. Klikk 'Logg inn med Google'"
echo "   3. Sjekk at du blir sendt til Google"
echo "   4. Etter innlogging, sjekk at du kommer tilbake"
echo ""
echo "   Feilmelding i URL?typisk:"
echo "   ?error=redirect_uri_mismatch = URI ikke whitelistet"
echo "   ?error=invalid_client = Feil Client ID"
echo "   ?error=access_denied = Bruker avviste"
echo ""
