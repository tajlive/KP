# Stripe Payment Operations — Klarpakke

Betalingsflyt-debugging, prising, Vipps, og Workers-konfigurasjon.

## Three-way price verification

Priser vises tre steder — alle må stemme:

| Kilde | Hva | Hvordan sjekke |
|-------|-----|---------------|
| **Stripe (source of truth)** | `unit_amount` på price-objekter | `curl -s -u "$SK:" "https://api.stripe.com/v1/prices/$pid"` |
| **DB (`stripe_products`)** | `amount_nok` + `stripe_price_id` | `SELECT tier_slug, amount_nok, stripe_price_id FROM stripe_products` |
| **i18n (`messages/no.json`)** | `studieprogram.tiers.<plan>.price` | `node -e "JSON.parse(require('fs').readFileSync('messages/no.json'));"` |

**Regel:** Stripe er fasit. DB og i18n må matche. Sjekk ALLE tre før du endrer noen.

### Vanlig feil: DB har feil beløp

Symptom: `/api/pricing` returnerer andre priser enn Stripe. DB overstyrer hardkodet fallback.

```sql
-- Sjekk
SELECT tier_slug, amount_nok, stripe_price_id FROM stripe_products WHERE is_active = true;

-- Fiks (Stripe-beløp i øre)
UPDATE stripe_products SET amount_nok = 24900, stripe_price_id = 'price_1T4Q...' WHERE tier_slug = 'bachelor';
```

### Vanlig feil: stripe_price_id = null

DB-raden har riktig beløp men mangler Stripe-kobling. Checkout vil feile.
Fiks: sett `stripe_price_id` til riktig verdi fra Stripe.

## Vipps

Vipps er IKKE automatisk tilgjengelig. Krever aktivering i Stripe Dashboard:
→ https://dashboard.stripe.com/settings/payment_methods

**Kode:** `payment_method_types: ['card', 'vipps'] as any`
(`as any` nødvendig — Vipps er i private preview, finnes ikke i SDK-typene)

**Brukergrensesnitt:** `PaymentMethodSelector` viser Vipps for NO/SE/DK/FI via
`VippsMarketProvider`. Stripe Checkout håndterer resten.

## NEXT_PUBLIC_STRIPE_PRICE_* i Cloudflare Workers

NEXT_PUBLIC_-variabler inlines av Next.js ved bygg for client, men server-ruter
(`/api/stripe/checkout`) trenger dem i Workers runtime. Legg i `wrangler.jsonc`:

```jsonc
"vars": {
  "NEXT_PUBLIC_STRIPE_PRICE_BACHELOR": "price_1T4Q...",
  "NEXT_PUBLIC_STRIPE_PRICE_MASTER": "price_1T4Q...",
  "NEXT_PUBLIC_STRIPE_PRICE_PHD": "price_1T4Q...",
  "NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR": "price_1T4Q..."
}
```

`.env.local` holder også disse — de brukes ved bygg + lokal utvikling.
`wrangler.jsonc` er produksjonsmiljøet.

## Teste Stripe Checkout uten nettleser

```bash
SK=$(grep "^STRIPE_SECRET_KEY=" .env.local | cut -d= -f2- | xargs)
# Opprett test-session
curl -s -u "$SK:" -X POST "https://api.stripe.com/v1/checkout/sessions" \
  -d "success_url=https://klarpakke.no/success" \
  -d "cancel_url=https://klarpakke.no/priser" \
  -d "mode=subscription" \
  -d "line_items[0][price]=price_1T4Q..." \
  -d "line_items[0][quantity]=1" \
  -d "payment_method_types[]=card"
```

Returerer session ID + URL. Beløp bekreftes i `amount_total`.

## Sjekke om price ID-er finnes i Stripe

```bash
for pid in "price_1T4Q..." "price_1T4Q..."; do
  curl -s -u "$SK:" "https://api.stripe.com/v1/prices/$pid" | python3 -c \
    "import sys,json; d=json.load(sys.stdin); print(f'{d.get(\"id\",\"?\")}: {d.get(\"unit_amount\",0)/100:.0f} {d.get(\"currency\",\"?\")}')"
done
```

## Live priser i Stripe-kontoen

```bash
curl -s -u "$SK:" "https://api.stripe.com/v1/prices?active=true&limit=10" | python3 -c \
  "import sys,json; d=json.load(sys.stdin); [print(f'  {p.get(\"nickname\",\"N/A\")}: {p[\"unit_amount\"]/100:.0f} ({p[\"id\"]})') for p in d['data']]"
```
