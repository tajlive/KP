#!/bin/bash
# KLA-PROFIT1: GitHub CLI autentisering og verifisering
# Kjør: bash scripts/gh-auth-and-verify.sh

set -e

echo "=========================================="
echo "KLA-PROFIT1: GitHub Setup & Verifisering"
echo "=========================================="
echo ""

# Sjekk om gh er installert
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI ikke installert"
    echo ""
    echo "Installer:"
    echo "  macOS:    brew install gh"
    echo "  Windows:  winget install --id GitHub.cli"
    echo "  Linux:    se https://github.com/cli/cli#installation"
    echo ""
    exit 1
fi

echo "✅ GitHub CLI funnet: $(gh --version | head -1)"
echo ""

# Sjekk autentisering
echo "Sjekker autentisering..."
if gh auth status 2>&1 | grep -q "Logged in to github.com"; then
    echo "✅ Allerede autentisert"
    gh auth status
else
    echo "🔐 Autentisering påkrevd"
    echo ""
    echo "Kjør følgende kommando:"
    echo "  gh auth login"
    echo ""
    echo "Velg:"
    echo "  - GitHub.com"
    echo "  - HTTPS"
    echo "  - Login with a web browser (anbefalt)"
    echo ""
    echo "Etter autentisering, kjør dette scriptet på nytt."
    exit 0
fi

echo ""
echo "=========================================="
echo "Verifisering av konfigurasjon"
echo "=========================================="
echo ""

REPO="tajlive/klarpakke"
BRANCH="main"

# Hent branch protection
echo "Henter branch protection for $BRANCH..."
echo ""

gh api repos/$REPO/branches/$BRANCH/protection --jq '
  {
    "pr_required": (.required_pull_request_reviews != null),
    "status_checks_required": (.required_status_checks != null),
    "strict": (.required_status_checks.strict // false),
    "checks": (.required_status_checks.contexts // [])
  }
' 2>/dev/null | jq -r '
  "Pull Request Reviews påkrevd: \(.pr_required)",
  "Status Checks påkrevd: \(.status_checks_required)",
  "Strict mode: \(.strict)",
  "",
  "Konfigurerte checks:",
  if (.checks | length) > 0 then
    .checks[] | "  ✅ \(.)"
  else
    "  ⚠️  Ingen checks konfigurert"
  end
' || {
    echo "⚠️  Branch protection er IKKE aktivert"
    echo ""
    echo "MÅ konfigureres manuelt i GitHub UI:"
    echo "  https://github.com/$REPO/settings/branches"
}

echo ""
echo "=========================================="
echo "Sjekk PR-status"
echo "=========================================="
echo ""

echo "Åpne PR-er fra feat/ai-profit-max:"
gh pr list --head feat/ai-profit-max --state open 2>/dev/null | head -5 || echo "  Ingen åpne PR-er funnet"

echo ""
echo "=========================================="
echo "Nest steg"
echo "=========================================="
echo ""

if gh api repos/$REPO/branches/$BRANCH/protection &>/dev/null; then
    echo "✅ Branch protection er aktivert"
    echo ""
    echo "For å verifisere fullt:"
    echo "  1. Push feat/ai-profit-max: git push origin feat/ai-profit-max"
    echo "  2. Opprett PR på GitHub"
    echo "  3. Vent på grønne checks (~10-15 min)"
    echo "  4. Merge når klar"
else
    echo "❌ Branch protection mangler"
    echo ""
    echo "Konfigurer i GitHub UI:"
    echo "  https://github.com/$REPO/settings/branches"
    echo ""
    echo "Eller bruk sjekklisten: docs/KLA-PROFIT1-FINAL-CHECKLIST.md"
fi

echo ""
