#!/bin/bash
set -e

echo "🔧 Fikser wrangler.toml syntaks..."

cat > wrangler.toml << 'EOF'
name = "klarpakke"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".open-next"

[env.production]
[env.production.vars]
ENVIRONMENT = "production"
NEXT_PUBLIC_SUPABASE_URL = ""
NEXT_PUBLIC_SUPABASE_ANON_KEY = ""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = ""
EOF

echo "✅ wrangler.toml fikset!"

