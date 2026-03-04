#!/bin/bash
set -e

# Les fra .env.local
source .env.local

echo "📝 Setter environment variables i Cloudflare..."
echo "⚠️  Dette krever manuell GUI-aksess foreløpig (wrangler støtter ikke pages env vars ennå)"
echo ""
echo "Gå til: https://dash.cloudflare.com/pages/klarpakke/settings/environment-variables"
echo ""
echo "Legg til disse (Production):"
echo "----------------------------"
echo "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL"
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY"

