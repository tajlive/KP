#!/bin/bash
# Create Stripe prices for all tiers in NOK, EUR, USD
# Usage: ./create-stripe-prices.sh

set -e

echo "🎯 Creating Stripe Products and Prices..."
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# 1. BASIS/STUDENT TIER
# ============================================
echo -e "\n${BLUE}Creating Basis (Student) Tier...${NC}"

# Create product if not exists
PRODUCT_BASIS=$(stripe products create \
  --name "Klarpakke Basis" \
  --description "Perfekt for nybegynnere - grunnleggende kurs og ubegrenset simulator" \
  --tax-code "txcd_10305000" | jq -r '.id')

echo "Product ID: $PRODUCT_BASIS"

# NOK Prices
echo "  Creating NOK prices..."
PRICE_BASIS_NOK_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_BASIS" \
  --currency nok \
  --unit-amount 19900 \
  --recurring interval=month \
  --lookup-key "basis_nok_monthly" | jq -r '.id')

PRICE_BASIS_NOK_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_BASIS" \
  --currency nok \
  --unit-amount 199000 \
  --recurring interval=year \
  --lookup-key "basis_nok_annual" \
  | jq -r '.id')

# EUR Prices (convert from NOK: 199 NOK ≈ 19 EUR)
echo "  Creating EUR prices..."
PRICE_BASIS_EUR_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_BASIS" \
  --currency eur \
  --unit-amount 1900 \
  --recurring interval=month \
  --lookup-key "basis_eur_monthly" \
  | jq -r '.id')

PRICE_BASIS_EUR_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_BASIS" \
  --currency eur \
  --unit-amount 19000 \
  --recurring interval=year \
  --lookup-key "basis_eur_annual" \
  | jq -r '.id')

# USD Prices (convert from NOK: 199 NOK ≈ 19 USD)
echo "  Creating USD prices..."
PRICE_BASIS_USD_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_BASIS" \
  --currency usd \
  --unit-amount 1900 \
  --recurring interval=month \
  --lookup-key "basis_usd_monthly" \
  | jq -r '.id')

PRICE_BASIS_USD_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_BASIS" \
  --currency usd \
  --unit-amount 19000 \
  --recurring interval=year \
  --lookup-key "basis_usd_annual" \
  | jq -r '.id')

echo -e "${GREEN}✓ Basis tier prices created${NC}"

# ============================================
# 2. KOMPLETT/MASTER TIER
# ============================================
echo -e "\n${BLUE}Creating Komplett (Master) Tier...${NC}"

PRODUCT_KOMPLETT=$(stripe products create \
  --name "Klarpakke Komplett" \
  --description "Alt du trenger - alle kurs, sertifisering og webinarer" \
  --tax-code "txcd_10305000" | jq -r '.id')

echo "Product ID: $PRODUCT_KOMPLETT"

# NOK Prices
echo "  Creating NOK prices..."
PRICE_KOMPLETT_NOK_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_KOMPLETT" \
  --currency nok \
  --unit-amount 39900 \
  --recurring interval=month \
  --lookup-key "komplett_nok_monthly" \
  | jq -r '.id')

PRICE_KOMPLETT_NOK_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_KOMPLETT" \
  --currency nok \
  --unit-amount 399000 \
  --recurring interval=year \
  --lookup-key "komplett_nok_annual" \
  | jq -r '.id')

# EUR Prices (399 NOK ≈ 39 EUR)
echo "  Creating EUR prices..."
PRICE_KOMPLETT_EUR_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_KOMPLETT" \
  --currency eur \
  --unit-amount 3900 \
  --recurring interval=month \
  --lookup-key "komplett_eur_monthly" \
  | jq -r '.id')

PRICE_KOMPLETT_EUR_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_KOMPLETT" \
  --currency eur \
  --unit-amount 39000 \
  --recurring interval=year \
  --lookup-key "komplett_eur_annual" \
  | jq -r '.id')

# USD Prices (399 NOK ≈ 39 USD)
echo "  Creating USD prices..."
PRICE_KOMPLETT_USD_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_KOMPLETT" \
  --currency usd \
  --unit-amount 3900 \
  --recurring interval=month \
  --lookup-key "komplett_usd_monthly" \
  | jq -r '.id')

PRICE_KOMPLETT_USD_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_KOMPLETT" \
  --currency usd \
  --unit-amount 39000 \
  --recurring interval=year \
  --lookup-key "komplett_usd_annual" \
  | jq -r '.id')

echo -e "${GREEN}✓ Komplett tier prices created${NC}"

# ============================================
# 3. PRO/PROFESSOR TIER
# ============================================
echo -e "\n${BLUE}Creating Pro (Professor) Tier...${NC}"

PRODUCT_PRO=$(stripe products create \
  --name "Klarpakke Pro" \
  --description "For seriøse studenter - full tilgang og prioritetsstøtte" \
  --tax-code "txcd_10305000" | jq -r '.id')

echo "Product ID: $PRODUCT_PRO"

# NOK Prices
echo "  Creating NOK prices..."
PRICE_PRO_NOK_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_PRO" \
  --currency nok \
  --unit-amount 99900 \
  --recurring interval=month \
  --lookup-key "pro_nok_monthly" \
  | jq -r '.id')

PRICE_PRO_NOK_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_PRO" \
  --currency nok \
  --unit-amount 999000 \
  --recurring interval=year \
  --lookup-key "pro_nok_annual" \
  | jq -r '.id')

# EUR Prices (999 NOK ≈ 99 EUR)
echo "  Creating EUR prices..."
PRICE_PRO_EUR_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_PRO" \
  --currency eur \
  --unit-amount 9900 \
  --recurring interval=month \
  --lookup-key "pro_eur_monthly" \
  | jq -r '.id')

PRICE_PRO_EUR_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_PRO" \
  --currency eur \
  --unit-amount 99000 \
  --recurring interval=year \
  --lookup-key "pro_eur_annual" \
  | jq -r '.id')

# USD Prices (999 NOK ≈ 99 USD)
echo "  Creating USD prices..."
PRICE_PRO_USD_MONTHLY=$(stripe prices create \
  --product "$PRODUCT_PRO" \
  --currency usd \
  --unit-amount 9900 \
  --recurring interval=month \
  --lookup-key "pro_usd_monthly" \
  | jq -r '.id')

PRICE_PRO_USD_ANNUAL=$(stripe prices create \
  --product "$PRODUCT_PRO" \
  --currency usd \
  --unit-amount 99000 \
  --recurring interval=year \
  --lookup-key "pro_usd_annual" \
  | jq -r '.id')

echo -e "${GREEN}✓ Pro tier prices created${NC}"

# ============================================
# SUMMARY
# ============================================
echo -e "\n=========================================="
echo -e "${GREEN}✅ All Stripe prices created successfully!${NC}"
echo "=========================================="
echo ""
echo "Add these to your .env.local:"
echo ""
echo "# Basis (Student) - NOK"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY=$PRICE_BASIS_NOK_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL=$PRICE_BASIS_NOK_ANNUAL"
echo ""
echo "# Basis (Student) - EUR"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_EUR=$PRICE_BASIS_EUR_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_EUR=$PRICE_BASIS_EUR_ANNUAL"
echo ""
echo "# Basis (Student) - USD"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_USD=$PRICE_BASIS_USD_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_USD=$PRICE_BASIS_USD_ANNUAL"
echo ""
echo "# Komplett (Master) - NOK"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY=$PRICE_KOMPLETT_NOK_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL=$PRICE_KOMPLETT_NOK_ANNUAL"
echo ""
echo "# Komplett (Master) - EUR"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_EUR=$PRICE_KOMPLETT_EUR_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_EUR=$PRICE_KOMPLETT_EUR_ANNUAL"
echo ""
echo "# Komplett (Master) - USD"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_USD=$PRICE_KOMPLETT_USD_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_USD=$PRICE_KOMPLETT_USD_ANNUAL"
echo ""
echo "# Pro (Professor) - NOK"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY=$PRICE_PRO_NOK_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL=$PRICE_PRO_NOK_ANNUAL"
echo ""
echo "# Pro (Professor) - EUR"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_EUR=$PRICE_PRO_EUR_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_EUR=$PRICE_PRO_EUR_ANNUAL"
echo ""
echo "# Pro (Professor) - USD"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_USD=$PRICE_PRO_USD_MONTHLY"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_USD=$PRICE_PRO_USD_ANNUAL"
echo ""
echo "=========================================="
echo -e "${BLUE}Next steps:${NC}"
echo "1. Copy the environment variables above to .env.local"
echo "2. Run: npm run dev"
echo "3. Test checkout flow"
echo ""
