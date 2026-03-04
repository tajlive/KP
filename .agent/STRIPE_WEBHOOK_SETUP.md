# Stripe Webhook Oppsett

## Webhook URL (produksjon)
```
https://www.klarpakke.no/api/webhooks/stripe
```

## Events å lytte på
- `checkout.session.completed` - Når en bruker fullfører checkout
- `invoice.payment_succeeded` - Når en faktura betales
- `customer.subscription.updated` - Når abonnement oppdateres
- `customer.subscription.deleted` - Når abonnement kanselleres

## Environment Variables som trengs i Vercel
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Steg for å konfigurere:

1. Gå til https://dashboard.stripe.com/webhooks

2. Klikk "Add endpoint"

3. URL: `https://www.klarpakke.no/api/webhooks/stripe`

4. Velg disse events:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`

5. Klikk "Add endpoint"

6. Kopier "Signing secret" (starter med `whsec_`)

7. Gå til https://vercel.com/tom-jensens-projects/klarpakke/settings/environment-variables

8. Legg til:
   - `STRIPE_WEBHOOK_SECRET` = [signing secret fra Stripe]

9. Redeploy:
   ```bash
   vercel --prod
   ```

## Testing lokalt
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Verifisering
Sjekk at webhook fungerer:
```bash
curl -X POST https://www.klarpakke.no/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type":"test"}'
```

Forventet respons: `400 Bad Request` (fordi signature mangler)
