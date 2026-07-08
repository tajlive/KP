#!/usr/bin/env bash
# Sentry auto-setup for Klarpakke
# Kjør: bash scripts/setup-sentry.sh

set -e

echo "🔧 Sentry auto-setup for Klarpakke"
echo ""

# Sjekk om DSN allerede er satt
if grep -q "NEXT_PUBLIC_SENTRY_DSN=https" .env.local 2>/dev/null; then
  echo "✅ Sentry DSN allerede konfigurert"
  exit 0
fi

echo "Du trenger en Sentry DSN. To alternativer:"
echo ""
echo "1. AUTOMATISK (anbefalt):"
echo "   npx @sentry/wizard -i nextjs"
echo "   → Velg 'Next.js' → Login med GitHub → Ferdig"
echo ""
echo "2. MANUELT (2 min):"
echo "   a) Gå til https://sentry.io → Sign up with GitHub"
echo "   b) Create Project → Next.js"
echo "   c) Settings → Client Keys → Copy DSN"
echo "   d) Lim inn i .env.local:"
echo '      NEXT_PUBLIC_SENTRY_DSN=https://xxx@yyy.ingest.sentry.io/zzz'
echo ""
echo "Etter DSN er satt → deploy → alle feil fanget automatisk 🔔"
