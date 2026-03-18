#!/usr/bin/env bash
# Reparer remote migrasjonshistorikk når "Remote migration versions not found in local"
# eller når db pull anbefaler revert av 20260313 og 20260317140000.
# Etterpå: npm run db:push:all (og svar Y)

set -e
cd "$(dirname "$0")/.."

echo "Reparer migrasjonshistorikk (revert 20260313, 20260317140000, og ved duplikat 20260215000008)..."
npx supabase migration repair --status reverted 20260313 --linked
npx supabase migration repair --status reverted 20260317140000 --linked
# Ved 'duplicate key schema_migrations 20260215000008': revert så push kan re-registrere
npx supabase migration repair --status reverted 20260215000008 --linked 2>/dev/null || true
echo "Ferdig. Kjør nå: npm run db:push:all (og svar Y når CLI spør)"
