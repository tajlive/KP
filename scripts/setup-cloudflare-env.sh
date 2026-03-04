#!/bin/bash
set -e

echo "🔧 Setting up Cloudflare Pages environment variables..."

SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
SUPABASE_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)

echo "Setting NEXT_PUBLIC_SUPABASE_URL..."
echo "$SUPABASE_URL" | npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL

echo "Setting NEXT_PUBLIC_SUPABASE_ANON_KEY..."
echo "$SUPABASE_KEY" | npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY

echo "✅ Cloudflare env vars satt!"
