#!/bin/bash
set -e

echo "🚀 Cloudflare Pages Deploy"
echo "=========================="

# Build
echo "1. Building..."
npm run build

# Deploy
echo "2. Deploying to Cloudflare..."
wrangler pages deploy out --project-name=klarpakke

echo ""
echo "✅ DEPLOYED!"
echo "🌐 Check: https://klarpakke.pages.dev"
