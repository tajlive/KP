#!/bin/bash
# E-POST KAMPANJE - SHELL SCRIPT
# Enklere alternativ til TypeScript

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_FILE="$SCRIPT_DIR/campaign-data.json"

# Farger
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==================== FUNKSJONER ====================

check_env() {
    echo -e "${YELLOW}🔍 Sjekker environment...${NC}"
    
    MISSING=0
    if [ -z "$RESEND_API_KEY" ]; then
        echo -e "${RED}❌ RESEND_API_KEY mangler${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✅ RESEND_API_KEY${NC}"
    fi
    
    if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL mangler${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL${NC}"
    fi
    
    if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
        echo -e "${RED}❌ SUPABASE_SERVICE_ROLE_KEY mangler${NC}"
        MISSING=1
    else
        echo -e "${GREEN}✅ SUPABASE_SERVICE_ROLE_KEY${NC}"
    fi
    
    if [ $MISSING -eq 1 ]; then
        echo ""
        echo "Legg til i .env.local:"
        echo "  RESEND_API_KEY=re_xxxxxxxxxxxx"
        echo "  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co"
        echo "  SUPABASE_SERVICE_ROLE_KEY=eyJ..."
        exit 1
    fi
}

import_csv() {
    CSV_FILE="$1"
    if [ ! -f "$CSV_FILE" ]; then
        echo -e "${RED}❌ Fil ikke funnet: $CSV_FILE${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}📁 Importerer $CSV_FILE...${NC}"
    
    # Parse CSV og lag JSON
    node -e "
const fs = require('fs');
const csv = require('csv-parse/sync');
const crypto = require('crypto');

const content = fs.readFileSync('$CSV_FILE', 'utf-8');
const records = csv.parse(content, { columns: true, skip_empty_lines: true });

const contacts = records
  .filter(r => r.Email && r.Email.includes('@'))
  .map(r => ({
    id: crypto.createHash('md5').update(r.Email).digest('hex').substring(0, 12),
    email: r.Email.toLowerCase().trim(),
    firstName: r['First Name'] || r.FirstName || '',
    lastName: r['Last Name'] || r.LastName || '',
    company: r.Company || '',
    position: r.Position || '',
    source: 'linkedin',
    status: 'pending',
    tags: ['linkedin-network', 'founder-campaign']
  }));

// Fjern duplikater
const unique = new Map();
contacts.forEach(c => unique.set(c.email, c));
const result = Array.from(unique.values());

// Lagre til JSON
const existing = fs.existsSync('$DB_FILE') ? JSON.parse(fs.readFileSync('$DB_FILE', 'utf-8')) : { contacts: [] };
const merged = { 
  contacts: [...existing.contacts, ...result],
  updatedAt: new Date().toISOString()
};
fs.writeFileSync('$DB_FILE', JSON.stringify(merged, null, 2));

console.log('✅ Importert ' + result.length + ' unike kontakter');
console.log('📊 Totalt: ' + merged.contacts.length + ' kontakter');
"
}

show_stats() {
    if [ ! -f "$DB_FILE" ]; then
        echo -e "${YELLOW}Ingen kampanjedata ennå${NC}"
        return
    fi
    
    node -e "
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('$DB_FILE', 'utf-8'));
const contacts = data.contacts || [];

const total = contacts.length;
const sent = contacts.filter(c => c.status === 'sent').length;
const opened = contacts.filter(c => c.openedAt).length;
const clicked = contacts.filter(c => c.clickedAt).length;
const bounced = contacts.filter(c => c.status === 'bounced').length;

console.log('');
console.log('📊 KAMPANJE-STATISTIKK');
console.log('====================');
console.log('Totalt kontakter: ' + total);
console.log('Sendt: ' + sent);
console.log('Åpnet: ' + opened + ' (' + ((opened/sent*100)||0).toFixed(1) + '%)');
console.log('Klikket: ' + clicked + ' (' + ((clicked/sent*100)||0).toFixed(1) + '%)');
console.log('Bounced: ' + bounced);
console.log('');
console.log('Estimert konvertering: ' + Math.round(clicked * 0.5) + '-' + Math.round(clicked * 0.8) + ' studenter');
"
}

send_emails() {
    check_env
    
    if [ ! -f "$DB_FILE" ]; then
        echo -e "${RED}❌ Ingen kontakter å sende til. Importer først.${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}🚀 Forbereder sending...${NC}"
    
    # Dette vil bli implementert med curl/Resend API
    echo -e "${GREEN}✅ Klar til å sende!${NC}"
    echo ""
    echo "For å sende e-poster, bruk web-grensesnittet eller API:"
    echo "  Se: EMAIL_CAMPAIGN_QUICKSTART.md for detaljer"
}

reset_data() {
    if [ -f "$DB_FILE" ]; then
        rm "$DB_FILE"
        echo -e "${GREEN}🗑️ Kampanjedata slettet${NC}"
    else
        echo -e "${YELLOW}Ingen data å slette${NC}"
    fi
}

show_help() {
    cat << 'EOF'
🚀 E-POST KAMPANJE - 100 STUDENTER PÅ 24 TIMER

BRUK:
  ./campaign.sh import <csv-fil>    Importer LinkedIn CSV
  ./campaign.sh stats               Vis statistikk
  ./campaign.sh send                Send e-poster (via API)
  ./campaign.sh reset               Slett all data
  ./campaign.sh check               Sjekk environment
  ./campaign.sh help                Vis denne hjelpen

EKSEMPEL:
  ./campaign.sh import ~/Downloads/Connections.csv
  ./campaign.sh stats
  ./campaign.sh send

EOF
}

# ==================== HOVEDPROGRAM ====================

COMMAND="${1:-help}"

 case "$COMMAND" in
    import)
        import_csv "$2"
        ;;
    stats)
        show_stats
        ;;
    send)
        send_emails
        ;;
    reset)
        reset_data
        ;;
    check)
        check_env
        echo -e "${GREEN}✅ Alt klart!${NC}"
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}Ukjent kommando: $COMMAND${NC}"
        show_help
        exit 1
        ;;
esac
