# ✅ Stripe Setup Complete!

## Opprettet Produkter og Priser

### 📦 Produkter
1. **Klarpakke Basis** (`prod_TxtGcrRD3fAKVP`)
   - Beskrivelse: "Perfekt for nybegynnere - grunnleggende kurs og ubegrenset simulator"
   - Kontoutskrift: "KLARPAKKE BASIS"

2. **Klarpakke Komplett** (`prod_TxtIWSzNHU5sUd`)
   - Beskrivelse: "Alt du trenger - alle kurs, sertifisering og webinarer"
   - Kontoutskrift: "KLARPAKKE KOMPLETT"

3. **Klarpakke Pro** (`prod_TxtIM9zE9oDUnf`)
   - Beskrivelse: "For seriøse studenter - full tilgang og prioritetsstøtte"
   - Kontoutskrift: "KLARPAKKE PRO"

---

## 💰 Priser (18 totalt)

### Basis Tier
| Valuta | Periode | Beløp | Price ID |
|--------|---------|-------|----------|
| NOK | Monthly | 199 kr | `price_1SzxVqCGsVawsLofrnPjx5Mw` |
| NOK | Annual | 1,990 kr | `price_1SzxVrCGsVawsLofqij3h2DV` |
| EUR | Monthly | €19 | `price_1SzxVsCGsVawsLofymjMowiQ` |
| EUR | Annual | €190 | `price_1SzxVtCGsVawsLofEYYJWivO` |
| USD | Monthly | $19 | `price_1SzxVuCGsVawsLofjDgIgHa5` |
| USD | Annual | $190 | `price_1SzxVuCGsVawsLofBU9DfM4w` |

### Komplett Tier
| Valuta | Periode | Beløp | Price ID |
|--------|---------|-------|----------|
| NOK | Monthly | 399 kr | `price_1SzxVvCGsVawsLofO9MhnQdN` |
| NOK | Annual | 3,990 kr | `price_1SzxVwCGsVawsLofdM4gND6l` |
| EUR | Monthly | €39 | `price_1SzxVxCGsVawsLofvstbUHBi` |
| EUR | Annual | €390 | `price_1SzxVyCGsVawsLofMfPAVKzc` |
| USD | Monthly | $39 | `price_1SzxVyCGsVawsLofJX8S6hEJ` |
| USD | Annual | $390 | `price_1SzxVzCGsVawsLofnjqFqxVQ` |

### Pro Tier
| Valuta | Periode | Beløp | Price ID |
|--------|---------|-------|----------|
| NOK | Monthly | 999 kr | `price_1SzxW0CGsVawsLofjyLFKaRg` |
| NOK | Annual | 9,990 kr | `price_1SzxW1CGsVawsLofMQ6emhQ3` |
| EUR | Monthly | €99 | `price_1SzxW2CGsVawsLofN8hf9meO` |
| EUR | Annual | €990 | `price_1SzxW2CGsVawsLofh0AcJbZf` |
| USD | Monthly | $99 | `price_1SzxW3CGsVawsLofosBXZN9F` |
| USD | Annual | $990 | `price_1SzxW4CGsVawsLofZJPQbP39` |

---

## 🔗 Webhook Oppsett

### Lokal Testing
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Dette vil gi deg en webhook secret som starter med `whsec_...`

Legg til i `.env.local`:
```
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Produksjon
1. Gå til https://dashboard.stripe.com/webhooks
2. Klikk "Add endpoint"
3. URL: `https://www.klarpakke.no/api/webhooks/stripe`
4. Velg events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Kopier webhook signing secret
6. Legg til i produksjon environment variables

---

## 📋 Hva Kunden Ser

### På Bankutskrift
- "KLARPAKKE BASIS"
- "KLARPAKKE KOMPLETT"
- "KLARPAKKE PRO"

(Maks 22 tegn per Stripe's regler)

### I Stripe Checkout
- **Produkt navn**: "Klarpakke Basis" / "Klarpakke Komplett" / "Klarpakke Pro"
- **Beskrivelse**: Full beskrivelse vises under produktnavn
- **Pris**: Vises automatisk i kundens valgte valuta

### I Faktura Email
Stripe sender automatisk email med:
- Produkt navn og beskrivelse
- Pris og periode
- Neste fakturadato (for abonnement)
- Link til Stripe Customer Portal

---

## ✅ Neste Steg

1. **Test Checkout Flow**
   ```bash
   npm run dev
   # Gå til /priser
   # Velg en plan
   # Test med Stripe test kort: 4242 4242 4242 4242
   ```

2. **Verifiser Webhook**
   ```bash
   # Terminal 1: Start dev server
   npm run dev

   # Terminal 2: Start Stripe webhook forwarding
   stripe listen --forward-to localhost:3000/api/webhooks/stripe

   # Test en betaling og sjekk logs
   ```

3. **Sjekk Supabase**
   - Åpne Supabase dashboard
   - Sjekk `subscriptions` tabell
   - Verifiser at data blir lagret korrekt

4. **Deploy til Produksjon**
   ```bash
   # Legg til production webhook secret i Cloudflare Workers secrets
   wrangler secret put STRIPE_WEBHOOK_SECRET

   # Deploy
   git push origin main
   # Cloudflare Workers Builds deployer automatisk
   ```

---

## 🚨 Viktig!

### Test vs Live Mode
- **Alle priser over er TEST MODE** (`price_1Szx...`)
- For produksjon må du:
  1. Bytt til Live mode i Stripe Dashboard
  2. Kjør `./scripts/setup-stripe-prices-v2.sh` på nytt
  3. Oppdater `.env.local` med live price IDs
  4. Sett opp webhook for produksjon URL

### Sikkerhet
- ✅ STRIPE_SECRET_KEY er i `.env.local` (ikke committed)
- ✅ STRIPE_WEBHOOK_SECRET er i `.env.local`
- ✅ Webhook signature verifiseres i `/api/webhooks/stripe`
- ✅ Price IDs er public (NEXT_PUBLIC_*), ingen security risk

---

## 📊 Prissammenligning

| Tier | NOK/måned | EUR/måned | USD/måned | Årlig besparelse |
|------|-----------|-----------|-----------|------------------|
| Basis | 199 kr | €19 | $19 | 1 måned gratis |
| Komplett | 399 kr | €39 | $39 | 1 måned gratis |
| Pro | 999 kr | €99 | $99 | 1 måned gratis |

Alle årlige planer gir 10% rabatt (1 måned gratis).

---

## 🎯 Conversion Optimization

### Anbefalt Strategi
1. **Highlight Komplett** som anbefalt plan
2. **Show savings** på årlige planer
3. **7-dagers gratis prøveperiode** for Basis
4. **Ingen bindingstid** - kanseller når som helst
5. **30-dagers pengene tilbake** garanti

---

**Status**: ✅ Fullstendig konfigurert og klar for testing!
