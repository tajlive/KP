#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Klarpakke Checkout Fix - Automation Script
# Fikser checkout-systemet automatisk via MCP eller direkte kjøring
# ═══════════════════════════════════════════════════════════════════════════════

set -e

PROJECT_ROOT="/Users/taj/klarpakke"
BASE_URL="https://www.klarpakke.no"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

# Header
echo -e "${BLUE}══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Klarpakke Checkout Fix - Automation${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════════${NC}"
echo ""

# Step 1: Check current environment variables
log_info "Step 1: Checking current Vercel environment variables..."
echo ""

cd "$PROJECT_ROOT"

# Check if required vars exist
CHECK_BASE_URL=$(npx vercel env ls 2>/dev/null | grep "NEXT_PUBLIC_BASE_URL" || echo "")
CHECK_STRIPE_BACHELOR=$(npx vercel env ls 2>/dev/null | grep "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR" || echo "")
CHECK_STRIPE_MASTER=$(npx vercel env ls 2>/dev/null | grep "NEXT_PUBLIC_STRIPE_PRICE_MASTER" || echo "")
CHECK_STRIPE_PHD=$(npx vercel env ls 2>/dev/null | grep "NEXT_PUBLIC_STRIPE_PRICE_PHD" || echo "")
CHECK_STRIPE_PROFESSOR=$(npx vercel env ls 2>/dev/null | grep "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR" || echo "")

echo "Current status:"
if [ -n "$CHECK_BASE_URL" ]; then
    log_success "NEXT_PUBLIC_BASE_URL: Set"
else
    log_warn "NEXT_PUBLIC_BASE_URL: Missing"
fi

if [ -n "$CHECK_STRIPE_BACHELOR" ]; then
    log_success "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR: Set"
else
    log_warn "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR: Missing ⚠️ REQUIRED"
fi

if [ -n "$CHECK_STRIPE_MASTER" ]; then
    log_success "NEXT_PUBLIC_STRIPE_PRICE_MASTER: Set"
else
    log_warn "NEXT_PUBLIC_STRIPE_PRICE_MASTER: Missing ⚠️ REQUIRED"
fi

if [ -n "$CHECK_STRIPE_PHD" ]; then
    log_success "NEXT_PUBLIC_STRIPE_PRICE_PHD: Set"
else
    log_warn "NEXT_PUBLIC_STRIPE_PRICE_PHD: Missing ⚠️ REQUIRED"
fi

if [ -n "$CHECK_STRIPE_PROFESSOR" ]; then
    log_success "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR: Set"
else
    log_warn "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR: Missing ⚠️ REQUIRED"
fi

echo ""

# Step 2: Setup BASE_URL if missing
if [ -z "$CHECK_BASE_URL" ]; then
    log_info "Step 2a: Setting up NEXT_PUBLIC_BASE_URL..."
    echo "$BASE_URL" | npx vercel env add NEXT_PUBLIC_BASE_URL production 2>/dev/null || true
    echo "$BASE_URL" | npx vercel env add NEXT_PUBLIC_BASE_URL preview 2>/dev/null || true
    log_success "NEXT_PUBLIC_BASE_URL set to: $BASE_URL"
    echo ""
fi

# Step 3: Interactive Stripe Price ID setup
if [ -z "$CHECK_STRIPE_BACHELOR" ] || [ -z "$CHECK_STRIPE_MASTER" ] || [ -z "$CHECK_STRIPE_PHD" ] || [ -z "$CHECK_STRIPE_PROFESSOR" ]; then
    log_info "Step 2b: Stripe Price IDs setup required"
    echo ""
    echo -e "${YELLOW}To find your Stripe Price IDs:${NC}"
    echo "1. Go to: https://dashboard.stripe.com/products"
    echo "2. Click on each product (Bachelor, Master, PhD, Professor)"
    echo "3. Find the Price ID under 'Pricing' section (starts with 'price_')"
    echo ""
    
    # Check if running in MCP mode (non-interactive)
    if [ "${MCP_MODE:-}" = "true" ]; then
        log_warn "Running in MCP mode - skipping interactive prompts"
        echo "Please provide Stripe Price IDs as environment variables:"
        echo "  - STRIPE_PRICE_BACHELOR"
        echo "  - STRIPE_PRICE_MASTER"
        echo "  - STRIPE_PRICE_PHD"
        echo "  - STRIPE_PRICE_PROFESSOR"
        echo ""
        
        # Try to use provided env vars
        if [ -n "${STRIPE_PRICE_BACHELOR:-}" ]; then
            echo "$STRIPE_PRICE_BACHELOR" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_BACHELOR production 2>/dev/null || true
            log_success "Set NEXT_PUBLIC_STRIPE_PRICE_BACHELOR"
        fi
        if [ -n "${STRIPE_PRICE_MASTER:-}" ]; then
            echo "$STRIPE_PRICE_MASTER" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_MASTER production 2>/dev/null || true
            log_success "Set NEXT_PUBLIC_STRIPE_PRICE_MASTER"
        fi
        if [ -n "${STRIPE_PRICE_PHD:-}" ]; then
            echo "$STRIPE_PRICE_PHD" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PHD production 2>/dev/null || true
            log_success "Set NEXT_PUBLIC_STRIPE_PRICE_PHD"
        fi
        if [ -n "${STRIPE_PRICE_PROFESSOR:-}" ]; then
            echo "$STRIPE_PRICE_PROFESSOR" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR production 2>/dev/null || true
            log_success "Set NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR"
        fi
    else
        # Interactive mode
        echo "Enter your Stripe Price IDs (or press Enter to skip):"
        echo ""
        
        if [ -z "$CHECK_STRIPE_BACHELOR" ]; then
            read -p "Bachelor Price ID (price_xxx): " BACHELOR_ID
            if [ -n "$BACHELOR_ID" ]; then
                echo "$BACHELOR_ID" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_BACHELOR production
                log_success "Set NEXT_PUBLIC_STRIPE_PRICE_BACHELOR"
            fi
        fi
        
        if [ -z "$CHECK_STRIPE_MASTER" ]; then
            read -p "Master Price ID (price_xxx): " MASTER_ID
            if [ -n "$MASTER_ID" ]; then
                echo "$MASTER_ID" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_MASTER production
                log_success "Set NEXT_PUBLIC_STRIPE_PRICE_MASTER"
            fi
        fi
        
        if [ -z "$CHECK_STRIPE_PHD" ]; then
            read -p "PhD Price ID (price_xxx): " PHD_ID
            if [ -n "$PHD_ID" ]; then
                echo "$PHD_ID" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PHD production
                log_success "Set NEXT_PUBLIC_STRIPE_PRICE_PHD"
            fi
        fi
        
        if [ -z "$CHECK_STRIPE_PROFESSOR" ]; then
            read -p "Professor Price ID (price_xxx): " PROFESSOR_ID
            if [ -n "$PROFESSOR_ID" ]; then
                echo "$PROFESSOR_ID" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR production
                log_success "Set NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR"
            fi
        fi
    fi
    echo ""
fi

# Step 4: Verify all required vars are set
log_info "Step 3: Verifying all required environment variables..."
echo ""

ALL_GOOD=true

if ! npx vercel env ls 2>/dev/null | grep -q "NEXT_PUBLIC_BASE_URL"; then
    log_error "NEXT_PUBLIC_BASE_URL: Still missing!"
    ALL_GOOD=false
fi

if ! npx vercel env ls 2>/dev/null | grep -q "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR"; then
    log_error "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR: Still missing!"
    ALL_GOOD=false
fi

if ! npx vercel env ls 2>/dev/null | grep -q "NEXT_PUBLIC_STRIPE_PRICE_MASTER"; then
    log_error "NEXT_PUBLIC_STRIPE_PRICE_MASTER: Still missing!"
    ALL_GOOD=false
fi

if ! npx vercel env ls 2>/dev/null | grep -q "NEXT_PUBLIC_STRIPE_PRICE_PHD"; then
    log_error "NEXT_PUBLIC_STRIPE_PRICE_PHD: Still missing!"
    ALL_GOOD=false
fi

if ! npx vercel env ls 2>/dev/null | grep -q "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR"; then
    log_error "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR: Still missing!"
    ALL_GOOD=false
fi

if [ "$ALL_GOOD" = true ]; then
    log_success "All required environment variables are set!"
    echo ""
    
    # Step 5: Deploy
    log_info "Step 4: Deploying to Vercel..."
    echo ""
    
    if npx vercel --prod --yes 2>&1 | tee /tmp/vercel-deploy.log; then
        DEPLOY_URL=$(grep -o 'https://[^[:space:]]*vercel.app' /tmp/vercel-deploy.log | tail -1)
        
        if [ -n "$DEPLOY_URL" ]; then
            log_success "Deployment successful!"
            echo ""
            log_info "Deployed to: $DEPLOY_URL"
            echo ""
            
            # Step 6: Verify checkout endpoints
            log_info "Step 5: Verifying checkout endpoints..."
            echo ""
            
            sleep 5
            
            # Test Stripe checkout
            STRIPE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/stripe-checkout" \
                -H "Content-Type: application/json" \
                -d '{"tier":"bachelor","userId":"test","userEmail":"test@example.com"}' 2>/dev/null || echo "")
            
            if echo "$STRIPE_RESPONSE" | grep -q "url"; then
                log_success "✓ Stripe checkout is working!"
            elif echo "$STRIPE_RESPONSE" | grep -q "error"; then
                log_warn "⚠ Stripe checkout returned error (may need Price ID verification)"
                echo "  Response: $STRIPE_RESPONSE"
            else
                log_error "✗ Stripe checkout not responding correctly"
            fi
            
            # Test Vipps checkout
            VIPPS_RESPONSE=$(curl -s -X POST "$BASE_URL/api/vipps-checkout" \
                -H "Content-Type: application/json" \
                -d '{"tier":"bachelor"}' 2>/dev/null || echo "")
            
            if echo "$VIPPS_RESPONSE" | grep -q "url"; then
                log_success "✓ Vipps checkout is working!"
            elif echo "$VIPPS_RESPONSE" | grep -q "error"; then
                log_warn "⚠ Vipps checkout returned error (may be auth/network related)"
            else
                log_warn "⚠ Vipps checkout response unclear"
            fi
            
            echo ""
            log_success "═══════════════════════════════════════════════════════════════"
            log_success "  Checkout fix automation complete!"
            log_success "═══════════════════════════════════════════════════════════════"
            echo ""
            echo "Test your checkout at: $BASE_URL/no/priser"
            echo ""
        else
            log_error "Could not determine deployment URL"
        fi
    else
        log_error "Deployment failed! Check the logs above."
    fi
else
    log_error "═══════════════════════════════════════════════════════════════"
    log_error "  Some environment variables are still missing!"
    log_error "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Please run this script again with the missing values, or set them manually:"
    echo "  cd $PROJECT_ROOT"
    echo "  npx vercel env add <VARIABLE_NAME>"
    echo ""
    exit 1
fi
