#!/usr/bin/env bash
# bootstrap-github-secrets.sh
# Laster alle secrets fra .env.local direkte til GitHub via gh CLI.
# Kjøres KUN én gang for bootstrapping — deretter tar workflow secret-sync.yml over.
#
# Krav: gh auth login (med repo + secrets scope)
# Bruk: bash scripts/bootstrap-github-secrets.sh [--dry-run]

set -euo pipefail

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
if [[ -z "$REPO" ]]; then
  echo "❌ Klarer ikke detektere repo. Kjør: gh auth login"
  exit 1
fi

ENV_FILE=".env.local"
[[ ! -f "$ENV_FILE" ]] && { echo "❌ $ENV_FILE ikke funnet"; exit 1; }

# Secrets som skal bootstrappes (superset av workflow-behov)
SECRETS=(
  SUPABASE_ACCESS_TOKEN
  SUPABASE_PROJECT_REF
  SUPABASE_SERVICE_ROLE_KEY
  SUPABASE_JWT_SECRET
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  POSTGRES_URL_NON_POOLING
  DATABASE_URL
  VERCEL_TOKEN
  VERCEL_ORG_ID
  VERCEL_PROJECT_ID
  CRON_SECRET
  CRON_API_KEY
  SENTRY_AUTH_TOKEN
  RESEND_API_KEY
  CLOUDFLARE_API_TOKEN
  SANITY_API_READ_TOKEN
  SANITY_API_WRITE_TOKEN
  SANITY_WEBHOOK_SECRET
  E2E_USER_EMAIL
  E2E_USER_PASSWORD
  GH_PAT
)

echo ""
echo "🔑 Bootstrap GitHub Secrets → $REPO"
echo "   Dry-run: $DRY_RUN"
echo ""

OK=0; SKIP=0; FAIL=0

for KEY in "${SECRETS[@]}"; do
  # Hent verdi fra .env.local (støtter KEY=value og KEY="value")
  VALUE=$(grep -E "^${KEY}=" "$ENV_FILE" | head -1 | sed "s/^${KEY}=//;s/^\"/\//;s/\"$//" || true)

  if [[ -z "$VALUE" ]]; then
    echo "  ⏭️  SKIP   $KEY (ikke i $ENV_FILE)"
    ((SKIP++)) || true
    continue
  fi

  if $DRY_RUN; then
    echo "  🔵 DRY    $KEY = ${VALUE:0:8}..."
    ((OK++)) || true
  else
    if echo "$VALUE" | gh secret set "$KEY" --repo "$REPO" 2>/dev/null; then
      echo "  ✅ SATT   $KEY"
      ((OK++)) || true
    else
      echo "  ❌ FEIL   $KEY"
      ((FAIL++)) || true
    fi
  fi
done

echo ""
echo "📊 Resultat: $OK satt, $SKIP hoppet over, $FAIL feilet"
echo ""

if (( FAIL > 0 )); then
  echo "❌ Noen secrets feilet. Sjekk gh auth status og at tokenet har 'secrets' write-tilgang."
  exit 1
fi

if ! $DRY_RUN; then
  echo "✅ Bootstrap fullført! GitHub Actions workflow secret-sync.yml tar over herfra."
  echo "   Verifiser på: https://github.com/$REPO/settings/secrets/actions"
fi
