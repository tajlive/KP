#!/bin/bash
# Deploy script for Vercel

set -e

echo "🚀 Deploying to Vercel..."

# Check if logged in
if ! vercel whoami &>/dev/null; then
    echo "❌ Not logged in to Vercel. Run: vercel login"
    exit 1
fi

echo "✅ Logged in as: $(vercel whoami)"

# Deploy to production
echo ""
echo "📦 Building and deploying..."
vercel --yes --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Check deployment at: https://klarpakke.vercel.app"
echo "2. Update DNS to point www.klarpakke.no to Vercel"
echo "3. Test OAuth flow"
