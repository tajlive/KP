#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# MIGRATION SQUASH SCRIPT
# ═══════════════════════════════════════════════════════════════════════════
# Bruk: Kjør dette scriptet for å lage én baseline-fil fra alle migrasjoner
# ═══════════════════════════════════════════════════════════════════════════

set -e

echo "🗄️  Supabase Migration Squash"
echo "=============================="
echo ""

# Config
MIGRATIONS_DIR="supabase/migrations"
OUTPUT_FILE="supabase/migrations/001_baseline.sql"
KEEP_LAST=10  # Behold siste 10 migrasjoner

echo "📊 Status:"
echo "  - Totale migrasjoner: $(ls $MIGRATIONS_DIR/*.sql | wc -l)"
echo "  - Beholder siste: $KEEP_LAST"
echo ""

# Step 1: Backup
echo "💾 Lager backup..."
mkdir -p backups
tar -czf "backups/migrations-$(date +%Y%m%d-%H%M%S).tar.gz" $MIGRATIONS_DIR/
echo "  ✅ Backup lagret i backups/"
echo ""

# Step 2: Generate schema dump (må kjøres mot database)
echo "📤 Genererer schema dump..."
echo "  ℹ️  Dette må kjøres mot en oppdatert database:"
echo "     pg_dump --schema-only --no-owner --no-privileges \\"
echo "       -h db.xxx.supabase.co -U postgres \\"
echo "       -d postgres > $OUTPUT_FILE"
echo ""

# Step 3: Instructions
echo "📝 Instruksjoner:"
echo "  1. Kjør: pg_dump (kommando over)"
echo "  2. Sjekk at $OUTPUT_FILE ser riktig ut"
echo "  3. Behold kun siste $KEEP_LAST migrasjoner:"
echo "     ls -t $MIGRATIONS_DIR/*.sql | tail -n +$((KEEP_LAST + 1)) | xargs rm"
echo "  4. Test på staging først!"
echo "  5. Commit og push"
echo ""

echo "⚠️  VIKTIG:"
echo "  - Kjør ALDRI dette på production uten backup"
echo "  - Test alltid på staging først"
echo "  - Sjekk at alle RLS policies er med"
echo "  - Verifiser at indexes er korrekte"
echo ""
