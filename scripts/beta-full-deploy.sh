#!/usr/bin/env bash
# ⚠️  DEPRECATED / LEGACY
# This full-deploy script targets Cloudflare Pages/Coolify and is NOT the current
# production deploy path.
# Current source of truth:
#   - CI/CD: .woodpecker/deploy.yml
#   - Manual deploy: npm run cf:deploy
# Kept for historical/reference purposes only.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

require_cmd() { command -v "$1" >/dev/null 2>&1 || { echo "Mangler kommando: $1"; exit 1; }; }

require_cmd node
require_cmd npm

export CF_PAGES_PROJECT="${CF_PAGES_PROJECT:-klarpakke}"
export CF_PAGES_BRANCH="${CF_PAGES_BRANCH:-main}"
export CF_PAGES_OUTPUT_DIR="${CF_PAGES_OUTPUT_DIR:-out}"

echo "==> 1/5 DB migrasjoner (Supabase)"
bash scripts/supabase/apply-migrations.sh

echo "==> 2/5 Type-check"
npm run type-check

echo "==> 3/5 Build"
npm run build

echo "==> 4/5 Cloudflare Pages deploy"
DEPLOY_URL="$(bash scripts/cloudflare/deploy-pages.sh)"
echo "Deploy URL: $DEPLOY_URL"

echo "==> 5/5 E2E beta-apply (API 2xx + DB-rad)"
node scripts/tests/beta-apply-e2e.mjs "$DEPLOY_URL"

echo "OK: Full beta deploy-kjede ferdig."
