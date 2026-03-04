# Webflow Setup Guide for Klarpakke MVP

**Version:** 1.5.0  
**Pages:** 26  
**Total Anchors:** 174

---

## Oversikt

Denne guiden forklarer hvordan du setter opp alle 26 sider i Webflow med riktige DOM-ankere, scripts og autentisering.

---

## Før du starter

### 1. Importer kontrakten
```bash
# Kontraktfilen ligger her:
webflow/contract/klarpakke-pages.v1.json

# Denne brukes av Webflow Designer Extension eller manuelt
```

### 2. Forberedelser i Webflow
- Opprett nytt prosjekt (eller bruk eksisterende)
- Aktiver "Custom Code" i Site Settings
- Noter deg Site ID for API-kall

---

## Global Innstillinger

### Custom Code (Head - Global)

Gå til **Site Settings → Custom Code → Head Code**

```html
<!-- Klarpakke Global Config -->
<script>
  window.KLARPAKKE = {
    supabaseUrl: 'https://din-prosjekt.supabase.co',
    supabaseAnonKey: 'din-anon-key',
    siteUrl: 'https://ditt-domene.webflow.io',
    version: '1.5.0'
  };
</script>

<!-- Supabase Auth -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>

<!-- Klarpakke Auth (lokal eller CDN) -->
<script src="https://cdn.klarpakke.no/auth.js"></script>
```

### Custom Code (Footer - Global)

```html
<!-- Global Analytics -->
<script>
  // Track page views
  if (window.KLARPAKKE && window.trackEvent) {
    trackEvent('page_view', {
      path: window.location.pathname,
      referrer: document.referrer
    });
  }
</script>
```

---

## Side-oppsett (Side for Side)

### 1. OFFENTLIGE SIDER (Ingen Auth)

---

#### `/` - Home (Landing Page)

**Page Settings:**
- Title: `Klarpakke - Trygg Krypto-Trading`
- Description: `Profesjonelle trading-signaler med Trygg Modus...`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
```

**DOM Structure:**
```html
<!-- Root -->
<div id="klarpakke-home-root" data-kp-root="home">
  
  <!-- Hero Section -->
  <section id="hero-section">
    <h1 id="hero-headline">Smartere trading. Tryggere læring.</h1>
    <p id="hero-subheadline">Bli med 1000+ nordmenn som lærer ansvarlig krypto-trading</p>
    <a id="hero-cta" href="/signup" class="button-primary">
      Start gratis prøveperiode
    </a>
  </section>
  
  <!-- Features Section -->
  <section id="features-section">
    <!-- Legg til feature cards her -->
  </section>
  
</div>
```

**Webflow Classes:**
- `#klarpakke-home-root`: Wrapper for hele siden
- `#hero-section`: Hero wrapper
- `#hero-headline`: H1, stor og tydelig
- `#hero-cta`: Primær knapp

---

#### `/pricing` - Pricing

**Page Settings:**
- Title: `Priser - Klarpakke`
- Description: `Velg riktig abonnement for dine trading-behov.`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-pricing-root" data-kp-root="pricing">
  <section id="pricing-section">
    
    <!-- Free/Trial -->
    <div data-plan="free">
      <h3>Gratis prøveperiode</h3>
      <p class="price">0 kr / 14 dager</p>
      <ul>
        <li>Full tilgang i 14 dager</li>
        <li>Paper trading</li>
        <li>Alle læringsmoduler</li>
      </ul>
      <a href="/signup" class="button-secondary">Start nå</a>
    </div>
    
    <!-- Standard -->
    <div data-plan="standard" data-featured="false">
      <h3>Standard</h3>
      <p class="price">500 kr/mnd</p>
      <ul>
        <li>Spot trading</li>
        <li>Autotrade (5 posisjoner)</li>
        <li>E-post & push-varsler</li>
      </ul>
      <a href="/signup" class="button-primary">Velg Standard</a>
    </div>
    
    <!-- Pluss -->
    <div data-plan="pluss" data-featured="true">
      <h3>Pluss</h3>
      <p class="price">1000 kr/mnd</p>
      <span class="badge">Mest populær</span>
      <ul>
        <li>Alt i Standard</li>
        <li>SMS-varsler</li>
        <li>Limit orders</li>
        <li>Top 100 coins</li>
      </ul>
      <a href="/signup" class="button-primary">Velg Pluss</a>
    </div>
    
    <!-- VIP Ekstrem -->
    <div data-plan="vip_ekstrem" data-featured="false">
      <h3>VIP Ekstrem</h3>
      <p class="price">1500 kr/mnd</p>
      <ul>
        <li>Alt i Pluss</li>
        <li>Futures trading*</li>
        <li>Margin trading</li>
        <li>Ubegrensede posisjoner</li>
      </ul>
      <small>*Krever bestått Futures-quiz</small>
      <a href="/signup" class="button-primary">Velg VIP</a>
    </div>
    
  </section>
</div>
```

**Tips:** Marker Pluss-planen som "Mest populær" med en badge.

---

#### `/leaderboard` - Public Leaderboard

**Page Settings:**
- Title: `Beste elever - Klarpakke`
- Description: `Se månedens beste tradere basert på læring og disiplin.`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/leaderboard-public.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-public-leaderboard-root" data-kp-root="public-leaderboard">
  
  <div id="public-leaderboard-header">
    <h1 data-public-title>Beste elever</h1>
    <p data-public-subtitle>
      Månedlig kåring basert på læring, risikodisiplin og paper trading
    </p>
  </div>
  
  <!-- Leaderboard Table -->
  <div data-public-leaderboard>
    <table>
      <thead>
        <tr>
          <th>Rang</th>
          <th>Navn</th>
          <th>Poeng</th>
          <th>Moduler</th>
          <th>Quizer</th>
        </tr>
      </thead>
      <tbody data-public-top-users>
        <!-- JS fyller inn -->
      </tbody>
    </table>
  </div>
  
  <!-- CTA -->
  <a data-join-cta href="/signup" class="button-primary">
    Bli med og konkurrer!
  </a>
  
  <!-- Scoring Info -->
  <div data-scoring-info>
    <h3>Hvordan fungerer poeng?</h3>
    <ul>
      <li>Modul fullført: 10 poeng</li>
      <li>Quiz bestått: 25 poeng</li>
      <li>Perfekt score: 50 poeng</li>
      <li>Paper trade (profitt): 20 poeng</li>
    </ul>
  </div>
  
  <!-- Anonym Notice -->
    <div data-anon-notice>
    Kun fornavn vises. Full anonymitet garantert.
  </div>
  
</div>
```

**Webflow Dynamic List:**
- Bruk Collection List for leaderboard-rader
- Koble til API fra `current_leaderboard` view

---

#### `/onboarding` - Onboarding

**Page Settings:**
- Title: `Velkommen til Klarpakke`
- Description: `Kom i gang med trygg krypto-trading på 3 enkle steg.`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/onboarding.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-onboarding-root" data-kp-root="onboarding">
  
  <div id="onboarding-header">
    <h1 data-welcome-title>Velkommen til Klarpakke</h1>
    <p data-welcome-subtitle>
      Lær ansvarlig trading med støtte fra vårt fellesskap
    </p>
  </div>
  
  <!-- 3 Steps -->
  <div data-steps-container>
    
    <div data-step="1">
      <span class="step-number">1</span>
      <h3>Opprett konto</h3>
      <p>Gratis prøveperiode i 14 dager. Ingen kort påkrevd.</p>
    </div>
    
    <div data-step="2">
      <span class="step-number">2</span>
      <h3>Lær med paper trading</h3>
      <p>Øv deg med virtuelle penger før du trader med ekte.</p>
    </div>
    
    <div data-step="3">
      <span class="step-number">3</span>
      <h3>Bli en bedre trader</h3>
      <p>Følg signaler, lær av feil, og bygg din strategi.</p>
    </div>
    
  </div>
  
  <!-- CTA -->
  <a data-signup-cta href="/signup" class="button-primary">
    Start din reise
  </a>
  
  <p>Allerede bruker? <a data-login-link href="/login">Logg inn</a></p>
  
  <!-- Trial Info -->
  <div data-trial-info>
    <p>🎁 14 dager gratis prøveperiode</p>
    <p>✅ Full tilgang til alle funksjoner</p>
    <p>✅ Avslutt når som helst</p>
  </div>
  
  <!-- Features Preview -->
  <div data-features-preview>
    <!-- Feature ikoner/bilder -->
  </div>
  
</div>
```

---

### 2. APP-SIDER (Auth påkrevd)

Alle app-sider har fellestrekk:
1. **Paywall-gating:** Omdirigerer til `/app/paywall` hvis trial utløpt
2. **Auth-sjekk:** Omdirigerer til `/login` hvis ikke innlogget
3. **Scripts:** `auth.js`, `app-with-auth.js`, + spesifikke scripts

---

#### `/app/dashboard` - Dashboard

**Page Settings:**
- Title: `Dashboard - Klarpakke`
- Description: `Oversikt over trading-signaler og aktivitet.`
- Robots: `noindex, nofollow`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/dashboard-roles.js"></script>
<script src="https://cdn.klarpakke.no/realtime.js"></script>
<script src="https://cdn.klarpakke.no/learning-widgets.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-dashboard-root" data-kp-root="dashboard">
  
  <!-- Header -->
  <div id="dashboard-header">
    <h1 data-welcome-message>Hei, <span data-user-name>Trader</span>!</h1>
    <span data-subscription-badge class="badge">Gratis prøveperiode</span>
  </div>
  
  <!-- Learning Widgets -->
  <div data-learning-widgets>
    
    <!-- Daily Tip -->
    <div data-daily-tip>
      <h4>💡 Dagens tips</h4>
      <p>"Aldri invester mer enn du tåler å tape."</p>
    </div>
    
    <!-- Progress -->
    <div data-progress-widget>
      <h4>Din fremgang</h4>
      <p><span data-modules-completed>3</span>/10 moduler fullført</p>
      <div class="progress-bar"></div>
    </div>
    
    <!-- Quiz Progress -->
    <div data-quiz-progress>
      <h4>Quizer</h4>
      <p>Spot: ✅ | Futures: ⏳</p>
    </div>
    
  </div>
  
  <!-- Paper Trading Banner -->
  <div data-paper-trading-banner>
    <p>💡 Du er i Paper Trading-modus. Øv deg uten risiko!</p>
  </div>
  
  <!-- Signals -->
  <div data-signals-container>
    <h2>Trading-signaler</h2>
    
    <!-- Filters -->
    <div id="filters-section">
      <button id="filter-all" data-filter="all">Alle</button>
      <button data-filter="spot">Spot</button>
      <button data-filter="futures">Futures</button>
    </div>
    
    <!-- Signal Cards -->
    <div class="signals-list">
      <!-- JS fyller inn fra Supabase -->
    </div>
  </div>
  
  <!-- Quick Actions -->
  <div data-quick-actions>
    <a data-go-to-quiz href="/quiz/futures">📝 Ta Futures Quiz</a>
    <a data-go-to-billing href="/app/billing">💳 Abonnement</a>
  </div>
  
  <!-- Paper Trading Widget -->
  <div id="klarpakke-paper-trading-root" data-kp-feature="paper-trading">
    <div data-paper-trading-badge>Paper Trading</div>
    <!-- Paper trading dashboard -->
  </div>
  
</div>
```

---

#### `/app/paywall` - Paywall

**Page Settings:**
- Title: `Velg abonnement - Klarpakke`
- Description: `Oppgrader for å få full tilgang.`
- Robots: `noindex, nofollow`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/paywall.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-paywall-root" data-kp-root="paywall">
  
  <!-- Header -->
  <h1 id="paywall-headline">Testen er over</h1>
  <p id="paywall-subheadline">
    Velg et abonnement for å fortsette å lære og trade
  </p>
  
  <!-- User Context -->
  <div data-user-email="user@example.com" data-user-name="Ola"></div>
  
  <!-- Trial Status -->
  <div data-trial-status="expired" data-trial-days-remaining="0">
    Din prøveperiode er utløpt
  </div>
  
  <!-- Plans -->
  <div id="paywall-plans">
    
    <!-- Standard -->
    <div data-plan="standard" data-paywall-upgrade-btn>
      <h3>Standard</h3>
      <p class="price">500 kr/mnd</p>
      <ul>
        <li>✅ Spot trading</li>
        <li>✅ Autotrade (5 pos)</li>
        <li>❌ Futures</li>
      </ul>
      <button class="button-primary">Velg Standard</button>
    </div>
    
    <!-- Pluss -->
    <div data-plan="pluss" data-paywall-upgrade-btn>
      <h3>Pluss</h3>
      <p class="price">1000 kr/mnd</p>
      <ul>
        <li>✅ Alt i Standard</li>
        <li>✅ SMS-varsler</li>
        <li>✅ Limit orders</li>
      </ul>
      <button class="button-primary">Velg Pluss</button>
    </div>
    
    <!-- VIP -->
    <div data-plan="vip_ekstrem" data-paywall-upgrade-btn>
      <h3>VIP Ekstrem</h3>
      <p class="price">1500 kr/mnd</p>
      <ul>
        <li>✅ Alt i Pluss</li>
        <li>✅ Futures trading*</li>
        <li>✅ Margin trading</li>
      </ul>
      <small>*Krever bestått quiz</small>
      <button class="button-primary">Velg VIP</button>
    </div>
    
  </div>
  
  <!-- Futures Quiz Gate (vises kun for VIP uten quiz) -->
  <div data-futures-quiz-gate style="display: none;">
    <p>For å få tilgang til Futures må du bestå vår sertifiseringsquiz.</p>
    <a href="/quiz/futures" class="button-secondary">Start Futures Quiz</a>
  </div>
  
  <!-- Binance Referral -->
  <a data-binance-referral-btn 
     data-track-event="binance_referral_click"
     href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BOO6JZZW"
     target="_blank"
     class="button-secondary">
    Opprett Binance-konto
  </a>
  
  <!-- Logout -->
  <button data-logout-btn class="button-text">Logg ut</button>
  
</div>
```

**Viktig:** `paywall.js` må:
1. Sjekke entitlements
2. Vise riktig plan hvis bruker allerede har abonnement
3. Tracke `paywall_view` og `plan_select` events

---

#### `/quiz/futures` - Futures Quiz

**Page Settings:**
- Title: `Futures Quiz - Klarpakke`
- Description: `Bestå Futures-quizen for å få tilgang.`
- Robots: `noindex, nofollow`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/quiz.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-futures-quiz-root" data-kp-root="futures-quiz">
  
  <!-- Header -->
  <div id="quiz-header">
    <h1 data-quiz-title>Futures Trading Sertifisering</h1>
    <p data-quiz-description>
      Denne quizen må bestås for å få tilgang til Futures trading.
      Du trenger 85% for å bestå.
    </p>
  </div>
  
  <!-- Progress -->
  <div data-quiz-progress>
    <span>Spørsmål <span class="current">1</span> av <span class="total">6</span></span>
    <div class="progress-bar"></div>
  </div>
  
  <!-- Question -->
  <div data-question-container>
    <h3 data-question-text>Laster spørsmål...</h3>
    
    <div data-answer-options>
      <!-- JS genererer alternativer -->
      <label><input type="radio" name="answer" value="0"> Alternativ 1</label>
      <label><input type="radio" name="answer" value="1"> Alternativ 2</label>
      <label><input type="radio" name="answer" value="2"> Alternativ 3</label>
    </div>
    
    <button data-submit-answer type="button">Neste</button>
  </div>
  
  <!-- Results (vises etter fullføring) -->
  <div data-quiz-results style="display: none;">
    <h2>Resultat</h2>
    
    <div data-score-display>
      <span class="score">0</span>%
    </div>
    
    <div data-pass-status>
      <!-- "Gratulerer! Du besto!" eller "Du besto ikke. Prøv igjen." -->
    </div>
    
    <button data-retry-quiz>Prøv igjen</button>
    <a data-back-to-dashboard href="/app/dashboard">Tilbake til Dashboard</a>
  </div>
  
</div>
```

**Quiz Flow:**
1. `quiz.js` kaller `get-quiz?slug=futures`
2. Viser spørsmål én om gangen
3. Bruker velger svar → klikker "Neste"
4. Ved siste spørsmål: kaller `submit-quiz`
5. Viser resultat med forklaringer

---

#### `/app/settings` - Settings

**Page Settings:**
- Title: `Innstillinger - Klarpakke`
- Description: `Administrer kontoen din.`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/settings.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-settings-root" data-kp-root="settings">
  
  <div id="settings-container">
    
    <!-- Profile -->
    <section id="profile-section">
      <h2>Profil</h2>
      <label>
        Visningsnavn
        <input data-display-name-input type="text" placeholder="Ditt navn">
      </label>
      <button data-save-profile>Lagre</button>
    </section>
    
    <!-- Notifications -->
    <section id="notifications-section">
      <h2>Varsler</h2>
      
      <label>
        <input data-push-toggle type="checkbox"> Push-varsler
      </label>
      
      <label>
        <input data-email-toggle type="checkbox"> E-post
      </label>
      
      <label>
        <input data-sms-toggle type="checkbox"> SMS
      </label>
      <div data-sms-tier-warning style="display: none;">
        SMS krever Pluss-abonnement
      </div>
    </section>
    
    <!-- Autotrade -->
    <section id="autotrade-section">
      <h2>Autotrade</h2>
      <label>
        <input data-autotrade-toggle type="checkbox">
        Aktiver autotrade
        <span data-autotrade-status>Ikke tilgjengelig på gratisplan</span>
      </label>
      
      <!-- Exchange Connection -->
      <div data-exchange-connection>
        <h3>Exchange-tilkobling</h3>
        <button data-connect-exchange>Koble til Binance</button>
        <div data-connected-exchange style="display: none;">
          <p>✅ Tilkoblet: <span class="exchange-name">Binance</span></p>
          <button data-disconnect-exchange>Koble fra</button>
        </div>
      </div>
    </section>
    
    <!-- Security -->
    <section id="security-section">
      <h2>Sikkerhet</h2>
      <label>
        <input data-safe-mode-toggle type="checkbox">
        Trygg modus
        <span data-safe-mode-status>Aktivert</span>
      </label>
      <div data-safe-mode-info>
        Trygg modus gir ekstra advarsler før risikable handlinger.
      </div>
    </section>
    
    <!-- Logout -->
    <button id="logout-button">Logg ut</button>
    
  </div>
  
</div>
```

---

#### `/app/billing` - Billing

**Page Settings:**
- Title: `Abonnement - Klarpakke`

**Custom Code (Head):**
```html
<script src="https://cdn.klarpakke.no/auth.js"></script>
<script src="https://cdn.klarpakke.no/app-with-auth.js"></script>
<script src="https://cdn.klarpakke.no/billing.js"></script>
```

**DOM Structure:**
```html
<div id="klarpakke-billing-root" data-kp-root="billing">
  
  <div id="billing-header">
    <h2>Ditt abonnement</h2>
  </div>
  
  <!-- Current Plan -->
  <div data-current-plan>
    <h3 data-plan-name>Gratis prøveperiode</h3>
    <span data-plan-status class="badge">Aktiv</span>
    
    <div data-trial-info>
      <p>Prøveperioden din slutter <span data-trial-ends>1. mars 2026</span></p>
      <p>🎁 <span data-trial-days>14</span> dager igjen</p>
    </div>
    
    <a data-upgrade-cta href="/app/paywall" class="button-primary">
      Oppgrader nå
    </a>
    
    <button data-cancel-subscription class="button-text">
      Avslutt abonnement
    </button>
  </div>
  
  <!-- Payment Method -->
  <div data-payment-method>
    <h3>Betalingsmåte</h3>
    <p>**** **** **** 4242 (Visa)</p>
    <button>Endre</button>
  </div>
  
  <!-- Billing History -->
  <div data-billing-history>
    <h3>Fakturaer</h3>
    <div data-invoices-list>
      <!-- JS fyller inn -->
    </div>
  </div>
  
</div>
```

---

#### `/app/referrals` - Referrals

**DOM Structure:**
```html
<div id="klarpakke-referrals-root" data-kp-root="referrals">
  
  <div id="referrals-header">
    <h2>Inviter venner</h2>
  </div>
  
  <!-- Referral Code -->
  <div data-referral-code>
    <h3>Din invitasjonskode</h3>
    <code>ABC123XYZ</code>
    <button data-copy-code>Kopier</button>
  </div>
  
  <!-- Stats -->
  <div data-referral-stats>
    <p>Klikk: <span data-referrals-count>12</span></p>
    <p>Påmeldte: <span>3</span></p>
    <p>Poeng tjent: <span data-referral-rewards>300</span></p>
  </div>
  
  <!-- Binance CTA -->
  <a data-binance-referral-cta 
     data-track-event="binance_referral_click"
     href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_00BOO6JZZW"
     target="_blank">
    Opprett Binance-konto
  </a>
  
  <div data-referral-instructions>
    <p>Del koden din med venner. Du får 100 poeng for hver som melder seg på!</p>
  </div>
  
</div>
```

---

### 3. ANDRE SIDER

Følg samme mønster for:
- `/app/leaderboard` - Bruk leaderboard.js
- `/app/kalkulator` - Enkel side
- `/app/history` - Bruk history.js
- `/app/profile` - Bruk profile.js

---

## JavaScript Implementasjon

### auth.js (Global)

```javascript
// Initialiser Supabase
const supabase = createClient(
  window.KLARPAKKE.supabaseUrl,
  window.KLARPAKKE.supabaseAnonKey
);

// Håndter autentisering
async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    return null;
  }
  return session;
}

// Logout
async function logout() {
  await supabase.auth.signOut();
  window.location.href = '/';
}
```

### app-with-auth.js

```javascript
// Kjør på alle /app/* sider
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Sjekk auth
  const session = await requireAuth();
  if (!session) return;
  
  // 2. Hent entitlements
  const { data: entitlements } = await fetch(
    `${window.KLARPAKKE.supabaseUrl}/functions/v1/get-entitlements`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    }
  ).then(r => r.json());
  
  // 3. Sjekk trial status
  if (entitlements.subscription.is_trial_expired && 
      !window.location.pathname.includes('/paywall')) {
    window.location.href = '/app/paywall';
    return;
  }
  
  // 4. Vis brukerinfo
  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = session.user.email;
  });
  
  // 5. Track page view
  trackEvent('page_view', { path: window.location.pathname });
});
```

### paywall.js

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const session = await getSession();
  
  // Hent entitlements
  const response = await fetch(
    `${window.KLARPAKKE.supabaseUrl}/functions/v1/get-entitlements`,
    {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    }
  );
  const { subscription, features } = await response.json();
  
  // Oppdater UI
  if (subscription.isTrialExpired) {
    document.querySelector('[data-trial-status]').textContent = 
      'Din prøveperiode er utløpt';
  }
  
  // Vis futures quiz gate for VIP uten quiz
  if (subscription.tier === 'vip_ekstrem' && !features.futuresQuizPassed) {
    document.querySelector('[data-futures-quiz-gate]').style.display = 'block';
  }
  
  // Track
  trackEvent('paywall_view', {
    trial_expired: subscription.isTrialExpired,
    current_tier: subscription.tier
  });
  
  // Plan buttons
  document.querySelectorAll('[data-paywall-upgrade-btn]').forEach(btn => {
    btn.addEventListener('click', () => {
      const plan = btn.closest('[data-plan]').dataset.plan;
      trackEvent('plan_select', { plan, source: 'paywall' });
      // Redirect til Stripe
      window.location.href = `/checkout?plan=${plan}`;
    });
  });
});
```

### quiz.js

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const quizSlug = window.location.pathname.split('/').pop();
  
  // Last quiz
  const response = await fetch(
    `${window.KLARPAKKE.supabaseUrl}/functions/v1/get-quiz?slug=${quizSlug}`,
    {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    }
  );
  const { quiz } = await response.json();
  
  let currentQuestion = 0;
  const answers = [];
  
  function showQuestion(index) {
    const q = quiz.questions[index];
    document.querySelector('[data-question-text]').textContent = q.questionText;
    document.querySelector('.current').textContent = index + 1;
    
    const optionsHtml = q.options.map((opt, i) => `
      <label>
        <input type="radio" name="answer" value="${i}">
        ${opt.text}
      </label>
    `).join('');
    document.querySelector('[data-answer-options]').innerHTML = optionsHtml;
  }
  
  // Submit answer
  document.querySelector('[data-submit-answer]').addEventListener('click', () => {
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return alert('Velg et svar');
    
    answers.push({
      question_id: quiz.questions[currentQuestion].id,
      selected_option_index: parseInt(selected.value)
    });
    
    currentQuestion++;
    if (currentQuestion < quiz.questions.length) {
      showQuestion(currentQuestion);
    } else {
      submitQuiz();
    }
  });
  
  async function submitQuiz() {
    const response = await fetch(
      `${window.KLARPAKKE.supabaseUrl}/functions/v1/submit-quiz`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quizSlug, answers })
      }
    );
    const result = await response.json();
    
    // Vis resultat
    document.querySelector('[data-question-container]').style.display = 'none';
    document.querySelector('[data-quiz-results]').style.display = 'block';
    document.querySelector('[data-score-display] .score').textContent = result.score;
    document.querySelector('[data-pass-status]').textContent = result.passed 
      ? '🎉 Gratulerer! Du besto!' 
      : `❌ Du fikk ${result.score}%. Du trenger 85% for å bestå.`;
  }
  
  showQuestion(0);
});
```

---

## Testing i Webflow

### 1. Preview Mode
- Test alle linker
- Sjekk at DOM-ankere er riktige (bruke Inspector)
- Verifiser at scripts laster

### 2. Authentication Test
```javascript
// I browser console:
await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpass123'
});
// Sjekk at profile ble opprettet i Supabase
```

### 3. Paywall Test
```javascript
// Sett trial til utløpt i Supabase SQL Editor:
UPDATE profiles 
SET trial_ends_at = NOW() - INTERVAL '1 day'
WHERE user_id = 'din-test-user-id';

// Refresh /app/dashboard → skal redirecte til /app/paywall
```

### 4. Quiz Test
```javascript
// Besøk /quiz/futures
// Svar på spørsmål
// Verifiser at submit-quiz kalles
// Sjekk at quiz_attempts tabell oppdateres
```

---

## Publisering

1. **Stage all pages** i Webflow
2. **Test i Preview** mode
3. **Publish** til ditt domene
4. **Update** DNS hvis nødvendig
5. **Test** alle flows i produksjon

---

## Feilsøking

| Problem | Løsning |
|---------|---------|
| Scripts laster ikke | Sjekk CDN URL, CSP headers |
| Auth fungerer ikke | Verifiser Supabase keys |
| Paywall vises ikke | Sjekk at trial_ends_at er satt |
| Quiz laster ikke | Sjekk at spørsmål finnes i DB |
| Leaderboard tom | Kjør `compute_leaderboard_monthly` |

---

## Neste steg

1. ✅ Sett opp alle sider i Webflow
2. ✅ Legg til Custom Code
3. ✅ Test autentisering
4. ✅ Test paywall-gating
5. ✅ Test quiz
6. ✅ Publiser

**Spørsmål? Se:**
- `docs/SITE-MAP.md` - Full arkitektur
- `docs/PAYWALL.md` - Paywall detaljer
- `webflow/contract/klarpakke-pages.v1.json` - DOM ankere
