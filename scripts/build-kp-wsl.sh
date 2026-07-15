#!/bin/bash
# Klarpakke build script - kjores i WSL Ubuntu
set -e

BUILD_DIR=/home/taj/kp-build
OUTPUT_DIR=/mnt/c/Users/taj/build-output
NODE_OPTIONS="--max-old-space-size=4096"

echo "=== Klarpakke WSL Build ==="

# Rydd og klon
rm -rf "$BUILD_DIR"
git clone --depth 1 https://github.com/tajlive/KP.git "$BUILD_DIR"
cd "$BUILD_DIR"
echo "Repo cloned"

# Installer avhengigheter
npm ci
echo "npm ci done"

# Bygg
export NEXT_PUBLIC_SUPABASE_URL="https://pskhryjzkobytnfwucrb.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="__SUPABASE_ANON_KEY__"
export SUPABASE_SERVICE_ROLE_KEY="__SERVICE_ROLE_KEY__"
export CLOUDFLARE_API_TOKEN="__CF_TOKEN__"

echo "Building..."
npm run cf:build
echo "Build complete"

# Pakk og kopier til Windows
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cp -r .open-next "$OUTPUT_DIR/.open-next" 2>/dev/null || true
cp -r .next "$OUTPUT_DIR/.next" 2>/dev/null || true
echo "Artifacts ready at $OUTPUT_DIR"
echo "BUILD_COMPLETE"
