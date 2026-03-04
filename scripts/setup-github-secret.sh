#!/bin/bash

# =============================================================================
# AUTOMATISK OPPSETT AV GITHUB CRON_SECRET
# =============================================================================

set -e

echo "🔑 Setter opp GitHub Actions Secret: CRON_SECRET"
echo ""

# Hent CRON_SECRET fra .env.local
if [ -f .env.local ]; then
  CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d'=' -f2)
  echo "✅ Fant CRON_SECRET i .env.local"
else
  echo "❌ .env.local ikke funnet!"
  echo "ℹ️ Bruk denne verdien:"
  echo "a18a07d157e02cbe4f4efad46eec7dbcb456ac3e31ae51f67d7e2e73f09e2df8"
  exit 1
fi

# Sjekk om gh CLI er installert
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh) er ikke installert!"
  echo ""
  echo "📝 Installer med:"
  echo "  macOS:   brew install gh"
  echo "  Ubuntu:  sudo apt install gh"
  echo "  Windows: winget install GitHub.cli"
  echo ""
  echo "Eller manuelt: https://cli.github.com/"
  exit 1
fi

echo "✅ GitHub CLI installert"

# Sjekk om bruker er logget inn
if ! gh auth status &> /dev/null; then
  echo "❌ Ikke logget inn i GitHub CLI"
  echo "🔑 Kjør først: gh auth login"
  exit 1
fi

echo "✅ Logget inn i GitHub CLI"
echo ""

# Sett secret
echo "🚀 Setter CRON_SECRET i GitHub..."

if echo "$CRON_SECRET" | gh secret set CRON_SECRET --repo tomarnejensen/klarpakke; then
  echo "✅ CRON_SECRET satt i GitHub!"
  echo ""
  echo "🔍 Verifiserer..."
  
  if gh secret list --repo tomarnejensen/klarpakke | grep -q CRON_SECRET; then
    echo "✅ Verifisert: CRON_SECRET eksisterer"
    echo ""
    echo "🎉 SUKSESS! GitHub Actions cron er nå aktivert!"
    echo ""
    echo "📅 Neste steg:"
    echo "  1. Gå til: https://github.com/tomarnejensen/klarpakke/actions"
    echo "  2. Klikk 'Trading Tick Cron'"
    echo "  3. Klikk 'Run workflow' for å teste"
    echo ""
    echo "⏰ Automatisk kjøring starter om < 5 minutter"
  else
    echo "⚠️  Kunne ikke verifisere secret"
  fi
else
  echo "❌ Feilet å sette secret"
  echo ""
  echo "🛠️ Manuell løsning:"
  echo "  1. Gå til: https://github.com/tomarnejensen/klarpakke/settings/secrets/actions"
  echo "  2. Klikk 'New repository secret'"
  echo "  3. Name: CRON_SECRET"
  echo "  4. Secret: $CRON_SECRET"
  echo "  5. Klikk 'Add secret'"
  exit 1
fi
