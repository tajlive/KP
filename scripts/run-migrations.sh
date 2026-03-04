#!/bin/bash
set -e

echo "🗄️  Running Supabase migrations via SQL Editor..."

# URLs
SUPABASE_URL="https://ajcwdvqgcnugfwupemto.supabase.co"
SQL_EDITOR_URL="$SUPABASE_URL/rest/v1/rpc/query"

echo "📋 Migrations to run:"
ls -1 supabase/migrations/00*.sql 2>/dev/null || echo "No migrations found"

echo ""
echo "⚠️  Åpne SQL Editor og kjør migrations manuelt:"
echo "https://supabase.com/dashboard/project/ajcwdvqgcnugfwupemto/sql/new"
echo ""
echo "Kjør disse filene i rekkefølge:"
for migration in supabase/migrations/00*.sql; do
  if [ -f "$migration" ]; then
    echo "  - $migration"
  fi
done

echo ""
echo "✅ Migrations liste klar (kjør manuelt i SQL Editor)"
