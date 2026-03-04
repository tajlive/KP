#!/usr/bin/env bash
set -euo pipefail

# Run the unified deploy script from package.json
# This runs build, pages:build (OpenNext), and pages:deploy (Wrangler)
npm run deploy

# Verify production health
bash scripts/recovery/verify-prod.sh "https://www.klarpakke.no"
