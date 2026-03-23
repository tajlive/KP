#!/usr/bin/env bash
# Når `npm run db:push` sier: «Remote migration versions not found in local migrations directory»
# med hint om `supabase migration repair --status reverted …`:
#
#   IKKE skriv «supabase migration repair / db pull» som én kommando — det er to separate ting.
#   repair krever: npx supabase migration repair --status reverted <versjon> … --linked
#
# Standard (oppdatert etter feilmelding mars 2026): rever av «spøkelsesversjoner» på remote
# som ikke finnes som filer i repo. Etterpå: npm run db:push:all (evt. med yes | for ikke-interaktiv).
#
# Bruk: bash scripts/db-repair-migration-history.sh
#    eller: npm run db:repair:drift

set -euo pipefail
cd "$(dirname "$0")/.."

echo "🔧 Reparerer remote schema_migrations (reverted på versjoner som mangler lokalt)…"
# Flere versjoner i én repair-kall (Supabase CLI støtter liste)
npx supabase migration repair --status reverted \
  20260313 \
  20260318042314 \
  20260322020127 \
  --linked

echo ""
echo "✅ Repair ferdig. Neste:"
echo "   npm run db:push:all"
echo ""
echo "   (Hvis CLI spør [Y/n], svar Y — eller: yes | npx supabase db push --linked --include-all)"
echo ""
echo "Sjekk historikk: npx supabase migration list --linked"
