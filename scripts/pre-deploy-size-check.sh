#!/usr/bin/env bash
# Pre-deploy — sjekk at worker gzipped size er under 10 MB
# Cloudflare Workers limit: 10 MB compressed (gzip)
set -euo pipefail

WORKER=".open-next/server-functions/default/handler.mjs"
if [ ! -f "$WORKER" ]; then
  echo "❌ Worker ikke funnet — kjør npm run cf:build først"
  exit 1
fi

RAW_SIZE=$(du -sk "$WORKER" | cut -f1)
GZIP_SIZE=$(gzip -c "$WORKER" | wc -c | tr -d ' ')
GZIP_MB=$(echo "scale=2; $GZIP_SIZE / 1048576" | bc)
LIMIT_MB=9.5

echo "Raw: ${RAW_SIZE}KB | Gzipped: ${GZIP_MB}MB (limit: ${LIMIT_MB}MB)"

if [ "$(echo "$GZIP_MB > $LIMIT_MB" | bc)" -eq 1 ]; then
  echo "❌ For stor! Reduser bundle"
  exit 1
fi

echo "✅ OK å deploye"
