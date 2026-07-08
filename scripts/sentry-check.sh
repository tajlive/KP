#!/usr/bin/env bash
# Sentry auto-monitor for Klarpakke
# Henter siste feil fra Sentry API og rapporterer

SENTRY_ORG="klarpakke-h3"
SENTRY_PROJECT="javascript-nextjs"
SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-}"  # Sett via sentry.io → Settings → Auth Tokens

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  echo "⚠️  SENTRY_AUTH_TOKEN ikke satt."
  echo ""
  echo "Slik fikser du:"
  echo "1. Gå til https://sentry.io/settings/account/api/auth-tokens/"
  echo "2. Create New Token → velg: project:read, project:write"
  echo "3. Kopier token, lim inn i .env.local:"
  echo '   SENTRY_AUTH_TOKEN=...'
  exit 1
fi

echo "🔍 Sjekker Sentry for nye feil..."

# Hent unresolved issues
ISSUES=$(curl -s "https://sentry.io/api/0/projects/${SENTRY_ORG}/${SENTRY_PROJECT}/issues/?query=is:unresolved&limit=5" \
  -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for issue in data[:5]:
    title = issue['title']
    count = issue['count']
    culprit = issue['culprit'][:60]
    first = issue['firstSeen'][:10]
    print(f'  🐛 {title[:80]}')
    print(f'     📍 {culprit} ({count}x, first: {first})')
    print()
" 2>/dev/null)

if [ -z "$ISSUES" ]; then
  echo "  ✅ Ingen nye feil!"
else
  echo "$ISSUES"
fi
