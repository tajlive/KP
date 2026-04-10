#!/bin/bash
# OAuth Test med ngrok

echo "🚀 Starter OAuth test-oppsett..."
echo ""

# Sjekk om ngrok er installert
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok ikke funnet. Installer med: brew install ngrok"
    exit 1
fi

# Sjekk om .env.local finnes
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local ikke funnet"
    exit 1
fi

echo "📋 Steg-for-steg:"
echo ""
echo "1️⃣  Start utviklingsserver i en annen terminal:"
echo "   npm run dev"
echo ""
echo "2️⃣  Start ngrok (kjør i denne terminalen):"
echo "   ngrok http 3000"
echo ""
echo "3️⃣  Kopier HTTPS URL (f.eks. https://abc123.ngrok.io)"
echo ""
echo "4️⃣  Oppdater .env.local:"
echo "   NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io"
echo ""
echo "5️⃣  Konfigurer Supabase Auth:"
echo "   Gå til: https://supabase.com/dashboard/project/_/auth/url-configuration"
echo "   Site URL: https://abc123.ngrok.io"
echo "   Redirect URL: https://abc123.ngrok.io/auth/callback"
echo ""
echo "6️⃣  Konfigurer Google OAuth:"
echo "   Gå til: https://console.cloud.google.com/apis/credentials"
echo "   Legg til redirect URI: https://abc123.ngrok.io/auth/callback"
echo ""
echo "7️⃣  Test innlogging på: https://abc123.ngrok.io/login"
echo ""

# Spør om brukeren vil starte ngrok nå
read -p "Start ngrok nå? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🟢 Starter ngrok..."
    ngrok http 3000
else
    echo "👍 Kjør './scripts/test-oauth-ngrok.sh' igjen når du er klar"
fi
