#!/bin/bash
# =====================================================
# SETUP ENVIRONMENT VARIABLES FOR CLOUDFLARE
# =====================================================

echo "🚀 Setter opp miljøvariabler for Klarpakke Universitet"
echo "========================================================"
echo ""

# Sjekk at wrangler er installert
if ! command -v wrangler &> /dev/null; then
    echo "❌ wrangler ikke funnet. Installerer..."
    npm install -g wrangler
fi

# Login sjekk
echo "1️⃣ Sjekker Cloudflare login..."
wrangler whoami || (echo "❌ Ikke logget inn. Kjør: wrangler login" && exit 1)

echo ""
echo "2️⃣ Legger til secrets via wrangler..."
echo ""

# Sett dine verdier her (eller bruk som input)
if [ -z "$SUPABASE_URL" ]; then
    echo "Skriv din SUPABASE_SERVICE_ROLE_KEY:"
    read -s SUPABASE_KEY
    echo "Skriv din RESEND_API_KEY:"
    read -s RESEND_KEY
    echo "Skriv din NEXT_PUBLIC_SUPABASE_URL:"
    read SUPABASE_URL
else
    SUPABASE_KEY=$SUPABASE_SERVICE_ROLE_KEY
    RESEND_KEY=$RESEND_API_KEY
    SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
fi

echo ""
echo "Setter secrets..."

# Sett secrets
echo "$SUPABASE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY
echo "$RESEND_KEY" | wrangler secret put RESEND_API_KEY

# Sett public var
wrangler vars put NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"

echo ""
echo "✅ Ferdig! Verifiser med: wrangler vars list"
