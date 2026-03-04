# FASE 4: STRIPE BILLING

**Estimert tid:** 10 timer  
**Mål:** Complete billing flow med norsk Vipps-støtte

---

## Task 4.1: Stripe Account Setup

### Opprett Stripe Account (hvis ikke eksisterer)

1. Gå til [stripe.com](https://stripe.com)
2. Registrer konto for Blyt AS
3. Fullfør verifikasjon med:
   - Org.nr: 929003292
   - Adresse: Tempevegen 31, 7031 Trondheim
   - Kontakt: kontakt@klarpakke.no

### Aktiver norske betalingsmetoder

I Stripe Dashboard:
1. Settings → Payment methods
2. Aktiver: 
   - Card payments (alltid på)
   - Vipps (hvis tilgjengelig for Norge)
   - Bank transfer (for enterprise)

### Hent API nøkler

```bash
# Test keys (bruk disse for utvikling)
STRIPE_TEST_PUBLISHABLE_KEY=pk_test_...
STRIPE_TEST_SECRET_KEY=sk_test_...

# Live keys (kun for produksjon)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...

# Webhook secret (settes opp etter webhook konfigurasjon)
STRIPE_WEBHOOK_SECRET=whsec_...
```

Legg til i `.env`:
```bash
echo "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}" >> .env
echo "STRIPE_PUBLISHABLE_KEY=${STRIPE_PUBLISHABLE_KEY}" >> .env
```

---

## Task 4.2: Stripe Products & Prices

### Opprett produkter i Stripe

**Kjør setup script:**

```bash
# Fil: scripts/setup-stripe-products.js

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const products = [
  {
    name: 'Klarpakke PRO',
    description: 'Trading signaltjeneste - 500 kr/mnd',
    metadata: { tier: 'pro', internal_id: 'prod_pro' }
  },
  {
    name: 'Klarpakke PREMIUM',
    description: 'Trading signaltjeneste + Coaching - 1000 kr/mnd',
    metadata: { tier: 'premium', internal_id: 'prod_premium' }
  },
  {
    name: 'Klarpakke ELITE',
    description: 'Trading signaltjeneste + 1-on-1 Coaching - 1500 kr/mnd',
    metadata: { tier: 'elite', internal_id: 'prod_elite' }
  }
];

async function setupProducts() {
  for (const prod of products) {
    // Create product
    const product = await stripe.products.create({
      name: prod.name,
      description: prod.description,
      metadata: prod.metadata
    });
    
    // Create recurring price
    const prices = {
      pro: 50000,      // 500 NOK
      premium: 100000, // 1000 NOK
      elite: 150000    // 1500 NOK
    };
    
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: prices[prod.metadata.tier],
      currency: 'nok',
      recurring: { interval: 'month' }
    });
    
    console.log(`${prod.name}: ${product.id} / ${price.id}`);
  }
}

setupProducts();
```

### Lagre Price IDs

**Fil:** `supabase/seed/stripe_products.sql`

```sql
-- Insert Stripe product/price mappings
-- UPDATE THESE with actual IDs from Stripe

INSERT INTO stripe_products (tier, stripe_product_id, stripe_price_id, amount_nok)
VALUES
  ('pro', 'prod_xxxxx', 'price_xxxxx', 500),
  ('premium', 'prod_xxxxx', 'price_xxxxx', 1000),
  ('elite', 'prod_xxxxx', 'price_xxxxx', 1500);
```

---

## Task 4.3: Webflow Paywall Page

### /app/paywall page

**Page Settings:**
- Title: `Oppgrader din konto - Klarpakke`
- Slug: `app/paywall`
- Protected: Yes

**DOM Structure:**
```html
<div id="klarpakke-paywall-root" data-kp-root="paywall">
  
  <!-- Trial Status Banner -->
  <div class="trial-banner" data-trial-banner>
    <h2>🎉 Din 14-dagers gratis prøveperiode</h2>
    <p data-trial-days>Gjenstår: 12 dager</p>
  </div>
  
  <!-- Pricing Cards -->
  <div class="pricing-grid">
    
    <!-- PRO Plan -->
    <div class="pricing-card" data-plan="pro">
      <h3>PRO</h3>
      <div class="price">500 kr<span>/mnd</span></div>
      <ul class="features">
        <li>✓ Paper Trading (ubegrenset)</li>
        <li>✓ Spot Trading Signals</li>
        <li>✓ Discord Community</li>
        <li>✓ Basisanalyse</li>
      </ul>
      <button data-checkout="pro">Velg PRO</button>
    </div>
    
    <!-- PREMIUM Plan -->
    <div class="pricing-card featured" data-plan="premium">
      <div class="badge">MEST POPULÆR</div>
      <h3>PREMIUM</h3>
      <div class="price">1 000 kr<span>/mnd</span></div>
      <ul class="features">
        <li>✓ Alt i PRO</li>
        <li>✓ Futures Trading Signals</li>
        <li>✓ SMS Varsler</li>
        <li>✓ Gruppesessions</li>
      </ul>
      <button data-checkout="premium">Velg PREMIUM</button>
    </div>
    
    <!-- ELITE Plan -->
    <div class="pricing-card" data-plan="elite">
      <h3>ELITE</h3>
      <div class="price">1 500 kr<span>/mnd</span></div>
      <ul class="features">
        <li>✓ Alt i PREMIUM</li>
        <li>✓ 1-on-1 Coaching</li>
        <li>✓ Prioritetsupport</li>
        <li>✓ Skreddersydd strategi</li>
      </ul>
      <button data-checkout="elite">Velg ELITE</button>
    </div>
    
  </div>
  
  <!-- FAQ -->
  <div class="paywall-faq">
    <h3>Ofte stilte spørsmål</h3>
    <details>
      <summary>Kan jeg bytte plan senere?</summary>
      <p>Ja, du kan oppgradere eller nedgradere når som helst.</p>
    </details>
    <details>
      <summary>Hvordan fungerer 14-dagers prøveperioden?</summary>
      <p>Du får full tilgang til alle funksjoner i 14 dager. Ingen kredittkort nødvendig.</p>
    </details>
    <details>
      <summary>Hva skjer når jeg sier opp?</summary>
      <p>Du beholder tilgangen ut perioden du har betalt for. Ingen binding.</p>
    </details>
  </div>
  
</div>

<script src="https://js.stripe.com/v3/"></script>
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script>
(async function() {
  const session = await window.klarpakkeAuth.requireAuth();
  
  // Load trial status
  const { data: profile } = await window.klarpakkeSupabase
    .from('profiles')
    .select('trial_ends_at, subscription_tier')
    .single();
  
  if (profile) {
    const daysRemaining = Math.max(0, Math.ceil(
      (new Date(profile.trial_ends_at) - new Date()) / (1000 * 60 * 60 * 24)
    ));
    
    if (daysRemaining > 0) {
      document.querySelector('[data-trial-days]').textContent = 
        `Gjenstår: ${daysRemaining} dag${daysRemaining !== 1 ? 'er' : ''}`;
    } else {
      document.querySelector('[data-trial-banner]').innerHTML = `
        <h2>⏰ Prøveperioden er utløpt</h2>
        <p>Oppgrader for å fortsette å bruke Klarpakke</p>
      `;
    }
    
    // Highlight current plan
    if (profile.subscription_tier !== 'free') {
      document.querySelector(`[data-plan="${profile.subscription_tier}"]`)
        ?.classList.add('current-plan');
    }
  }
  
  // Checkout handlers
  document.querySelectorAll('[data-checkout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tier = btn.dataset.checkout;
      
      try {
        const { data, error } = await window.klarpakkeSupabase
          .functions.invoke('create-checkout-session', {
            body: { tier }
          });
        
        if (error) throw error;
        
        // Redirect to Stripe Checkout
        window.location.href = data.url;
        
      } catch (err) {
        alert('Kunne ikke starte betaling: ' + err.message);
      }
    });
  });
})();
</script>
```

---

## Task 4.4: Edge Functions

### create-checkout-session

**Fil:** `supabase/functions/create-checkout-session/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const stripe = require('stripe')(Deno.env.get('STRIPE_SECRET_KEY'));

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }
  
  const authHeader = req.headers.get('Authorization');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data: { user } } = await supabase.auth.getUser(
    authHeader?.replace('Bearer ', '')
  );
  
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const { tier } = await req.json();
  
  // Get Stripe price ID for tier
  const { data: product } = await supabase
    .from('stripe_products')
    .select('stripe_price_id')
    .eq('tier', tier)
    .single();
  
  if (!product) {
    return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400 });
  }
  
  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();
  
  let customerId = profile?.stripe_customer_id;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id }
    });
    customerId = customer.id;
    
    await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
  }
  
  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{
      price: product.stripe_price_id,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: `${Deno.env.get('APP_URL')}/app/dashboard?checkout=success`,
    cancel_url: `${Deno.env.get('APP_URL')}/app/paywall?checkout=cancelled`,
    metadata: { user_id: user.id, tier }
  });
  
  return new Response(JSON.stringify({ url: session.url }), { status: 200 });
};
```

### stripe-webhook

**Fil:** `supabase/functions/stripe-webhook/index.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const stripe = require('stripe')(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

export default async (req: Request) => {
  const signature = req.headers.get('stripe-signature');
  
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      await req.text(),
      signature,
      webhookSecret
    );
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const tier = session.metadata.tier;
      
      // Update profile
      await supabase
        .from('profiles')
        .update({
          subscription_tier: tier,
          subscription_status: 'active',
          stripe_subscription_id: session.subscription,
          subscribed_at: new Date().toISOString()
        })
        .eq('user_id', userId);
      
      // Log event
      await supabase.rpc('track_event', {
        p_user_id: userId,
        p_event_type: 'subscription_started',
        p_properties: { tier, stripe_session_id: session.id }
      });
      
      break;
    }
    
    case 'invoice.paid': {
      const invoice = event.data.object;
      // Subscription renewed
      break;
    }
    
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const userId = invoice.customer;
      
      // Update status
      await supabase
        .from('profiles')
        .update({ subscription_status: 'past_due' })
        .eq('stripe_customer_id', userId);
      
      // Send email notification
      // TODO: Trigger email via edge function
      
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      
      await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null
        })
        .eq('stripe_subscription_id', subscription.id);
      
      break;
    }
  }
  
  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
```

---

## Task 4.5: Billing Page

### /app/billing page

**DOM Structure:**
```html
<div id="klarpakke-billing-root" data-kp-root="billing">
  
  <h1>Billing & Abonnement</h1>
  
  <!-- Current Plan -->
  <div class="current-plan-card">
    <h2>Nåværende Plan</h2>
    <div class="plan-info">
      <span class="tier" data-current-tier>PRO</span>
      <span class="status" data-sub-status>Active</span>
    </div>
    <p data-next-billing>Neste faktura: 15. mars 2026</p>
  </div>
  
  <!-- Payment Methods -->
  <div class="payment-methods">
    <h2>Betalingsmetoder</h2>
    <div data-payment-methods>
      <!-- Loaded dynamically -->
    </div>
    <button data-add-payment>Legg til betalingsmetode</button>
  </div>
  
  <!-- Invoices -->
  <div class="invoices">
    <h2>Fakturaer</h2>
    <table>
      <thead>
        <tr>
          <th>Dato</th>
          <th>Beskrivelse</th>
          <th>Beløp</th>
          <th>Status</th>
          <th>Download</th>
        </tr>
      </thead>
      <tbody data-invoices-tbody>
        <!-- Loaded dynamically -->
      </tbody>
    </table>
  </div>
  
  <!-- Cancel Subscription -->
  <div class="danger-zone">
    <h2>Kanseller Abonnement</h2>
    <p>Du vil beholde tilgangen ut perioden du har betalt for.</p>
    <button data-cancel-sub class="danger">Kanseller</button>
  </div>
  
</div>

<script>
(async function() {
  await window.klarpakkeAuth.requireAuth();
  
  // Load subscription info
  const { data: profile } = await window.klarpakkeSupabase
    .from('profiles')
    .select('*')
    .single();
  
  document.querySelector('[data-current-tier]').textContent = 
    profile?.subscription_tier?.toUpperCase() || 'FREE';
  document.querySelector('[data-sub-status]').textContent = 
    profile?.subscription_status || 'Trial';
  
  // Cancel handler
  document.querySelector('[data-cancel-sub]')?.addEventListener('click', async () => {
    if (!confirm('Er du sikker på at du vil kansellere abonnementet?')) return;
    
    const { error } = await window.klarpakkeSupabase
      .functions.invoke('cancel-subscription', {});
    
    if (error) {
      alert('Kunne ikke kansellere: ' + error.message);
      return;
    }
    
    alert('Abonnementet er kansellert. Du har tilgang ut perioden.');
    location.reload();
  });
})();
</script>
```

---

## Task 4.6: Vipps Integration (Future)

### Vipps MobilePay API (når tilgjengelig)

**Forberedende kode:**

```typescript
// Vipps recurring payments
async function createVippsAgreement(userId: string, tier: string) {
  const amountNok = tier === 'pro' ? 500 : tier === 'premium' ? 1000 : 1500;
  
  // TODO: Implement when Vipps API is available
  const agreement = await fetch('https://api.vipps.no/recurring/v3/agreements', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VIPPS_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currency: 'NOK',
      interval: { period: 'MONTH', count: 1 },
      pricing: { amount: amountNok * 100 }, // øre
      productName: `Klarpakke ${tier.toUpperCase()}`,
      merchantRedirectUrl: `${APP_URL}/vipps/return`,
      merchantAgreementUrl: `${APP_URL}/app/billing`
    })
  });
  
  return agreement.json();
}
```

---

## VERIFIKASJON

### Test Stripe flow

```bash
# 1. Test checkout session
curl -X POST "${SUPABASE_URL}/functions/v1/create-checkout-session" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"tier": "pro"}'

# 2. Test webhook locally
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# 3. Create test subscription in Stripe
stripe trigger checkout.session.completed
```

---

## LEVERANSE

Etter FASE 4 skal du ha:

- [ ] Stripe produkter opprettet (PRO/PREMIUM/ELITE)
- [ ] create-checkout-session edge function
- [ ] stripe-webhook edge function
- [ ] Paywall page med 3 pricing tiers
- [ ] Billing page med subscription management
- [ ] Webhook håndterer alle viktige events
- [ ] Testet med Stripe test mode

---

## NESTE STEG

Gå til **FASE 5: Signal System** → `docs/FASE-5-SIGNALS.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
