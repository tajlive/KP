#!/bin/bash
# KLA-PROFIT1: Verifiser og sett nødvendige GitHub Secrets
# Bruk: bash scripts/verify-kla-profit1-secrets.sh

set -e

REPO="tajlive/KP"

echo "=========================================="
echo "KLA-PROFIT1: GitHub Secrets Verifisering"
echo "=========================================="
echo ""

# Sjekk gh auth
if ! gh auth status &>/dev/null; then
    echo "❌ Ikke autentisert med GitHub CLI"
    echo "Kjør: gh auth login"
    exit 1
fi

echo "✅ Autentisert med GitHub CLI"
echo ""

# Liste over nødvendige secrets for KLA-PROFIT1
REQUIRED_SECRETS=(
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "E2E_USER_EMAIL"
    "E2E_USER_PASSWORD"
)

OPTIONAL_SECRETS=(
    "SENTRY_AUTH_TOKEN"
    "SLACK_WEBHOOK_URL"
)

echo "Sjekker nødvendige secrets..."
echo ""

MISSING_REQUIRED=()
MISSING_OPTIONAL=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if gh secret list --repo "$REPO" | grep -q "^${secret}\s"; then
        echo "  ✅ $secret"
    else
        echo "  ❌ $secret (MANGLER)"
        MISSING_REQUIRED+=("$secret")
    fi
done

echo ""
echo "Sjekker valgfrie secrets..."
echo ""

for secret in "${OPTIONAL_SECRETS[@]}"; do
    if gh secret list --repo "$REPO" | grep -q "^${secret}\s"; then
        echo "  ✅ $secret"
    else
        echo "  ⚠️  $secret (valgfri)"
        MISSING_OPTIONAL+=("$secret")
    fi
done

echo ""
echo "=========================================="

if [ ${#MISSING_REQUIRED[@]} -eq 0 ]; then
    echo "✅ Alle nødvendige secrets er satt!"
else
    echo "❌ Manglende nødvendige secrets:"
    printf '   - %s\n' "${MISSING_REQUIRED[@]}"
    echo ""
    echo "For å sette secrets, bruk:"
    echo "  gh secret set NAVN --repo $REPO"
    echo ""
    echo "Eller interaktivt:"
    echo "  gh secret set NAVN --repo $REPO --body 'verdi'"
fi

if [ ${#MISSING_OPTIONAL[@]} -gt 0 ]; then
    echo ""
    echo "Valgfrie secrets som mangler:"
    printf '   - %s\n' "${MISSING_OPTIONAL[@]}"
fi

echo ""
echo "=========================================="
echo "Hvordan sette secrets:"
echo "=========================================="
echo ""
echo "Alternativ 1: Fra fil (anbefalt for lange verdier)"
echo "  echo 'verdi' | gh secret set NAVN --repo $REPO"
echo ""
echo "Alternativ 2: Interaktiv (skjul input)"
echo "  gh secret set NAVN --repo $REPO"
echo ""
echo "Alternativ 3: Fra environment variable"
echo "  gh secret set NAVN --repo $REPO --env 'VAR_NAME'"
echo ""
echo "List alle secrets:"
echo "  gh secret list --repo $REPO"
echo ""
echo "Slett en secret:"
echo "  gh secret remove NAVN --repo $REPO"
echo ""

# Tilby å sette manglende secrets interaktivt
if [ ${#MISSING_REQUIRED[@]} -gt 0 ] || [ ${#MISSING_OPTIONAL[@]} -gt 0 ]; then
    echo "=========================================="
    read -p "Vil du sette manglende secrets nå? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for secret in "${MISSING_REQUIRED[@]}" "${MISSING_OPTIONAL[@]}"; do
            echo ""
            echo "Setter: $secret"
            echo "(Skriv verdien, trykk Ctrl+D når ferdig, eller Ctrl+C for å hoppe over)"
            
            if gh secret set "$secret" --repo "$REPO"; then
                echo "✅ $secret satt"
            else
                echo "⚠️  Kunne ikke sette $secret (hoppet over)"
            fi
        done
    fi
fi

echo ""
echo "Ferdig!"
