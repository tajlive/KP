#!/usr/bin/env bash
# setup-all.sh — Automatisk oppsett av .env.local
set -e

echo "╔══════════════════════════════════════════════════════════╗"
echo "║  KLARPAKKE — AUTOMATISK ENV-OPPSETT                     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

# Funksjon for å hente verdi fra env-fil
get_env_value() {
    local file=$1
    local key=$2
    if [ -f "$file" ]; then
        grep -E "^${key}=" "$file" 2>/dev/null | head -1 | sed 's/^[^=]*=//' | tr -d '"' | tr -d "'" || true
    fi
}

echo "📁 Leser eksisterende env-filer..."

# Hent verdier fra eksisterende filer
POSTGRES_URL=$(get_env_value .env.vercel "POSTGRES_URL")
POSTGRES_PRISMA_URL=$(get_env_value .env.vercel "POSTGRES_PRISMA_URL")
SUPABASE_ACCESS_TOKEN=$(get_env_value .env.vercel "SUPABASE_ACCESS_TOKEN")

# Standard verdier
SUPABASE_URL="https://vuxbjlykgmzskxbclquf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2NzA5MTQsImV4cCI6MjA4NjI0NjkxNH0.9b45CqICVUMkq-ByRZFr5LkC2QcvFedUzsWO2kVfkC4"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys"

# Hvis vi har POSTGRES_URL, bruk den
if [ -n "$POSTGRES_URL" ]; then
    DATABASE_URL="$POSTGRES_URL"
    echo "  ✅ Fant POSTGRES_URL i .env.vercel"
else
    DATABASE_URL="postgresql://postgres.vuxbjlykgmzskxbclquf:[PASSORD]@aws-1-eu-central-1.pooler.supabase.com:6543/postgres"
    echo "  ⚠️  POSTGRES_URL ikke funnet — må fylles inn manuelt"
fi

if [ -n "$SUPABASE_ACCESS_TOKEN" ]; then
    echo "  ✅ Fant SUPABASE_ACCESS_TOKEN i .env.vercel"
else
    SUPABASE_ACCESS_TOKEN="sbp_8fb89a14de73c6fbf8408291a0c3a0c9d9a454f4"
    echo "  ℹ️  Bruker standard SUPABASE_ACCESS_TOKEN"
fi

echo ""
echo "📝 Oppretter .env.local..."

cat > .env.local << ENVFILE
# ============================================================
# KLARPAKKE — .env.local (AUTO-GENERERT)
# Sist oppdatert: $(date '+%Y-%m-%d %H:%M:%S')
# ALDRI commit denne filen til git!
# ============================================================

# ── SUPABASE ─────────────────────────────────────────────────
SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
SUPABASE_ACCESS_TOKEN=${SUPABASE_ACCESS_TOKEN}

# Database (fra .env.vercel hvis tilgjengelig)
DATABASE_URL=${DATABASE_URL}

# ── API-NØKLER (MÅ FYLLES INN MANUELT) ──────────────────────
# Disse må hentes fra hver tjenestes dashboard:
#
# GITHUB_TOKEN=ghp_xxx                    → github.com/settings/tokens
# LINEAR_API_KEY=lin_api_xxx              → linear.app/settings/api  
# VERCEL_TOKEN=xxx                        → vercel.com/account/tokens
# STRIPE_SECRET_KEY=sk_live_xxx           → dashboard.stripe.com/apikeys
# SENTRY_AUTH_TOKEN=sntrys_xxx            → sentry.io/settings/account/api/auth-tokens/
# RESEND_API_KEY=re_xxx                   → resend.com/api-keys
#
# ⚠️  VIKTIG: STRIPE-nøkkel som lå i kode må ROTERES umiddelbart!
ENVFILE

echo "  ✅ .env.local opprettet"
echo ""

# Test MCP-tilkoblinger
echo "🧪 Tester MCP-tilkoblinger..."
echo ""
bash scripts/test-mcp-connections.sh

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  OPPSUMMERING                                           ║"
echo "╠══════════════════════════════════════════════════════════╣"
echo "║                                                          ║"
echo "║  ✅ .env.local opprettet med:                            ║"
echo "║     • Supabase URL og nøkler                            ║"
echo "║     • Database URL (hvis funnet i .env.vercel)          ║"
echo "║                                                          ║"
echo "║  ⚠️  MANGLER (må legges inn manuelt):                    ║"
echo "║     • GITHUB_TOKEN                                      ║"
echo "║     • LINEAR_API_KEY                                    ║"
echo "║     • VERCEL_TOKEN                                      ║"
echo "║     • STRIPE_SECRET_KEY  ← ⚠️  ROTER FØRST!             ║"
echo "║     • SENTRY_AUTH_TOKEN                                 ║"
echo "║     • RESEND_API_KEY                                    ║"
echo "║                                                          ║"
echo "║  🔗 Snarveier:                                           ║"
echo "║     github.com/settings/tokens                          ║"
echo "║     linear.app/settings/api                             ║"
echo "║     vercel.com/account/tokens                           ║"
echo "║     dashboard.stripe.com/apikeys                        ║"
echo "║     sentry.io/settings/account/api/auth-tokens/         ║"
echo "║     resend.com/api-keys                                 ║"
echo "║                                                          ║"
echo "╚══════════════════════════════════════════════════════════╝"
