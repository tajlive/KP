#!/bin/bash
set -euo pipefail

OUTPUT_DIR=".open-next/assets"
PROJECT_ROOT="$(pwd)"

echo "🔧 Cloudflare Pages Post-Build Fix"
echo "=================================="

if [ ! -d "$OUTPUT_DIR" ]; then
  echo "❌ Error: $OUTPUT_DIR not found"
  exit 1
fi

cd "$OUTPUT_DIR"

# Copy security headers
echo ""
echo "🔒 Copying security headers..."
if [ -f "$PROJECT_ROOT/public/_headers" ]; then
  cp "$PROJECT_ROOT/public/_headers" "_headers"
  echo "  ✅ _headers copied"
else
  echo "  ⚠️  Warning: public/_headers not found"
fi

# Copy server functions to functions directory
echo ""
echo "📦 Setting up Functions..."
if [ -d "$PROJECT_ROOT/.open-next/server-functions/default" ]; then
  mkdir -p functions
  cp "$PROJECT_ROOT/.open-next/server-functions/default/index.mjs" functions/index.mjs
  echo "  ✅ Functions bundle copied"
else
  echo "  ⚠️  Warning: server-functions not found"
fi

# Create _routes.json for routing
echo ""
echo "🛣️  Creating _routes.json..."
cat > _routes.json << 'EOF'
{
  "version": 1,
  "include": ["/*"],
  "exclude": ["/_next/*", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/icons/*", "/images/*", "/videos/*"]
}
EOF
echo "  ✅ _routes.json created"

echo ""
echo "📁 Output structure:"
ls -la | head -15

echo ""
echo "✅ Post-build fix complete!"
