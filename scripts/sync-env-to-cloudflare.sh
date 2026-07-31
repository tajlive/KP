#!/bin/bash
set -euo pipefail

# Last inn .env.local (robust loader — tåler '&' i URL-er)
if [ ! -f .env.local ]; then
  echo "❌ Finner ikke .env.local!"
  exit 1
fi

# shellcheck source=lib/load-env.sh
. "$(dirname "${BASH_SOURCE[0]}")/lib/load-env.sh"

echo "🔄 Synkroniserer env vars til Cloudflare Pages..."

# Sett hver variable med wrangler
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name=klarpakke <<< "$NEXT_PUBLIC_SUPABASE_URL"
npx wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name=klarpakke <<< "$NEXT_PUBLIC_SUPABASE_ANON_KEY"
npx wrangler pages secret put NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --project-name=klarpakke <<< "$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name=klarpakke <<< "$STRIPE_SECRET_KEY"

echo "✅ Alle secrets synkronisert til Cloudflare Pages!"
