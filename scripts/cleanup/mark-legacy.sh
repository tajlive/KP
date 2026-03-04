#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "==> Markerer gammel Next.js API-arkitektur som legacy..."

# 1) Arkiver Next.js API-ruter (bruker ikke lenger /api/* i Next)
if [ -d "src/app/api" ]; then
  mkdir -p archive/legacy-next-api
  echo " - Flytter src/app/api/* til archive/legacy-next-api/"
  mv src/app/api/* archive/legacy-next-api/ 2>/dev/null || true
  rmdir src/app/api 2>/dev/null || true
else
  echo " - Ingen src/app/api katalog, hopper over."
fi

# 2) Marker gamle arkitektur-/deploy-dokumenter som LEGACY
LEGACY_DOCS=(
  "docs/VERCEL-DEPLOYMENT.md"
  "docs/WEBFLOW-*.md"
  "docs/DEPLOYMENT-QUICKSTART.md"
  "docs/MANUAL-DEPLOYMENT-GUIDE.md"
  "docs/DEPLOYMENT-CHECKLIST-WEBFLOW.md"
)

mkdir -p archive/legacy-docs

for pattern in "${LEGACY_DOCS[@]}"; do
  for file in $pattern; do
    if [ -f "$file" ]; then
      echo " - Arkiverer $file"
      mv "$file" archive/legacy-docs/
    fi
  done
done

# 3) Marker legacy Next.js-konfig som ikke brukes (hvis du har backup / gammel config)
if [ -f "next-kopi.config.js" ]; then
  mkdir -p archive/legacy-config
  echo " - Arkiverer next-kopi.config.js"
  mv next-kopi.config.js archive/legacy-config/
fi

echo "==> Ferdig. Kjør 'git status' for å se hva som ble flyttet."
