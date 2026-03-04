# Stripe Oppsett for Klarpakke

## 🏗️ Arkitektur

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Vercel    │────▶│    Stripe   │
│             │     │  (Checkout) │     │   (Payment) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                          Webhooks              │
                          (Stripe Sync Engine)  ▼
                                        ┌─────────────┐
                                        │  Supabase   │
                                        │  (Database) │
                                        └─────────────┘
```

## ✅ Hva er satt opp

1. **Stripe Checkout API** (`/api/stripe/checkout`)
2. **Supabase Sync Engine** - Mottar webhooks automatisk
3. **Database schema** - Lagrer subscriptions

## 🔧 Steg-for-steg oppsett

### 1. Stripe Dashboard

Gå til https://dashboard.stripe.com/

#### Opprett Products & Prices:

| Produkt | Pris | Intervall |
|---------|------|-----------|
| Klarpakke Bachelor | 249 kr | Månedlig |
| Klarpakke Master | 499 kr | Månedlig |
| Klarpakke PhD | 999 kr | Månedlig |
| Klarpakke Professor | 1999 kr | Månedlig |

**Hvordan:**
1. Products → Add product
2. Fyll inn navn og beskrivelse
3. Legg til price (recurring, monthly)
4. Kopier Price ID (starter med `price_`)

### 2. Konfigurer Vercel Env Vars

```bash
cd ~/klarpakke

# Sett Price IDs (erstatt med dine fra Stripe Dashboard)
echo "price_xxxxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_BACHELOR production
echo "price_xxxxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_MASTER production
echo "price_xxxxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PHD production
echo "price_xxxxx" | npx vercel env add NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR production
```

### 3. Database Migration

Kjør i Supabase SQL Editor:

```sql
-- Fil: /tmp/subscriptions_schema.sql
-- (Allerede generert, kopier innholdet)
```

### 4. Stripe Webhook (Automatisk via Supabase Sync Engine)

**Webhook URL:**
```
https://oysfdzutvezqhainaxba.supabase.co/functions/v1/stripe-sync
```

**Legg til i Stripe Dashboard:**
1. Developers → Webhooks
2. Add endpoint
3. URL: `https://oysfdzutvezqhainaxba.supabase.co/functions/v1/stripe-sync`
4. Events to send:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

### 5. Test

1. Gå til https://www.klarpakke.no/no/priser
2. Klikk "Velg Bachelor" → Stripe
3. Fullfør test-betaling (bruk kort: 4242 4242 4242 4242)
4. Sjekk at subscription lagres i Supabase

## 🔍 Verifisering

### Sjekk at webhooks fungerer:
```sql
SELECT * FROM stripe.checkout_sessions 
ORDER BY created DESC 
LIMIT 5;
```

### Sjekk subscriptions:
```sql
SELECT * FROM subscriptions 
WHERE provider = 'stripe'
ORDER BY created_at DESC
LIMIT 5;
```

## 🐘 Feilsøking

| Problem | Løsning |
|---------|---------|
| "Price ID ikke funnet" | Sjekk at Price ID er riktig i Stripe Dashboard |
| "Webhook ikke mottatt" | Verifiser webhook URL i Stripe Dashboard |
| "Subscription ikke lagret" | Sjekk Supabase logs for stripe-sync function |

## 📝 Viktige env vars

```
STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_BACHELOR=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_MASTER=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_PHD=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_PROFESSOR=price_xxxxx
```
