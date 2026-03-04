# Klarpakke Checkout Automation

Dette dokumentet beskriver hvordan du fikser checkout-systemet automatisk.

## Problem

Checkout-systemet var ødelagt fordi:
1. CTA-knapper brukte ugyldige `course` slugs
2. Manglende Stripe Price IDs
3. API-routes hadde module-level env access (feilet ved bygg)

## Løsning

### Via MCP (Claude Desktop)

**1. Sjekk nåværende status:**
```
vercel_fix_checkout med dry_run: true
```

**2. Fiks med Stripe Price IDs:**
```
vercel_fix_checkout med:
- stripe_price_bachelor: "price_1T2eP6CGsVawsLofS4z3a9qk"
- stripe_price_master: "price_1T2ePOCGsVawsLofeM4QIRNb"  
- stripe_price_phd: "price_1T2ePPCGsVawsLofcih4UgAe"
- stripe_price_professor: "price_1T2ePQCGsVawsLofIdotmZ9t"
```

**3. Verifiser etter deploy:**
```
vercel_verify_deployment med tests: ["stripe_checkout", "vipps_checkout"]
```

### Via Terminal

**1. Kjør automation script:**
```bash
cd /Users/taj/klarpakke
./scripts/fix-checkout-automation.sh
```

**2. Manuell setup:**
```bash
# Sett BASE_URL
echo "https://www.klarpakke.no" | npx vercel env add NEXT_PUBLIC_BASE_URL production

# Sett Stripe Price IDs (erstatt med faktiske verdier)
echo "price_xxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_BACHELOR production
echo "price_xxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_MASTER production
echo "price_xxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PHD production
echo "price_xxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR production

# Deploy
npx vercel --prod
```

## Finn Stripe Price IDs

1. Gå til https://dashboard.stripe.com/products
2. Klikk på produktet (f.eks. "Klarpakke Bachelor")
3. Under "Pricing" finner du Price ID:
   - Format: `price_1T2eP6CGsVawsLofS4z3a9qk`
4. Kopier verdien for hver tier

## API Endepunkter

Etter fiksen er disse tilgjengelige:

| Endepunkt | Metode | Beskrivelse |
|-----------|--------|-------------|
| `/api/stripe-checkout` | POST | Oppretter Stripe Checkout session |
| `/api/vipps-checkout` | POST | Oppretter Vipps Recurring avtale |
| `/api/webhooks/vipps` | POST | Håndterer Vipps webhooks |

## Testing

```bash
# Test Stripe
curl -X POST https://www.klarpakke.no/api/stripe-checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"bachelor","userId":"test","userEmail":"test@test.com"}'

# Forventet respons:
# {"url":"https://checkout.stripe.com/...","sessionId":"cs_..."}

# Test Vipps
curl -X POST https://www.klarpakke.no/api/vipps-checkout \
  -H "Content-Type: application/json" \
  -d '{"tier":"bachelor"}'

# Forventet respons:
# {"url":"https://api.vipps.no/...","agreementId":"klarpakke-bachelor-..."}
```

## Troubleshooting

**Problem:** `405 Method Not Allowed`
- **Løsning:** Vent på deploy å fullføre, eller sjekk at route.ts finnes

**Problem:** `{"error":"Ugyldig abonnement..."}`
- **Løsning:** Stripe Price ID mangler. Kjør automation på nytt med riktige verdier.

**Problem:** `{"error":"Kunne ikke opprette Vipps-avtale"}`
- **Løsning:** Sjekk at Vipps env vars er satt: `VIPPS_API_URL`, `VIPPS_CLIENT_ID`, etc.

## Filstruktur

```
src/app/api/
├── stripe-checkout/route.ts        # Stripe checkout API
├── vipps-checkout/route.ts         # Vipps checkout API  
└── webhooks/vipps/route.ts         # Vipps webhook handler

src/app/[locale]/priser/
└── ClientPricingPage.tsx           # UI med Stripe + Vipps knapper

supabase/migrations/
└── 20260224110000_vipps_agreements.sql  # Database for Vipps
```

## Status

| Komponent | Status |
|-----------|--------|
| Stripe checkout API | ✅ Implementert |
| Vipps checkout API | ✅ Implementert |
| Vipps webhook | ✅ Implementert |
| Database migration | ✅ Kjørt |
| BASE_URL | ✅ Satt |
| Stripe Price IDs | ⚠️  Krever verdier fra Stripe Dashboard |
| Deploy | ✅ Klar |
