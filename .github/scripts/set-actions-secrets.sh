#!/usr/bin/env bash
# Sett nødvendige GitHub Actions secrets for tajlive/KP.
# Kjør fra repo-rot: bash .github/scripts/set-actions-secrets.sh
# Du blir bedt om å lime inn verdier (eller pipe fra fil: ./set-actions-secrets.sh < .env.local)

set -e
REPO="${GITHUB_REPO:-tajlive/KP}"

echo "Repo: $REPO"
echo "Nødvendige secrets: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, VERCEL_TOKEN, SENTRY_AUTH_TOKEN"
echo ""

for name in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY VERCEL_TOKEN SENTRY_AUTH_TOKEN; do
  echo "Sett $name (Ctrl+D når ferdig, eller lim inn én linje):"
  gh secret set "$name" --repo "$REPO"
done

echo "Ferdig. Sjekk med: gh secret list --repo $REPO"
