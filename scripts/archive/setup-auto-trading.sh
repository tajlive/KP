#!/bin/bash

# Klarkpakke Auto-Trading Setup - Automatisk installasjon
# Prøver flere metoder til en fungerer

cd "$(dirname "$0")"

echo "🚀 Klarpakke Auto-Trading Setup"
echo "================================"
echo ""

# Farger
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

# Metode 1: Prøv Supabase CLI
print_status "🔧 Metode 1: Prøver Supabase CLI..."
if command -v supabase &> /dev/null; then
    echo "Supabase CLI funnet"
    
    # Sjekk om logget inn
    if supabase projects list &> /dev/null; then
        print_success "✓ Logget inn på Supabase"
        
        if supabase db push; then
            print_success ""
            print_success "✅ Database migrasjon vellykket via Supabase CLI!"
            exit 0
        else
            print_warning "⚠️  Supabase CLI db push feilet, prøver neste metode..."
        fi
    else
        print_warning "⚠️  Ikke logget inn på Supabase CLI, prøver neste metode..."
    fi
else
    print_warning "⚠️  Supabase CLI ikke installert, prøver neste metode..."
fi

echo ""

# Metode 2: Prøv Python script
print_status "🔧 Metode 2: Prøver Python script..."
if command -v python3 &> /dev/null; then
    if python3 scripts/setup_auto_trading.py; then
        exit 0
    else
        print_warning "⚠️  Python script feilet, prøver neste metode..."
    fi
else
    print_warning "⚠️  Python3 ikke installert, prøver neste metode..."
fi

echo ""

# Metode 3: Prøv Node.js script
print_status "🔧 Metode 3: Prøver Node.js script..."
if command -v node &> /dev/null; then
    if node scripts/setup-auto-trading.js; then
        exit 0
    else
        print_warning "⚠️  Node.js script feilet, prøver neste metode..."
    fi
else
    print_warning "⚠️  Node.js ikke installert, prøver neste metode..."
fi

echo ""

# Metode 4: Manuell instruksjon
print_status "📋 Metode 4: Manuell oppsett"
echo ""
print_warning "Automatiske metoder feilet. Følg manuell instruksjon:"
echo ""
echo "1. Gå til Supabase Dashboard:"
print_status "   https://supabase.com/dashboard"
echo ""
echo "2. Velg ditt Klarpakke-prosjekt"
echo ""
echo "3. Klikk på 'SQL Editor' i venstre meny"
echo ""
echo "4. Klikk 'New query'"
echo ""
echo "5. Åpne filen:"
print_status "   supabase/migrations/20260208000000_add_auto_trading.sql"
echo ""
echo "6. Kopier hele innholdet og lim inn i SQL Editor"
echo ""
echo "7. Klikk 'Run'"
echo ""

# Kopier filsti til clipboard (macOS)
MIGRATION_FILE="$(pwd)/supabase/migrations/20260208000000_add_auto_trading.sql"
if command -v pbcopy &> /dev/null; then
    echo "$MIGRATION_FILE" | pbcopy
    print_success "✓ Fil-sti kopiert til clipboard!"
fi

echo ""
print_success "✅ Når SQL er kjørt, er auto-trading klar!"
echo ""
print_status "Neste steg:"
echo "   • Gå til /admin/test-auto-trading"
echo "   • Kjør en test med mock-signal"
echo "   • Verifiser at alt fungerer"
