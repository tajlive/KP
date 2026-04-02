#!/bin/bash
# KLA-PROFIT1 Branch Protection Verifisering
# Bruk: bash scripts/verify-branch-protection.sh

echo "========================================"
echo "KLA-PROFIT1 Branch Protection Check"
echo "========================================"
echo ""

echo "Dette scriptet kan IKKE endre GitHub settings,"
echo "men kan hjelpe deg med å verifisere at alt er satt opp."
echo ""

# Sjekk om gh CLI er installert
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) er ikke installert."
    echo "   Installer med: brew install gh"
    echo "   Eller besøk: https://cli.github.com/"
    echo ""
    echo "Alternativ: Gå manuelt til:"
    echo "https://github.com/tajlive/klarpakke/settings/branches"
    exit 1
fi

# Sjekk om autentisert
if ! gh auth status &> /dev/null; then
    echo "⚠️  Ikke autentisert med GitHub CLI."
    echo "   Kjør: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI installert og autentisert"
echo ""

# Hent branch protection info
echo "Henter branch protection for 'main'..."
echo ""

REPO="tajlive/klarpakke"
BRANCH="main"

# Prøv å hente protection info
gh api repos/$REPO/branches/$BRANCH/protection 2>/dev/null | jq -r '
  "Branch Protection Status:",
  "------------------------",
  "Pull Request Reviews: \(.required_pull_request_reviews != null)",
  "Status Checks: \(.required_status_checks != null)",
  if .required_status_checks then
    "Required Checks:",
    (.required_status_checks.contexts[] // "  (ingen)")
  else
    "  Ingen status checks konfigurert"
  end,
  "",
  "URL: https://github.com/\($REPO)/settings/branches"
' 2>/dev/null || {
    echo "⚠️  Kunne ikke hente branch protection info."
    echo "   Mulige årsaker:"
    echo "   - Branch protection er ikke aktivert"
    echo "   - Token har ikke riktig scope (trenger 'repo')"
    echo ""
    echo "Gå manuelt til:"
    echo "https://github.com/$REPO/settings/branches"
}

echo ""
echo "========================================"
echo "Sjekkliste for manuell verifisering:"
echo "========================================"
echo ""
echo "□ Settings → Branches → Add rule for 'main'"
echo "□ Require pull request before merging: ✅"
echo "□ Require approvals: 1"
echo "□ Dismiss stale PR approvals: ✅"
echo "□ Require review from Code Owners: ✅"
echo "□ Require status checks to pass: ✅"
echo "□ Required checks:"
echo "  □ type-check"
echo "  □ lint"
echo "  □ unit-tests"
echo "  □ build"
echo "  □ e2e-tests"
echo "□ Block force pushes: ✅"
echo ""
echo "Etter oppsett, test med:"
echo "  git checkout feat/ai-profit-max"
echo "  git push origin feat/ai-profit-max"
echo "  # Opprett PR på GitHub"
echo ""
