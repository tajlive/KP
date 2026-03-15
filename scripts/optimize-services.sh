#!/bin/bash
#
# Klarpakke Service Optimization Script
# Automatiserer konfigurering av Vercel, Supabase og Sentry
#
# Bruk: ./scripts/optimize-services.sh [--dry-run] [--verbose]
#

set -e

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prosjektkonstanter
VERCEL_PROJECT_ID="prj_TIvFmpMttYsHLC4eFkxxCEoILLEY"
VERCEL_TEAM_ID="team_JH76folkKg0SaSV9OtANlQ6L"
SUPABASE_PROJECT_REF="vuxbjlykgmzskxbclquf"
SENTRY_ORG="elbatt-chatbot"
SENTRY_PROJECT="klarpakke-production"
SENTRY_URL="https://de.sentry.io"

# Flagg
DRY_RUN=false
VERBOSE=false

# Parse argumenter
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    *)
      echo -e "${RED}Ukjent argument: $1${NC}"
      exit 1
      ;;
  esac
done

log() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[DEBUG]${NC} $1"
  fi
}

run_cmd() {
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $1"
  else
    verbose "Kjører: $1"
    eval "$1"
  fi
}

echo ""
echo "=============================================="
echo "  Klarpakke Service Optimization"
echo "=============================================="
echo ""

if [ "$DRY_RUN" = true ]; then
  warn "Kjører i dry-run modus - ingen endringer vil bli gjort"
  echo ""
fi

# ============================================
# 1. VERCEL KONFIGURERING
# ============================================
echo -e "${BLUE}━━━ VERCEL ━━━${NC}"

# Sjekk Vercel CLI
if ! command -v vercel &> /dev/null; then
  error "Vercel CLI er ikke installert"
  exit 1
fi

log "Sjekker Vercel autentisering..."
VERCEL_USER=$(vercel whoami 2>/dev/null || echo "")
if [ -z "$VERCEL_USER" ]; then
  error "Ikke logget inn i Vercel. Kjør: vercel login"
  exit 1
fi
success "Logget inn som: $VERCEL_USER"

# Synkroniser miljøvariabler fra Production til Preview
log "Synkroniserer miljøvariabler til Preview..."

# Liste over variabler som skal være i både Production og Preview
SYNC_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_ANON_KEY"
  "SENTRY_AUTH_TOKEN"
  "SENTRY_DSN"
  "NEXT_PUBLIC_SENTRY_DSN"
  "SENTRY_ORG"
  "SENTRY_PROJECT"
)

for var in "${SYNC_VARS[@]}"; do
  # Sjekk om variabelen eksisterer i preview
  EXISTS_PREVIEW=$(vercel env ls preview 2>/dev/null | grep -E "^\s*$var\s" | grep -v "git branch" || echo "")
  EXISTS_PROD=$(vercel env ls production 2>/dev/null | grep -E "^\s*$var\s" || echo "")

  if [ -n "$EXISTS_PROD" ] && [ -z "$EXISTS_PREVIEW" ]; then
    log "Legger til $var i Preview miljø..."
    if [ "$DRY_RUN" = false ]; then
      # Hent verdi fra production
      PROD_VALUE=$(vercel env pull --environment=production /dev/stdout 2>/dev/null | grep "^$var=" | cut -d'=' -f2- | tr -d '"')
      if [ -n "$PROD_VALUE" ]; then
        echo "$PROD_VALUE" | vercel env add "$var" preview --force 2>/dev/null || warn "Kunne ikke legge til $var"
        success "Lagt til $var i Preview"
      fi
    fi
  elif [ -n "$EXISTS_PREVIEW" ]; then
    verbose "$var eksisterer allerede i Preview"
  fi
done

success "Vercel miljøvariabler synkronisert"

# ============================================
# 2. SUPABASE KONFIGURERING
# ============================================
echo ""
echo -e "${BLUE}━━━ SUPABASE ━━━${NC}"

# Sjekk Supabase CLI
if ! command -v supabase &> /dev/null; then
  error "Supabase CLI er ikke installert"
  exit 1
fi

log "Sjekker Supabase prosjektstatus..."
SUPABASE_JSON=$(supabase projects list --output json 2>/dev/null)
SUPABASE_STATUS=$(echo "$SUPABASE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['status'] if d else '')" 2>/dev/null || echo "")
if [ "$SUPABASE_STATUS" = "ACTIVE_HEALTHY" ]; then
  success "Supabase prosjekt er ACTIVE_HEALTHY"
else
  warn "Supabase prosjektstatus: $SUPABASE_STATUS"
fi

# Sjekk Postgres versjon
log "Sjekker Postgres versjon..."
PG_VERSION=$(echo "$SUPABASE_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['database']['postgres_engine'] if d else '')" 2>/dev/null || echo "")
if [ "$PG_VERSION" = "17" ]; then
  success "Postgres versjon: $PG_VERSION (anbefalt)"
else
  warn "Postgres versjon: $PG_VERSION (anbefalt: 17)"
fi

# Push config.toml hvis den eksisterer
if [ -f "supabase/config.toml" ]; then
  log "Pusher Supabase config.toml..."
  if [ "$DRY_RUN" = false ]; then
    supabase config push --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null && success "Config pushet" || warn "Kunne ikke pushe config"
  fi
fi

# Konfigurer Auth URLs via Management API
log "Konfigurerer Supabase Auth URLs..."
if [ -z "$SUPABASE_ACCESS_TOKEN" ]; then
  if [ -f ".env.mcp.local" ]; then
    SUPABASE_ACCESS_TOKEN=$(grep "^SUPABASE_ACCESS_TOKEN=" .env.mcp.local | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  fi
fi

if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
  CURRENT_SITE_URL=$(curl -s "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('site_url',''))" 2>/dev/null || echo "")

  if [ "$CURRENT_SITE_URL" != "https://www.klarpakke.no" ]; then
    log "Oppdaterer Auth URLs..."
    if [ "$DRY_RUN" = false ]; then
      curl -s -X PATCH "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/config/auth" \
        -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
          "site_url": "https://www.klarpakke.no",
          "uri_allow_list": "https://www.klarpakke.no/**,https://klarpakke.no/**,https://*.vercel.app/**"
        }' > /dev/null 2>&1 && success "Auth URLs oppdatert" || warn "Kunne ikke oppdatere Auth URLs"
    fi
  else
    success "Auth URLs er allerede korrekt konfigurert"
  fi
else
  warn "SUPABASE_ACCESS_TOKEN ikke funnet - hopper over Auth URL konfigurasjon"
fi

# Sjekk Edge Functions
log "Sjekker Edge Functions..."
FUNCTIONS_COUNT=$(supabase functions list --project-ref "$SUPABASE_PROJECT_REF" 2>/dev/null | grep -c "ACTIVE" || echo "0")
success "Aktive Edge Functions: $FUNCTIONS_COUNT"

# ============================================
# 3. SENTRY KONFIGURERING
# ============================================
echo ""
echo -e "${BLUE}━━━ SENTRY ━━━${NC}"

# Sjekk Sentry CLI
if ! command -v sentry-cli &> /dev/null; then
  warn "Sentry CLI er ikke installert. Installerer..."
  npm install -g @sentry/cli
fi

# Hent auth token fra .env.production hvis ikke satt
if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  if [ -f ".env.production" ]; then
    export SENTRY_AUTH_TOKEN=$(grep "^SENTRY_AUTH_TOKEN=" .env.production | cut -d'=' -f2 | tr -d '"' | tr -d "'" | tr -d '\n' | tr -d '\\')
  fi
fi

# Fjern eventuelle newlines fra token
SENTRY_AUTH_TOKEN=$(echo "$SENTRY_AUTH_TOKEN" | tr -d '\n' | tr -d '\\n')

if [ -z "$SENTRY_AUTH_TOKEN" ]; then
  warn "SENTRY_AUTH_TOKEN ikke funnet. Hopper over Sentry-konfigurasjon."
else
  log "Sjekker Sentry prosjekt..."

  # Verifiser tilgang med inline token
  SENTRY_PROJECTS=$(SENTRY_AUTH_TOKEN="$SENTRY_AUTH_TOKEN" sentry-cli --url "$SENTRY_URL" projects list --org "$SENTRY_ORG" 2>/dev/null || echo "")
  if echo "$SENTRY_PROJECTS" | grep -q "$SENTRY_PROJECT"; then
    success "Sentry prosjekt funnet: $SENTRY_PROJECT"
  else
    warn "Kunne ikke verifisere Sentry prosjekt"
  fi

  # Sjekk siste releases
  log "Sjekker siste Sentry releases..."
  RELEASES=$(sentry-cli --url "$SENTRY_URL" releases list --org "$SENTRY_ORG" --project "$SENTRY_PROJECT" 2>/dev/null | head -5 || echo "Ingen releases funnet")
  if [ -n "$RELEASES" ]; then
    verbose "Siste releases:\n$RELEASES"
    success "Releases konfigurert"
  fi

  # Opprett .sentryclirc for enklere CLI-bruk
  if [ ! -f ".sentryclirc" ] && [ "$DRY_RUN" = false ]; then
    log "Oppretter .sentryclirc..."
    cat > .sentryclirc << EOF
[defaults]
url = $SENTRY_URL
org = $SENTRY_ORG
project = $SENTRY_PROJECT
EOF
    success "Opprettet .sentryclirc"

    # Legg til i .gitignore hvis ikke der
    if ! grep -q ".sentryclirc" .gitignore 2>/dev/null; then
      echo ".sentryclirc" >> .gitignore
      success "Lagt til .sentryclirc i .gitignore"
    fi
  fi
fi

# ============================================
# 4. VALIDERING
# ============================================
echo ""
echo -e "${BLUE}━━━ VALIDERING ━━━${NC}"

log "Kjører valideringssjekker..."

# Sjekk vercel.json
if [ -f "vercel.json" ]; then
  # Valider JSON
  if python3 -c "import json; json.load(open('vercel.json'))" 2>/dev/null; then
    success "vercel.json er gyldig JSON"
  else
    error "vercel.json er ugyldig JSON"
  fi

  # Sjekk nøkkelinnstillinger
  if grep -q '"framework": "nextjs"' vercel.json; then
    success "Framework: nextjs"
  fi

  if grep -q '"regions"' vercel.json; then
    REGION=$(grep -o '"regions": \[[^]]*\]' vercel.json)
    verbose "Vercel region: $REGION"
  fi
fi

# Sjekk supabase/config.toml
if [ -f "supabase/config.toml" ]; then
  if grep -q "project_id = \"$SUPABASE_PROJECT_REF\"" supabase/config.toml; then
    success "Supabase project_id matcher"
  else
    warn "Supabase project_id i config.toml matcher ikke forventet verdi"
  fi
fi

# Sjekk Sentry config filer
for config in sentry.server.config.ts sentry.edge.config.ts sentry.client.config.ts; do
  if [ -f "$config" ]; then
    if grep -q "tracesSampleRate" "$config"; then
      RATE=$(grep -o "tracesSampleRate: [0-9.]*" "$config" | head -1)
      success "$config: $RATE"
    fi
  fi
done

# ============================================
# 5. OPPSUMMERING
# ============================================
echo ""
echo "=============================================="
echo -e "${GREEN}  OPPSUMMERING${NC}"
echo "=============================================="
echo ""
echo "Vercel:   Node 22.x, Framework nextjs"
echo "Supabase: $SUPABASE_PROJECT_REF (eu-central-1)"
echo "Sentry:   $SENTRY_PROJECT @ $SENTRY_URL"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}Dette var en dry-run. Kjør uten --dry-run for å utføre endringer.${NC}"
fi

echo ""
echo "Manuelle steg (valgfritt, i dashboard):"
echo "  1. Sentry → Project Settings → Alerts:"
echo "     - Sett opp varsler for høy feilrate"
echo "     - Konfigurer Slack/e-post integrasjon"
echo ""
echo "  2. Vercel → Project Settings → Functions:"
echo "     - Juster Max Duration hvis nødvendig (10-60s)"
echo ""
success "Optimalisering fullført!"
