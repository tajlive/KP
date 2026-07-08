#!/usr/bin/env bash
# Supabase auth-trigger fix — kjør i terminal
# Dette scriptet logger inn på Supabase og disabler den ødelagte triggeren

set -e

echo "🔧 Klarpakke Auth Trigger Fix"
echo ""

# Sjekk om allerede logget inn
if supabase projects list 2>/dev/null | grep -q "klarpakke-prod-v2"; then
  echo "✅ Allerede logget inn på Supabase"
else
  echo "📱 Logger inn på Supabase..."
  supabase login
  echo ""
fi

echo "🔗 Kobler til klarpakke-prod-v2..."
supabase link --project-ref pskhryjzkobytnfwucrb

echo ""
echo "🔧 Disabler auth trigger..."
supabase db query --linked "ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;" 2>&1 || {
  echo ""
  echo "⚠️  CLI har ikke superuser-tilgang. Åpner SQL Editor istedenfor:"
  echo "   https://supabase.com/dashboard/project/pskhryjzkobytnfwucrb/sql/new"
  echo ""
  echo "Lim inn denne SQL-en:"
  echo "  ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;"
  echo ""
  echo "Si ifra når det er gjort, så oppretter jeg testbrukere."
  exit 0
}

echo ""
echo "✅ Auth trigger disabled!"
echo "Nå kan jeg opprette testbrukere."
