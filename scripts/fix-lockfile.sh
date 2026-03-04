#!/bin/bash
set -e

echo "🔧 Fikser lockfile-problemer..."

# Fjern alle lockfiles
rm -rf node_modules package-lock.json pnpm-lock.yaml yarn.lock

# Reinstaller med npm
npm install --legacy-peer-deps

# Oppdater dependencies
npm update --legacy-peer-deps

echo "✅ Lockfiles fikset!"
