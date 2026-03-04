# Paywall Implementation Guide

**Side:** `/app/paywall`  
**Kontraktversjon:** 2.0.0  
**Formål:** Konvertere gratis-brukere (Student) til betalende abonnenter

> ⚠️ Klarpakke er en utdanningsplattform for krypto. Alle verktøy brukes av brukerne under eget ansvar. Vi gir ikke finansråd.

---

## Oversikt

Paywall-siden vises til brukere når:
1. Prøveperioden er utløpt (14 dager)
2. Bruker forsøker å bruke betalte funksjoner uten abonnement
3. Bruker klikker "Oppgrader" fra dashbordet

---

## Webflow DOM-kontrakt

### Påkrevde ankere

#### Rotelement
```html
<div id="klarpakke-paywall-root" data-kp-root="paywall"></div>
```

#### Overskrifter
```html
<h1 id="paywall-headline">Testen er over – fortsett med abonnement</h1>
<p id="paywall-subheadline">Velg planen som passer deg</p>
```

#### Brukerkontekst (Valgfri)
```html
<span data-user-email="user@example.com"></span>
<span data-user-name="Ola Nordmann"></span>
```

#### Plankort-container
```html
<div id="paywall-plans">
  <!-- Bachelor Plan -->
  <div data-plan="bachelor" data-paywall-upgrade-btn="">
    <h3>Bachelor</h3>
    <p class="price">249 kr/mnd</p>
    <ul class="features">
      <li>✅ Spot trading (live)</li>
      <li>✅ Auto Trade 1 strategi (paper + live)</li>
      <li>✅ Copy Trading (følge andre)</li>
      <li>❌ Futures</li>
    </ul>
    <button>Velg Bachelor</button>
  </div>

  <!-- Master Plan -->
  <div data-plan="master" data-paywall-upgrade-btn="">
    <h3>Master</h3>
    <p class="price">499 kr/mnd</p>
    <ul class="features">
      <li>✅ Alt i Bachelor</li>
      <li>✅ Auto Trade 3 strategier (paper + live)</li>
      <li>✅ SMS-varsler</li>
      <li>✅ Limit orders</li>
    </ul>
    <button>Velg Master</button>
  </div>

  <!-- Professor Plan -->
  <div data-plan="professor" data-paywall-upgrade-btn="">
    <h3>Professor</h3>
    <p class="price">1 249 kr/mnd</p>
    <ul class="features">
      <li>✅ Alt i Master</li>
      <li>✅ Auto Trade ubegrenset*</li>
      <li>✅ Futures trading**</li>
      <li>✅ Margin trading</li>
    </ul>
    <button>Velg Professor</button>
    <small>*Paper + live | **Krever bestått Futures-quiz</small>
  </div>
</div>
```

#### Logg ut-knapp
```html
<button data-logout-btn="">Logg ut</button>
```

#### Binance Referral CTA
```html
<a data-binance-referral-btn="" 
   data-track-event="binance_referral_click"
   href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BOO6JZZW"
   target="_blank">
  Opprett Binance-konto
</a>
```

#### Trial-status (Dynamisk)
```html
<div data-trial-status="expired" data-trial-days-remaining="0">
  Din prøveperiode er utløpt
</div>
```

#### Futures Quiz Gate (Skjult som standard)
```html
<div data-futures-quiz-gate="" style="display: none;">
  <p>For å få tilgang til Futures må du bestå vår sertifiseringsquiz.</p>
  <a href="/quiz/futures">Start Futures-quiz</a>
</div>
```

---

## JavaScript-integrasjon

### Påkrevde skript
```javascript
// I Webflow Custom Code (Footer)
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/paywall.js"></script>
```

### paywall.js Logikk

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login?redirect=/app/paywall';
    return;
  }

  const entitlements = await fetch('/functions/v1/get-entitlements', {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  }).then(r => r.json());

  if (entitlements.subscription.is_trial_expired) {
    showExpiredMessage();
  }

  updateUserContext(session.user);
  setupPlanButtons(entitlements);

  // Vis Futures quiz gate hvis Professor uten bestått quiz
  if (entitlements.subscription.tier === 'professor' && !entitlements.entitlements.futures.quiz_passed) {
    showFuturesQuizGate();
  }
});

function setupPlanButtons(entitlements) {
  document.querySelectorAll('[data-paywall-upgrade-btn]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const plan = e.currentTarget.closest('[data-plan]').dataset.plan;
      // plan verdier: 'bachelor' | 'master' | 'professor'
      
      await fetch('/functions/v1/track-event', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          event_name: 'plan_select',
          props: { plan, source: 'paywall' }
        })
      });

      window.location.href = `/checkout?plan=${plan}`;
    });
  });
}
```

---

## Trial-gating-logikk

### Omdirigering-regler

```typescript
export function shouldRedirectToPaywall(user: User): boolean {
  if (user.subscription_status === 'trial' && user.trial_ends_at < now()) {
    return true;
  }
  if (user.subscription_status === 'expired' || user.subscription_status === 'canceled') {
    return true;
  }
  return false;
}
```

### Tilgang under utløpt trial

Brukere med utløpt trial KAN aksessere:
- `/app/paywall` — For å oppgradere
- `/app/settings` — For å administrere konto
- `/help` — Supportsider
- `/pricing` — Offentlig prisinformasjon

Brukere KAN IKKE aksessere:
- `/app/dashboard` — Handelssignaler
- `/app/kalkulator` — Handelsverktøy
- Noen handelsfunksjonalitet

---

## Auto Trade — Studenttilgang

Student-brukere (gratis) har begrenset auto trade-tilgang:
- ✅ **1 Paper Trading auto trade** er tillatt
- ❌ Live auto trade er IKKE tillatt
- Vis "Oppgrader til Bachelor for live auto trade" ved forsøk

```javascript
// Sjekk auto trade-tillatelse
function checkAutoTradeAccess(entitlements, mode) {
  const { tier, auto_trade_limit, live_trading_enabled } = entitlements.subscription;
  
  if (mode === 'live' && !live_trading_enabled) {
    showUpgradeModal('Auto Trade (live) krever Bachelor eller høyere');
    return false;
  }
  
  if (entitlements.active_auto_trades >= auto_trade_limit) {
    showUpgradeModal(`Du har nådd grensen på ${auto_trade_limit} auto trade(s) for ${tier}`);
    return false;
  }
  
  return true;
}
```

---

## Event-tracking

| Event | Trigger | Props |
|-------|---------|-------|
| `paywall_view` | Sidelast | { trial_expired: boolean, current_tier: string } |
| `plan_select` | Klikk planknapp | { plan: 'bachelor'\|'master'\|'professor', source: 'paywall' } |
| `binance_referral_click` | Klikk Binance-lenke | { location: 'paywall' } |
| `futures_quiz_prompt_view` | Vis quiz gate | - |
| `logout_from_paywall` | Klikk logg ut | - |
| `auto_trade_upgrade_prompt` | Blokkert auto trade | { mode: 'live'\|'paper', tier: string } |

---

## Visuell layout

```
┌─────────────────────────────────────────────────┐
│  Header: "Testen er over"                       │
│  Sub: "Velg abonnement for å fortsette"        │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │Bachelor  │ │ Master   │ │Professor │        │
│  │249 kr    │ │499 kr    │ │1 249 kr  │        │
│  │1 Auto    │ │3 Auto    │ │Ubegrenset│        │
│  │[Velg]    │ │[Velg]★  │ │[Velg]    │        │
│  └──────────┘ └──────────┘ └──────────┘        │
│         ★ = Anbefalt                           │
├─────────────────────────────────────────────────┤
│  [Opprett Binance-konto]       [Logg ut]       │
└─────────────────────────────────────────────────┘
```

---

## Relatert dokumentasjon

- [PRICING.md](./PRICING.md) — Full prisinformasjon
- [AUTO-TRADE-PLAN.md](./AUTO-TRADE-PLAN.md) — Auto trade implementasjonsplan
- [LEADERBOARD.md](./LEADERBOARD.md) — Læringspoeng-system
