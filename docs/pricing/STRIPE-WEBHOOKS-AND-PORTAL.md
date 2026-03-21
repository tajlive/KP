# Stripe — webhooks og Customer Portal

## Webhook-endepunkt

**URL (prod):** `https://www.klarpakke.no/api/webhooks/stripe`  
**Hemmelighet:** `STRIPE_WEBHOOK_SECRET` (signeringsnøkkel fra Stripe Dashboard → Developers → Webhooks).

### Hendelser appen håndterer

Implementert i [`src/app/api/webhooks/stripe/route.ts`](../../src/app/api/webhooks/stripe/route.ts):

| Event                           | Formål                        |
| ------------------------------- | ----------------------------- |
| `checkout.session.completed`    | Nytt kjøp / checkout fullført |
| `invoice.payment_succeeded`     | Vellykket fornyelse           |
| `invoice.payment_failed`        | Mislykket trekk               |
| `customer.subscription.updated` | Endret plan, pause, osv.      |
| `customer.subscription.deleted` | Oppsigelse                    |

Andre event-typer logges som «Ubehandlet» og returnerer fortsatt `200` til Stripe (unngå unødvendige retries) — vurder å abonnere kun på listen over i Dashboard.

**Lokal test:** `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

## Customer Portal

**API:** `POST /api/stripe/customer-portal` (innlogget bruker, session-cookie).  
**UI:** Innstillinger → seksjon «Abonnement» ([`InnstillingerClient.tsx`](../../src/app/[locale]/innstillinger/InnstillingerClient.tsx)).

- Krever `stripe_customer_id` på brukerens rad i `subscriptions` (settes ved checkout).
- `return_url` peker tilbake til `/innstillinger` (eller `/en/innstillinger`) via `hrefWithLocale`.

### Stripe Dashboard

1. **Settings → Customer portal** — aktiver portalen og velg hva kunder kan gjøre (oppdatere betalingsmetode, si opp, osv.).
2. Uten aktivert portal returnerer Stripe feil; API-et svarer med en forklarende melding.

---

## Prøveperiode (trial)

`getStripeCheckoutTrialDays()` i [`src/lib/pricing.config.ts`](../../src/lib/pricing.config.ts) styrer prøveperiode: **Bachelor har ingen trial**; Master, PhD og Professor får `TRIAL_DAYS` (**14**) som `subscription_data.trial_period_days` når checkout opprettes.  
FAQ og checkout-tekst (no/en) er synket til denne fordelingen.
