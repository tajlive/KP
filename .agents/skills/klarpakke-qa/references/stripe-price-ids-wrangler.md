# Stripe Price IDs — wrangler.jsonc vars REQUIRED (2026-07-29)

## Problem

Stripe checkout (`/api/stripe/checkout`) returnerte `"Ugyldig pris-ID"` (HTTP 400) for alle gyldige Stripe priceIds — selv om `/api/pricing` returnerte korrekte priser med ekte priceIds.

## Rotårsak

`getAllowedPriceIds()` i checkout-ruten leser `process.env.NEXT_PUBLIC_STRIPE_PRICE_*`. 
I Cloudflare Workers er disse `undefined` med mindre de er definert i `wrangler.jsonc` sin `vars`-seksjon. 
`.env.local` dekker KUN Next.js build-time inlining for client components — IKKE server-side API-ruter i Workers runtime.

## Fiks

Legg pris-IDene i `wrangler.jsonc`:

```jsonc
"vars": {
  "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR": "price_1T4QVJCGsVawsLofgt9uuOcU",
  "NEXT_PUBLIC_STRIPE_PRICE_MASTER": "price_1T4QVKCGsVawsLofr8NPcL6g",
  "NEXT_PUBLIC_STRIPE_PRICE_PHD": "price_1T4QVKCGsVawsLofz1US0uVZ",
  "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR": "price_1T4QVLCGsVawsLofgMEbOBJA"
}
```

Sett også i `.env.local` for build-time inlining.

## Hent gjeldende priceIds

```bash
curl -s "https://www.klarpakke.no/api/pricing" | python3 -c "
import json, sys
d = json.load(sys.stdin)
for p in d.get('products', []):
    print(f'NEXT_PUBLIC_STRIPE_PRICE_{p[\"tier\"].upper()}={p[\"priceId\"]}')
"
```

## Verifiser

Etter deploy: test checkout-endepunktet med en gyldig priceId. Skal returnere Stripe session URL (HTTP 200), ikke "Ugyldig pris-ID" (HTTP 400).
