#!/bin/bash
# Vercel Environment Variables Update Script
# Usage: ./scripts/vercel-env-update.sh
# Kjør dette etter Supabase-rotasjon

echo "🔐 Oppdaterer Vercel miljøvariabler..."
echo ""
echo "Lim inn verdiene når du blir spurt:"
echo ""

# Supabase
echo "📋 NEXT_PUBLIC_SUPABASE_URL:"
echo "    Standard: https://vuxbjlykgmzskxbclquf.supabase.co"
vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo ""
echo "📋 NEXT_PUBLIC_SUPABASE_ANON_KEY:"
echo "    (Fra Supabase Dashboard > Settings > API > anon key)"
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo ""
echo "📋 SUPABASE_SERVICE_ROLE_KEY:"
echo "    (Fra Supabase Dashboard > Settings > API > service_role key)"
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Stripe (hvis du vil verifisere/disponere)
echo ""
read -p "Vil du oppdatere Stripe-variabler også? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📋 STRIPE_SECRET_KEY (sk-...):"
    vercel env add STRIPE_SECRET_KEY production
    
    echo ""
    echo "📋 NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_...):"
    vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
    
    echo ""
    echo "📋 STRIPE_WEBHOOK_SECRET (whsec_...):"
    vercel env add STRIPE_WEBHOOK_SECRET production
fi

# Andre kritiske
echo ""
echo "📋 CRON_SECRET (hvis ikke satt):"
read -p "Vil du generere ny CRON_SECRET? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    NEW_SECRET=$(openssl rand -hex 32)
    echo "Ny CRON_SECRET: $NEW_SECRET"
    echo "$NEW_SECRET" | vercel env add CRON_SECRET production
fi

echo ""
echo "✅ Miljøvariabler oppdatert!"
echo ""
echo "Neste steg:"
echo "  vercel --prod"
