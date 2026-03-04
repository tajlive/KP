# ✅ Stripe Webhook Status - OPPDATERT

## Konfigurasjon Fullført ✅

### Webhook Details
- **ID**: `we_1T39S1CGsVawsLof5jjL5shr`
- **URL**: `https://www.klarpakke.no/api/webhooks/stripe`
- **Status**: `enabled`
- **Secret**: `whsec_PVzz9obyf6c6b6hqcrGVr8Mx6khFsxzf` ✅

### Aktive Events
- ✅ `checkout.session.completed`
- ✅ `invoice.payment_succeeded`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`

### Environment Variables Status
| Lokasjon | STRIPE_WEBHOOK_SECRET | Status |
|----------|----------------------|--------|
| MCP Server (.env) | ✅ Satt | ✅ |
| Lokal (.env.local) | ✅ Satt | ✅ |
| Vercel Production | ⚠️ MANGLER | ❌ |

## MANUELT STEG NØDVENDIG

### Vercel Production Setup

Du MÅ legge til webhook secret i Vercel:

**Alternativ 1 - CLI:**
```bash
vercel env add STRIPE_WEBHOOK_SECRET
glue paste: whsec_PVzz9obyf6c6b6hqcrGVr8Mx6khFsxzf
velg: Production
vercel --prod
```

**Alternativ 2 - Web GUI:**
1. Gå til https://vercel.com/tom-jensens-projects/klarpakke/settings/environment-variables
2. Klikk "Add"
3. Name: `STRIPE_WEBHOOK_SECRET`
4. Value: `whsec_PVzz9obyf6c6b6hqcrGVr8Mx6khFsxzf`
5. Environment: ✅ Production
6. Klikk "Save"
7. Redeploy: Klikk "Redeploy" på siste deployment

## Verifisering

Etter Vercel er oppdatert, test webhook:
```bash
curl -X POST https://www.klarpakke.no/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

Forventet respons: `400 Bad Request` (fordi signature mangler = webhook fungerer!)

## Gamle Webhooks Slettet ✅

Følgende utdaterte webhooks er ryddet opp:
- ~~`we_1T2yE6CGsVawsLofRD27xLtS`~~ (gammel Vercel URL)
- ~~`we_1T1zGACGsVawsLofd80gAfCp`~~ (gammel Cloud Run URL)

## Support

Hvis webhook feiler etter Vercel-oppdatering:
1. Sjekk Vercel logs: `vercel logs --production`
2. Verifiser Stripe Dashboard: https://dashboard.stripe.com/webhooks
3. Sjekk at STRIPE_WEBHOOK_SECRET matcher i Vercel og Stripe
