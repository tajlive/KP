#!/bin/bash
# Stripe Price Setup Script v2
# Creates products and prices for Klarpakke in NOK, EUR, USD

set -e

echo "🎯 Setting up Stripe Products & Prices"
echo "========================================"
echo ""

# Get existing products or create new ones
echo "📦 Setting up products..."

# Basis Product
PROD_BASIS=$(stripe products list | jq -r '.data[] | select(.name=="Klarpakke Basis") | .id' | head -1)
if [ -z "$PROD_BASIS" ]; then
  PROD_BASIS=$(stripe products create -d name="Klarpakke Basis" -d description="Perfekt for nybegynnere" -d tax_code="txcd_10305000" | jq -r '.id')
  echo "✓ Created Basis product: $PROD_BASIS"
else
  echo "✓ Using existing Basis product: $PROD_BASIS"
fi

# Komplett Product
PROD_KOMPLETT=$(stripe products list | jq -r '.data[] | select(.name=="Klarpakke Komplett") | .id' | head -1)
if [ -z "$PROD_KOMPLETT" ]; then
  PROD_KOMPLETT=$(stripe products create -d name="Klarpakke Komplett" -d description="Alt du trenger for trading" -d tax_code="txcd_10305000" | jq -r '.id')
  echo "✓ Created Komplett product: $PROD_KOMPLETT"
else
  echo "✓ Using existing Komplett product: $PROD_KOMPLETT"
fi

# Pro Product
PROD_PRO=$(stripe products list | jq -r '.data[] | select(.name=="Klarpakke Pro") | .id' | head -1)
if [ -z "$PROD_PRO" ]; then
  PROD_PRO=$(stripe products create -d name="Klarpakke Pro" -d description="For seriøse studenter" -d tax_code="txcd_10305000" | jq -r '.id')
  echo "✓ Created Pro product: $PROD_PRO"
else
  echo "✓ Using existing Pro product: $PROD_PRO"
fi

echo ""
echo "💰 Creating prices..."

# Function to create price
create_price() {
  local product=$1
  local currency=$2
  local amount=$3
  local interval=$4

  stripe prices create \
    -d product="$product" \
    -d currency="$currency" \
    -d unit_amount="$amount" \
    -d "recurring[interval]=$interval" \
    | jq -r '.id'
}

# BASIS PRICES
echo ""
echo "  Basis (249/month, 2490/year):"
PRICE_BASIS_NOK_M=$(create_price $PROD_BASIS nok 24900 month)
echo "    ✓ NOK Monthly: $PRICE_BASIS_NOK_M"

PRICE_BASIS_NOK_Y=$(create_price $PROD_BASIS nok 249000 year)
echo "    ✓ NOK Annual: $PRICE_BASIS_NOK_Y"

PRICE_BASIS_EUR_M=$(create_price $PROD_BASIS eur 2200 month)
echo "    ✓ EUR Monthly: $PRICE_BASIS_EUR_M"

PRICE_BASIS_EUR_Y=$(create_price $PROD_BASIS eur 22000 year)
echo "    ✓ EUR Annual: $PRICE_BASIS_EUR_Y"

PRICE_BASIS_USD_M=$(create_price $PROD_BASIS usd 2500 month)
echo "    ✓ USD Monthly: $PRICE_BASIS_USD_M"

PRICE_BASIS_USD_Y=$(create_price $PROD_BASIS usd 25000 year)
echo "    ✓ USD Annual: $PRICE_BASIS_USD_Y"

# KOMPLETT PRICES
echo ""
echo "  Komplett (499/month, 4990/year):"
PRICE_KOMP_NOK_M=$(create_price $PROD_KOMPLETT nok 49900 month)
echo "    ✓ NOK Monthly: $PRICE_KOMP_NOK_M"

PRICE_KOMP_NOK_Y=$(create_price $PROD_KOMPLETT nok 499000 year)
echo "    ✓ NOK Annual: $PRICE_KOMP_NOK_Y"

PRICE_KOMP_EUR_M=$(create_price $PROD_KOMPLETT eur 4500 month)
echo "    ✓ EUR Monthly: $PRICE_KOMP_EUR_M"

PRICE_KOMP_EUR_Y=$(create_price $PROD_KOMPLETT eur 45000 year)
echo "    ✓ EUR Annual: $PRICE_KOMP_EUR_Y"

PRICE_KOMP_USD_M=$(create_price $PROD_KOMPLETT usd 4900 month)
echo "    ✓ USD Monthly: $PRICE_KOMP_USD_M"

PRICE_KOMP_USD_Y=$(create_price $PROD_KOMPLETT usd 49000 year)
echo "    ✓ USD Annual: $PRICE_KOMP_USD_Y"

# PRO PRICES
echo ""
echo "  Pro (1249/month, 12490/year):"
PRICE_PRO_NOK_M=$(create_price $PROD_PRO nok 124900 month)
echo "    ✓ NOK Monthly: $PRICE_PRO_NOK_M"

PRICE_PRO_NOK_Y=$(create_price $PROD_PRO nok 1249000 year)
echo "    ✓ NOK Annual: $PRICE_PRO_NOK_Y"

PRICE_PRO_EUR_M=$(create_price $PROD_PRO eur 11000 month)
echo "    ✓ EUR Monthly: $PRICE_PRO_EUR_M"

PRICE_PRO_EUR_Y=$(create_price $PROD_PRO eur 110000 year)
echo "    ✓ EUR Annual: $PRICE_PRO_EUR_Y"

PRICE_PRO_USD_M=$(create_price $PROD_PRO usd 12000 month)
echo "    ✓ USD Monthly: $PRICE_PRO_USD_M"

PRICE_PRO_USD_Y=$(create_price $PROD_PRO usd 120000 year)
echo "    ✓ USD Annual: $PRICE_PRO_USD_Y"

echo ""
echo "========================================"
echo "✅ All prices created successfully!"
echo "========================================"
echo ""
echo "📋 Add these to your .env.local:"
echo ""
echo "# Basis (Student)"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY=$PRICE_BASIS_NOK_M"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL=$PRICE_BASIS_NOK_Y"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_EUR=$PRICE_BASIS_EUR_M"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_EUR=$PRICE_BASIS_EUR_Y"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_MONTHLY_USD=$PRICE_BASIS_USD_M"
echo "NEXT_PUBLIC_STRIPE_STUDENT_PRICE_ANNUAL_USD=$PRICE_BASIS_USD_Y"
echo ""
echo "# Komplett (Master)"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY=$PRICE_KOMP_NOK_M"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL=$PRICE_KOMP_NOK_Y"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_EUR=$PRICE_KOMP_EUR_M"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_EUR=$PRICE_KOMP_EUR_Y"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_MONTHLY_USD=$PRICE_KOMP_USD_M"
echo "NEXT_PUBLIC_STRIPE_MASTER_PRICE_ANNUAL_USD=$PRICE_KOMP_USD_Y"
echo ""
echo "# Pro (Professor)"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY=$PRICE_PRO_NOK_M"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL=$PRICE_PRO_NOK_Y"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_EUR=$PRICE_PRO_EUR_M"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_EUR=$PRICE_PRO_EUR_Y"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_MONTHLY_USD=$PRICE_PRO_USD_M"
echo "NEXT_PUBLIC_STRIPE_PROFESSOR_PRICE_ANNUAL_USD=$PRICE_PRO_USD_Y"
echo ""
