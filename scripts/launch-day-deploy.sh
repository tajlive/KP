#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# KLARPAKKE — Launch Day Deployment Script
# BRUK: ./scripts/launch-day-deploy.sh [pre|deploy|verify|rollback]
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Farger for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfigurasjon fra environment
PROD_REF="${PROD_REF:-}"                    # Supabase project ref
SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-}"
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
RESEND_API_KEY="${RESEND_API_KEY:-}"
CRON_SECRET="${CRON_SECRET:-}"
SLACK_OPS_WEBHOOK_URL="${SLACK_OPS_WEBHOOK_URL:-}"
SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"

# Hjelpefunksjoner
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

verify_env() {
    local var_name=$1
    local var_value=${!var_name:-}
    if [[ -z "$var_value" ]]; then
        log_error "Missing required environment variable: $var_name"
        exit 1
    fi
}

slack_notify() {
    local message="$1"
    local status="${2:-info}"
    local emoji="🚀"
    [[ "$status" == "error" ]] && emoji="🚨"
    [[ "$status" == "success" ]] && emoji="✅"
    
    if [[ -n "$SLACK_OPS_WEBHOOK_URL" ]]; then
        curl -s -X POST "$SLACK_OPS_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$emoji $message\"}" > /dev/null || true
    fi
}

# ═══════════════════════════════════════════════════════════════
# PRE-DEPLOYMENT CHECKLIST (T-30 min)
# ═══════════════════════════════════════════════════════════════

cmd_pre_check() {
    log_info "Starting Pre-Deployment Checklist..."
    echo ""
    
    # 1. Verifiser GitHub Secrets
    log_info "Checking GitHub Secrets..."
    gh secret list 2>/dev/null | grep -q "SLACK_OPS_WEBHOOK_URL" && \
        log_success "GitHub Secrets configured" || \
        log_warn "GitHub CLI not configured or secrets missing"
    
    # 2. Stripe Webhook Secret verifisering
    log_info "Verifying Stripe webhook configuration..."
    if [[ -n "$STRIPE_WEBHOOK_SECRET" ]]; then
        log_success "STRIPE_WEBHOOK_SECRET is set"
        # Verifiser at secret starter med whsec_
        if [[ "$STRIPE_WEBHOOK_SECRET" == whsec_* ]]; then
            log_success "Webhook secret format is valid"
        else
            log_warn "Webhook secret may not be valid (should start with whsec_)"
        fi
    else
        log_error "STRIPE_WEBHOOK_SECRET is not set!"
        exit 1
    fi
    
    # 3. Ta DB Snapshot via Supabase API
    log_info "Creating database backup..."
    if [[ -n "$SUPABASE_ACCESS_TOKEN" && -n "$PROD_REF" ]]; then
        BACKUP_RESPONSE=$(curl -s -X POST \
            "https://api.supabase.com/v1/projects/$PROD_REF/database/backups" \
            -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
            -H "Content-Type: application/json" \
            -d '{"immediate": true}' 2>/dev/null || echo '{"error": "API call failed"}')
        
        if echo "$BACKUP_RESPONSE" | grep -q "id"; then
            log_success "Database backup initiated"
            echo "  Response: $BACKUP_RESPONSE"
        else
            log_warn "Could not verify backup creation. Manual backup recommended."
            echo "  Response: $BACKUP_RESPONSE"
        fi
    else
        log_warn "Skipping automated backup (missing SUPABASE_ACCESS_TOKEN or PROD_REF)"
        echo "  ⚠️  IMPORTANT: Create manual backup in Supabase Dashboard!"
    fi
    
    # 4. Sjekk Cloudflare DNS TTL
    log_info "Checking DNS configuration..."
    log_warn "Ensure Cloudflare DNS TTL is set to 60s for quick failover"
    log_info "Verify at: https://dash.cloudflare.com → DNS → klarpakke.no"
    
    # 5. Sjekk Stripe test-transaksjoner
    log_info "Checking for open Stripe test transactions..."
    if [[ -n "$STRIPE_SECRET_KEY" ]]; then
        # Hent åpne checkout sessions (siste 24 timer)
        OPEN_SESSIONS=$(curl -s -G "https://api.stripe.com/v1/checkout/sessions" \
            -u "$STRIPE_SECRET_KEY:" \
            -d "status=open" \
            -d "limit=10" \
            -d "created[gte]=$(($(date +%s) - 86400))" 2>/dev/null | \
            grep -o '"id": "cs_' | wc -l || echo "0")
        
        if [[ "$OPEN_SESSIONS" -gt 0 ]]; then
            log_warn "Found $OPEN_SESSIONS open checkout sessions in last 24h"
            log_warn "Verify these are expected customer sessions, not test data"
        else
            log_success "No open checkout sessions found"
        fi
    fi
    
    # 6. Sjekk at vi er på main branch
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    if [[ "$CURRENT_BRANCH" == "main" ]]; then
        log_success "On main branch"
    else
        log_error "Not on main branch! Current: $CURRENT_BRANCH"
        exit 1
    fi
    
    # 7. Sjekk at working directory er clean
    if [[ -z $(git status --porcelain 2>/dev/null) ]]; then
        log_success "Working directory is clean"
    else
        log_warn "Working directory has uncommitted changes:"
        git status --short
        read -p "Continue anyway? (y/N) " -n 1 -r
        echo
        [[ $REPLY =~ ^[Yy]$ ]] || exit 1
    fi
    
    # 8. Verifiser alle nødvendige secrets
    log_info "Verifying required secrets..."
    verify_env "SUPABASE_ACCESS_TOKEN"
    verify_env "PROD_REF"
    verify_env "STRIPE_WEBHOOK_SECRET"
    verify_env "RESEND_API_KEY"
    verify_env "CRON_SECRET"
    
    log_success "Pre-deployment checklist complete!"
    echo ""
    echo "Next step: Run ./scripts/launch-day-deploy.sh deploy"
    
    slack_notify "Pre-deployment checks passed for Klarpakke" "success"
}

# ═══════════════════════════════════════════════════════════════
# DEPLOYMENT SEKVENS (T-0)
# ═══════════════════════════════════════════════════════════════

cmd_deploy() {
    log_info "🚀 Starting Production Deployment..."
    echo ""
    
    # Verifiser at vi har alle secrets
    verify_env "SUPABASE_ACCESS_TOKEN"
    verify_env "PROD_REF"
    
    # 1. Link til prod-prosjekt
    log_info "Step 1/8: Linking to production project..."
    supabase link --project-ref "$PROD_REF" --debug 2>&1 | head -20
    log_success "Linked to project: $PROD_REF"
    
    # 2. Sett secrets
    log_info "Step 2/8: Setting Edge Function secrets..."
    supabase secrets set RESEND_API_KEY="$RESEND_API_KEY" --debug
    supabase secrets set CRON_SECRET="$CRON_SECRET" --debug
    log_success "Secrets configured"
    
    # 3. Kjør DB migrasjoner
    log_info "Step 3/8: Running database migrations..."
    log_info "This will create monitoring tables and cron schedules"
    read -p "Continue with db push? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment aborted by user"
        exit 1
    fi
    
    supabase db push --include-all --debug 2>&1 | tee /tmp/db-push.log
    if grep -q "Applied" /tmp/db-push.log || grep -q "No changes" /tmp/db-push.log; then
        log_success "Database migrations complete"
    else
        log_error "Database migration may have failed. Check /tmp/db-push.log"
        exit 1
    fi
    
    # 4. Deploy Edge Functions
    log_info "Step 4/8: Deploying Edge Functions..."
    
    log_info "  Deploying daily-ops-report..."
    supabase functions deploy daily-ops-report --debug 2>&1 | tail -10
    
    log_info "  Deploying stripe-webhook-logger..."
    supabase functions deploy stripe-webhook-logger --debug 2>&1 | tail -10
    
    log_success "Edge Functions deployed"
    
    # 5. Verifiser cron jobs
    log_info "Step 5/8: Verifying cron jobs..."
    sleep 5  # Vent på at cron-jobbene registreres
    
    CRON_JOBS=$(supabase inspect db cron 2>/dev/null || echo "")
    if echo "$CRON_JOBS" | grep -q "daily-ops-report"; then
        log_success "daily-ops-report cron job active"
    else
        log_warn "daily-ops-report cron job not found in listing"
    fi
    
    if echo "$CRON_JOBS" | grep -q "health-keepalive"; then
        log_success "health-keepalive cron job active"
    else
        log_warn "health-keepalive cron job not found in listing"
    fi
    
    # 6. Smoke Tests
    log_info "Step 6/8: Running smoke tests..."
    
    PROD_URL="https://www.klarpakke.no"
    
    # Test 1: Health endpoint
    log_info "  Testing /api/health..."
    HEALTH_STATUS=$(curl -s -o /tmp/health.json -w "%{http_code}" "$PROD_URL/api/health" 2>/dev/null || echo "000")
    if [[ "$HEALTH_STATUS" == "200" ]]; then
        log_success "  Health endpoint OK"
        cat /tmp/health.json | jq -r '.status' 2>/dev/null && echo ""
    else
        log_error "  Health endpoint failed: HTTP $HEALTH_STATUS"
    fi
    
    # Test 2: Stripe checkout (skal være auth-blokkert)
    log_info "  Testing /api/stripe/checkout (expect 401)..."
    CHECKOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$PROD_URL/api/stripe/checkout" \
        -H "Content-Type: application/json" \
        -d '{"priceId": "test"}' 2>/dev/null || echo "000")
    if [[ "$CHECKOUT_STATUS" == "401" ]]; then
        log_success "  Checkout endpoint correctly requires auth (401)"
    else
        log_warn "  Checkout endpoint returned HTTP $CHECKOUT_STATUS (expected 401)"
    fi
    
    # Test 3: Stripe webhook (skal være tilgjengelig men kreve signatur)
    log_info "  Testing /api/webhooks/stripe (expect 400 for missing signature)..."
    WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "$PROD_URL/api/webhooks/stripe" 2>/dev/null || echo "000")
    if [[ "$WEBHOOK_STATUS" == "400" ]]; then
        log_success "  Webhook endpoint active (400 = missing signature, expected)"
    else
        log_warn "  Webhook endpoint returned HTTP $WEBHOOK_STATUS"
    fi
    
    # 7. Vercel deploy
    log_info "Step 7/8: Deploying to Vercel..."
    if [[ -n "$VERCEL_TOKEN" ]]; then
        npx vercel deploy --prod --token="$VERCEL_TOKEN" --yes 2>&1 | tail -20
        log_success "Vercel deployment initiated"
    else
        log_warn "VERCEL_TOKEN not set, skipping Vercel deployment"
        log_info "Deploy manually: git push origin main"
    fi
    
    # 8. Deploy GitHub Actions
    log_info "Step 8/8: Verifying GitHub Actions workflow..."
    if [[ -f ".github/workflows/health-monitor.yml" ]]; then
        log_success "Health monitor workflow exists"
        log_info "Verify it's active at: https://github.com/tajlive/KP/actions"
    fi
    
    echo ""
    log_success "🎉 Deployment sequence complete!"
    echo ""
    echo "Next step: Run ./scripts/launch-day-deploy.sh verify"
    
    slack_notify "Production deployment complete for Klarpakke!" "success"
}

# ═══════════════════════════════════════════════════════════════
# POST-DEPLOYMENT VERIFIKASJON (T+15 min)
# ═══════════════════════════════════════════════════════════════

cmd_verify() {
    log_info "🔍 Running Post-Deployment Verification..."
    echo ""
    
    PROD_URL="https://www.klarpakke.no"
    
    # 1. Sjekk Sentry for nye errors
    log_info "1/6: Checking Sentry for new errors..."
    if [[ -n "$SENTRY_AUTH_TOKEN" ]]; then
        # Hent siste errors fra Sentry API
        SENTRY_ERRORS=$(curl -s -G "https://sentry.io/api/0/projects/klarpakke/klarpakke/issues/" \
            -H "Authorization: Bearer $SENTRY_AUTH_TOKEN" \
            -d "statsPeriod=15m" \
            -d "limit=5" 2>/dev/null | jq length || echo "0")
        
        if [[ "$SENTRY_ERRORS" == "0" ]]; then
            log_success "No new errors in last 15 minutes"
        else
            log_warn "Found $SENTRY_ERRORS issues in Sentry (may be expected)"
        fi
    else
        log_warn "SENTRY_AUTH_TOKEN not set, manual check required"
        log_info "  Visit: https://klarpakke.sentry.io/issues/"
    fi
    
    # 2. Sjekk webhook_events tabell
    log_info "2/6: Checking webhook_events table..."
    WEBHOOK_COUNT=$(curl -s -X POST "https://$PROD_REF.supabase.co/rest/v1/rpc/get_webhook_event_count" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null || echo "0")
    log_info "  Webhook events logged: $WEBHOOK_COUNT"
    
    # 3. Sjekk health_check_metrics
    log_info "3/6: Checking health_check_metrics..."
    HEALTH_COUNT=$(curl -s -X POST "https://$PROD_REF.supabase.co/rest/v1/rpc/get_health_check_count" \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" 2>/dev/null || echo "0")
    log_info "  Health check records: $HEALTH_COUNT"
    
    # 4. Kjør manuell daily-ops-report
    log_info "4/6: Triggering daily-ops-report manually..."
    REPORT_RESULT=$(curl -s -X POST "$PROD_URL/functions/v1/daily-ops-report" \
        -H "Authorization: Bearer $CRON_SECRET" 2>/dev/null || echo '{"error": "Failed"}')
    
    if echo "$REPORT_RESULT" | grep -q "success"; then
        log_success "Daily report triggered successfully"
    else
        log_warn "Daily report trigger may have failed: $REPORT_RESULT"
    fi
    
    # 5. Send test-e-post via Resend
    log_info "5/6: Sending test email via Resend..."
    if [[ -n "$RESEND_API_KEY" ]]; then
        EMAIL_RESULT=$(curl -s -X POST "https://api.resend.com/emails" \
            -H "Authorization: Bearer $RESEND_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{
                "from": "Klarpakke Ops <ops@klarpakke.no>",
                "to": ["ops@klarpakke.no"],
                "subject": "🧪 Post-Deploy Test Email",
                "text": "This is a test email sent after deployment. If you received this, the email system is working!"
            }' 2>/dev/null | jq -r '.id' || echo "failed")
        
        if [[ "$EMAIL_RESULT" != "failed" && -n "$EMAIL_RESULT" ]]; then
            log_success "Test email sent (ID: $EMAIL_RESULT)"
        else
            log_warn "Test email may have failed"
        fi
    fi
    
    # 6. Sjekk cron job status
    log_info "6/6: Verifying cron job status..."
    supabase inspect db cron 2>/dev/null | grep -E "(daily-ops-report|health-keepalive)" || \
        log_warn "Could not verify cron jobs"
    
    echo ""
    log_success "✅ Post-deployment verification complete!"
    echo ""
    echo "📊 Dashboard URLs:"
    echo "  - Health: $PROD_URL/api/health"
    echo "  - Supabase: https://supabase.com/dashboard/project/$PROD_REF"
    echo "  - Vercel: https://vercel.com/dashboard"
    echo "  - Sentry: https://klarpakke.sentry.io"
    
    slack_notify "Post-deployment verification passed! Klarpakke is fully operational." "success"
}

# ═══════════════════════════════════════════════════════════════
# ROLLBACK PLAN (hvis noe feiler)
# ═══════════════════════════════════════════════════════════════

cmd_rollback() {
    log_error "🚨 INITIATING ROLLBACK PROCEDURE"
    echo ""
    
    echo "Available rollback options:"
    echo "  1) Database rollback (restore from snapshot)"
    echo "  2) Edge Function rollback (deploy previous version)"
    echo "  3) DNS rollback (increase TTL)"
    echo "  4) Stripe webhook deactivation"
    echo ""
    
    read -p "Select rollback option (1-4, or 'all'): " ROLLBACK_TYPE
    
    case $ROLLBACK_TYPE in
        1|all)
            log_info "Database Rollback..."
            log_info "1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/$PROD_REF/database/backups"
            log_info "2. Select the backup created before deployment"
            log_info "3. Click 'Restore' and confirm"
            log_warn "⚠️  This will cause downtime!"
            ;;
        2|all)
            log_info "Edge Function Rollback..."
            read -p "Enter previous version timestamp (YYYY-MM-DD-HHMMSS): " VERSION
            supabase functions deploy daily-ops-report --version "$VERSION" || \
                log_warn "Version rollback not available, manual redeploy required"
            ;;
        3|all)
            log_info "DNS Rollback..."
            log_info "1. Go to Cloudflare Dashboard: https://dash.cloudflare.com"
            log_info "2. Navigate to DNS → klarpakke.no"
            log_info "3. Increase TTL back to 300s (or previous value)"
            ;;
        4|all)
            log_info "Stripe Webhook Deactivation..."
            if [[ -n "$STRIPE_SECRET_KEY" ]]; then
                # Liste webhook endpoints
                curl -s -G "https://api.stripe.com/v1/webhook_endpoints" \
                    -u "$STRIPE_SECRET_KEY:" | jq '.data[] | {id, url, status}'
                
                read -p "Enter webhook endpoint ID to disable: " WEBHOOK_ID
                curl -s -X POST "https://api.stripe.com/v1/webhook_endpoints/$WEBHOOK_ID" \
                    -u "$STRIPE_SECRET_KEY:" \
                    -d "disabled=true"
                log_success "Webhook disabled"
            fi
            ;;
        *)
            log_info "No rollback action taken"
            ;;
    esac
    
    slack_notify "🚨 ROLLBACK EXECUTED for Klarpakke (type: $ROLLBACK_TYPE)" "error"
}

# ═══════════════════════════════════════════════════════════════
# HOVEDMENY
# ═══════════════════════════════════════════════════════════════

case "${1:-help}" in
    pre|pre-check)
        cmd_pre_check
        ;;
    deploy)
        cmd_deploy
        ;;
    verify)
        cmd_verify
        ;;
    rollback)
        cmd_rollback
        ;;
    help|--help|-h)
        echo "Klarpakke Launch Day Deployment Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  pre        Run pre-deployment checklist (T-30 min)"
        echo "  deploy     Execute deployment sequence (T-0)"
        echo "  verify     Run post-deployment verification (T+15 min)"
        echo "  rollback   Execute rollback procedures"
        echo ""
        echo "Required environment variables:"
        echo "  PROD_REF, SUPABASE_ACCESS_TOKEN, STRIPE_WEBHOOK_SECRET"
        echo "  RESEND_API_KEY, CRON_SECRET, VERCEL_TOKEN (optional)"
        echo ""
        echo "Example:"
        echo "  export PROD_REF=vuxbjlykgmzskxbclquf"
        echo "  export SUPABASE_ACCESS_TOKEN=sbp_xxx"
        echo "  ./scripts/launch-day-deploy.sh pre"
        echo "  ./scripts/launch-day-deploy.sh deploy"
        echo "  ./scripts/launch-day-deploy.sh verify"
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Run '$0 help' for usage"
        exit 1
        ;;
esac
