# Klarpakke Manual Deployment Guide

**Generated:** 2026-01-31T10:03:29.148Z  
**Contract Version:** 1.1.0  
**Total Pages:** 18

---

## 📋 Pre-Deployment Checklist

- [ ] Open Webflow Designer: https://webflow.com/dashboard
- [ ] Select "Klarpakke" site
- [ ] Click "Open Designer"
- [ ] Wait for designer to fully load

---

## 🚀 Deployment Steps

### Step 1: Add Global Custom Code (HEAD)

**Do this ONCE for all pages:**

1. Click ⚙️ (Project Settings) in top right
2. Select "Custom Code" from left sidebar
3. Paste this in the **HEAD** section:

```html
<!-- Coinbase Design System CSS -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/styles/coinbase.css">

<!-- Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk'
  };
</script>
```

4. Click "Save Changes"

---

### Step 2: Add Footer Scripts (FOOTER)

In the same Custom Code section, paste this in the **FOOTER** section:

```html
<!-- Klarpakke Auth & App Scripts -->
<script src="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/js/auth.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/js/login.js"></script>
<script src="https://cdn.jsdelivr.net/gh/tajlive/KP@main/web/js/app-with-auth.js"></script>
```

---

## 📄 Page-by-Page Setup

For each page below, follow these steps:

1. **Create Page** (if missing):
   - Press \"P\" to open Pages panel
   - Click \"+\" or \"Add Page\"
   - Enter page name and slug
   - Click \"Create Page\"

2. **Add HTML Embed** with DOM anchors:
   - Press \"A\" to open Add panel
   - Search for \"Embed\"
   - Drag \"HTML Embed\" to page
   - Paste the HTML code provided
   - Click \"Save & Close\"

3. **Set SEO Settings**:
   - Click page name → Settings (gear icon)
   - Set Title and Description
   - Save

---


## Marketing Pages

### Page 1: Home (Path: /)

**SEO Title:** Klarpakke - Trygg Krypto-Trading  
**Description:** Profesjonelle trading-signaler med Trygg Modus. Begynn med paper trading og lær trygg krypto-handel.  
**Robots:** index, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- Home - DOM Anchors -->
<div data-klarpakke-page="/" data-klarpakke-version="1.1.0">
  <div id="klarpakke-home-root" data-kp-root="home"></div>
  <section id="hero-section"></section>
  <h1 id="hero-headline"></h1>
  <p id="hero-subheadline"></p>
  <a id="hero-cta" href="/signup"></a>
  <section id="features-section"></section>
</div>
```

**Anchors (6):**
- `div` med `klarpakke-home-root`
- `section` med `hero-section`
- `h1` med `hero-headline`
- `p` med `hero-subheadline`
- `a` med `hero-cta`
- `section` med `features-section`

---

### Page 2: Pricing (Path: /pricing)

**SEO Title:** Priser - Klarpakke  
**Description:** Velg riktig abonnement for dine trading-behov.  
**Robots:** index, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- Pricing - DOM Anchors -->
<div data-klarpakke-page="/pricing" data-klarpakke-version="1.1.0">
  <div id="klarpakke-pricing-root" data-kp-root="pricing"></div>
  <section id="pricing-section"></section>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-pricing-root`
- `section` med `pricing-section`

---


## Auth Pages

### Page 3: Signup (Path: /signup)

**SEO Title:** Registrer deg - Klarpakke  
**Description:** Opprett konto og begynn med trygg krypto-trading i dag.  
**Robots:** index, follow

**Required Scripts:** auth.js, login.js

**HTML Embed Code:**

```html
<!-- Signup - DOM Anchors -->
<div data-klarpakke-page="/signup" data-klarpakke-version="1.1.0">
  <div id="klarpakke-signup-root" data-kp-root="signup"></div>
  <form id="signup-form"></form>
  <input id="signup-email-input" type="email" name="email"></input>
  <input id="signup-password-input" type="password" name="password"></input>
  <input id="signup-confirm-password-input" type="password" name="confirm-password"></input>
  <button id="signup-button" type="submit"></button>
  <div id="signup-error" style="display:none"></div>
</div>
```

**Anchors (7):**
- `div` med `klarpakke-signup-root`
- `form` med `signup-form`
- `input` med `signup-email-input`
- `input` med `signup-password-input`
- `input` med `signup-confirm-password-input`
- `button` med `signup-button`
- `div` med `signup-error`

---

### Page 4: Login (Path: /login)

**SEO Title:** Logg inn - Klarpakke  
**Description:** Logg inn på din Klarpakke-konto.  
**Robots:** index, follow

**Required Scripts:** auth.js, login.js

**HTML Embed Code:**

```html
<!-- Login - DOM Anchors -->
<div data-klarpakke-page="/login" data-klarpakke-version="1.1.0">
  <div id="klarpakke-login-root" data-kp-root="login"></div>
  <form id="login-form"></form>
  <input id="login-email-input" type="email" name="email"></input>
  <input id="login-password-input" type="password" name="password"></input>
  <button id="login-button" type="submit"></button>
  <div id="login-error" style="display:none"></div>
</div>
```

**Anchors (6):**
- `div` med `klarpakke-login-root`
- `form` med `login-form`
- `input` med `login-email-input`
- `input` med `login-password-input`
- `button` med `login-button`
- `div` med `login-error`

---

### Page 5: Password Reset (Path: /reset-password)

**SEO Title:** Tilbakestill passord - Klarpakke  
**Description:** Tilbakestill passordet ditt.  
**Robots:** noindex, follow

**Required Scripts:** auth.js, password-reset.js

**HTML Embed Code:**

```html
<!-- Password Reset - DOM Anchors -->
<div data-klarpakke-page="/reset-password" data-klarpakke-version="1.1.0">
  <div id="klarpakke-reset-password-root" data-kp-root="reset-password"></div>
  <form id="reset-password-form"></form>
  <input id="reset-email-input" type="email"></input>
  <button id="reset-button" type="submit"></button>
</div>
```

**Anchors (4):**
- `div` med `klarpakke-reset-password-root`
- `form` med `reset-password-form`
- `input` med `reset-email-input`
- `button` med `reset-button`

---

### Page 6: Email Verification (Path: /verify-email)

**SEO Title:** Verifiser e-post - Klarpakke  
**Description:** Verifiser e-postadressen din.  
**Robots:** noindex, follow

**Required Scripts:** auth.js, email-verification.js

**HTML Embed Code:**

```html
<!-- Email Verification - DOM Anchors -->
<div data-klarpakke-page="/verify-email" data-klarpakke-version="1.1.0">
  <div id="klarpakke-verify-email-root" data-kp-root="verify-email"></div>
  <div data-verification-status></div>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-verify-email-root`
- `div` med `data attribute`

---


## App Pages

### Page 7: Dashboard (Path: /app/dashboard)

**SEO Title:** Dashboard - Klarpakke  
**Description:** Oversikt over trading-signaler og aktivitet.  
**Robots:** noindex, nofollow

**Required Scripts:** auth.js, app-with-auth.js, dashboard-roles.js, realtime.js

**HTML Embed Code:**

```html
<!-- Dashboard - DOM Anchors -->
<div data-klarpakke-page="/app/dashboard" data-klarpakke-version="1.1.0">
  <div id="klarpakke-dashboard-root" data-kp-root="dashboard"></div>
  <div data-signals-container></div>
  <div id="filters-section"></div>
  <button id="filter-all" data-filter="all"></button>
  <div id="klarpakke-paper-trading-root" data-kp-feature="paper-trading"></div>
  <div data-paper-trading-badge></div>
</div>
```

**Anchors (6):**
- `div` med `klarpakke-dashboard-root`
- `div` med `data attribute`
- `div` med `filters-section`
- `button` med `filter-all`
- `div` med `klarpakke-paper-trading-root`
- `div` med `data attribute`

---

### Page 8: Settings (Path: /app/settings)

**SEO Title:** Innstillinger - Klarpakke  
**Description:** Administrer kontoen din og sikkerhetsinnstillinger.  
**Robots:** noindex, nofollow

**Required Scripts:** auth.js, app-with-auth.js

**HTML Embed Code:**

```html
<!-- Settings - DOM Anchors -->
<div data-klarpakke-page="/app/settings" data-klarpakke-version="1.1.0">
  <div id="klarpakke-settings-root" data-kp-root="settings"></div>
  <div id="settings-container"></div>
  <section id="profile-section"></section>
  <section id="security-section"></section>
  <input type="checkbox" data-safe-mode-toggle></input>
  <span data-safe-mode-status></span>
  <div data-safe-mode-info></div>
  <button id="logout-button"></button>
</div>
```

**Anchors (8):**
- `div` med `klarpakke-settings-root`
- `div` med `settings-container`
- `section` med `profile-section`
- `section` med `security-section`
- `input` med `data attribute`
- `span` med `data attribute`
- `div` med `data attribute`
- `button` med `logout-button`

---

### Page 9: Kalkulator (Path: /app/kalkulator)

**SEO Title:** Trading-kalkulator - Klarpakke  
**Description:** Beregn potensiell fortjeneste og risiko.  
**Robots:** noindex, nofollow

**Required Scripts:** auth.js, app-with-auth.js

**HTML Embed Code:**

```html
<!-- Kalkulator - DOM Anchors -->
<div data-klarpakke-page="/app/kalkulator" data-klarpakke-version="1.1.0">
  <div id="klarpakke-calculator-root" data-kp-root="calculator"></div>
</div>
```

**Anchors (1):**
- `div` med `klarpakke-calculator-root`

---

### Page 10: Trading History (Path: /app/history)

**SEO Title:** Trading-historikk - Klarpakke  
**Description:** Se din komplette trading-historikk.  
**Robots:** noindex, nofollow

**Required Scripts:** auth.js, app-with-auth.js, history.js

**HTML Embed Code:**

```html
<!-- Trading History - DOM Anchors -->
<div data-klarpakke-page="/app/history" data-klarpakke-version="1.1.0">
  <div id="klarpakke-history-root" data-kp-root="history"></div>
  <div data-history-container></div>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-history-root`
- `div` med `data attribute`

---

### Page 11: User Profile (Path: /app/profile)

**SEO Title:** Profil - Klarpakke  
**Description:** Din brukerprofil og statistikk.  
**Robots:** noindex, nofollow

**Required Scripts:** auth.js, app-with-auth.js, profile.js

**HTML Embed Code:**

```html
<!-- User Profile - DOM Anchors -->
<div data-klarpakke-page="/app/profile" data-klarpakke-version="1.1.0">
  <div id="klarpakke-profile-root" data-kp-root="profile"></div>
  <div data-profile-container></div>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-profile-root`
- `div` med `data attribute`

---


## Error Pages

### Page 12: 404 Error (Path: /404)

**SEO Title:** Side ikke funnet - Klarpakke  
**Description:** Siden du leter etter finnes ikke.  
**Robots:** noindex, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- 404 Error - DOM Anchors -->
<div data-klarpakke-page="/404" data-klarpakke-version="1.1.0">
  <div id="klarpakke-404-root" data-kp-root="404"></div>
  <div data-error-message></div>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-404-root`
- `div` med `data attribute`

---

### Page 13: 403 Forbidden (Path: /403)

**SEO Title:** Ingen tilgang - Klarpakke  
**Description:** Du har ikke tilgang til denne siden.  
**Robots:** noindex, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- 403 Forbidden - DOM Anchors -->
<div data-klarpakke-page="/403" data-klarpakke-version="1.1.0">
  <div id="klarpakke-403-root" data-kp-root="403"></div>
  <div data-error-message></div>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-403-root`
- `div` med `data attribute`

---

### Page 14: 500 Server Error (Path: /500)

**SEO Title:** Serverfeil - Klarpakke  
**Description:** Noe gikk galt. Vi jobber med å fikse det.  
**Robots:** noindex, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- 500 Server Error - DOM Anchors -->
<div data-klarpakke-page="/500" data-klarpakke-version="1.1.0">
  <div id="klarpakke-500-root" data-kp-root="500"></div>
  <div data-error-message></div>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-500-root`
- `div` med `data attribute`

---


## Legal Pages

### Page 15: Terms of Service (Path: /terms)

**SEO Title:** Vilkår for bruk - Klarpakke  
**Description:** Les våre vilkår for bruk av Klarpakke.  
**Robots:** index, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- Terms of Service - DOM Anchors -->
<div data-klarpakke-page="/terms" data-klarpakke-version="1.1.0">
  <div id="klarpakke-terms-root" data-kp-root="terms"></div>
  <article data-legal-content="terms"></article>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-terms-root`
- `article` med `data attribute`

---

### Page 16: Privacy Policy (Path: /privacy)

**SEO Title:** Personvernerklæring - Klarpakke  
**Description:** Les hvordan vi beskytter dine personopplysninger.  
**Robots:** index, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- Privacy Policy - DOM Anchors -->
<div data-klarpakke-page="/privacy" data-klarpakke-version="1.1.0">
  <div id="klarpakke-privacy-root" data-kp-root="privacy"></div>
  <article data-legal-content="privacy"></article>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-privacy-root`
- `article` med `data attribute`

---

### Page 17: Help & Support (Path: /help)

**SEO Title:** Hjelp og støtte - Klarpakke  
**Description:** Få hjelp med Klarpakke-plattformen.  
**Robots:** index, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- Help & Support - DOM Anchors -->
<div data-klarpakke-page="/help" data-klarpakke-version="1.1.0">
  <div id="klarpakke-help-root" data-kp-root="help"></div>
  <div data-help-content></div>
  <section id="faq-section"></section>
</div>
```

**Anchors (3):**
- `div` med `klarpakke-help-root`
- `div` med `data attribute`
- `section` med `faq-section`

---

### Page 18: About Us (Path: /about)

**SEO Title:** Om oss - Klarpakke  
**Description:** Lær mer om Klarpakke og vårt oppdrag.  
**Robots:** index, follow

**Required Scripts:** auth.js

**HTML Embed Code:**

```html
<!-- About Us - DOM Anchors -->
<div data-klarpakke-page="/about" data-klarpakke-version="1.1.0">
  <div id="klarpakke-about-root" data-kp-root="about"></div>
  <article data-about-content></article>
</div>
```

**Anchors (2):**
- `div` med `klarpakke-about-root`
- `article` med `data attribute`

---


---

## ✅ Post-Deployment Checklist

### Test All Pages
- [ ] Navigate to each page in preview mode (Cmd+P)
- [ ] Verify DOM anchors exist (DevTools → Elements)
- [ ] Check that scripts load (DevTools → Network)

### SEO Verification
- [ ] Each page has unique title
- [ ] Each page has meta description
- [ ] Robots tags are correct (index/noindex)

### Responsive Testing
- [ ] Test on mobile (375px)
- [ ] Test on tablet (768px)
- [ ] Test on desktop (1440px)

### Publish
- [ ] Click "Publish" button
- [ ] Select staging domain (webflow.io)
- [ ] Test live site

---

**Guide generated by:** scripts/manual-deploy-guide.js  
**For support:** Check docs/WEBFLOW-*.md files
