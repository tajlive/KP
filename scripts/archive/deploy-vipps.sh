#!/bin/bash

echo "🚀 Deployer Vipps integrasjon til Vercel..."
echo ""

# Sjekk at Vercel CLI er installert
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI er ikke installert"
    echo "Installer med: npm i -g vercel"
    exit 1
fi

echo "📋 Oppsummering av endringer:"
echo "  ✅ Vipps API endepunkter"
echo "  ✅ Vipps betalingsknapp"
echo "  ✅ PaymentMethodSelector komponent"
echo "  ✅ Database migrasjon"
echo "  ✅ Webhook konfigurasjon"
echo ""

echo "🔑 Miljøvariabler som vil bli satt:"
echo "  VIPPS_CLIENT_ID=${VIPPS_CLIENT_ID:0:8}..."
echo "  VIPPS_CLIENT_SECRET=${VIPPS_CLIENT_SECRET:0:8}..."
echo "  VIPPS_SUBSCRIPTION_KEY=${VIPPS_SUBSCRIPTION_KEY:0:8}..."
echo "  VIPPS_MERCHANT_SERIAL_NUMBER=$VIPPS_MERCHANT_SERIAL_NUMBER"
echo "  VIPPS_API_URL=$VIPPS_API_URL"
echo ""

read -p "Fortsette med deploy? (j/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Jj]$ ]]; then
    echo "Avbrutt."
    exit 0
fi

echo ""
echo "📤 Deployer til Vercel..."
vercel --prod

echo ""
echo "✅ Deploy fullført!"
echo ""
echo "🔗 Viktige URL-er:"
echo "  Test betaling: https://klarpakke.no/no/test-betaling"
echo "  Checkout: https://klarpakke.no/no/checkout?plan=bachelor"
echo ""
echo "⚠️  Husk å:"
echo "  1. Sette opp webhook i Vipps portalen"
echo "  2. Kjøre: supabase db push"
echo ""
