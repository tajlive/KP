# 🗺️ Webflow Routes med Eksakt DOM/ID Kontrakt

**Generert:** 31. januar 2026  
**Kontraktversjon:** 1.3.0  
**Status:** ✅ Konsistent og validert

---

## 📋 EKSAKT STATUS - 19 SIDER

| # | Side | Slug | Kontrakt-path | Antall Anchors | Status |
|---|------|------|---------------|:--------------:|:------:|
| 1 | Home | (root) | `/` | 6 | ✅ |
| 2 | Signup | `signup` | `/signup` | 8 | ✅ |
| 3 | Login | `login` | `/login` | 6 | ✅ |
| 4 | Pricing | `pricing` | `/pricing` | 2 | ✅ |
| 5 | Dashboard | `app/dashboard` | `/app/dashboard` | 6 | ✅ |
| 6 | Settings | `app/settings` | `/app/settings` | 8 | ✅ |
| 7 | Kalkulator | `app/kalkulator` | `/app/kalkulator` | 1 | ✅ |
| 8 | Trading History | `app/history` | `/app/history` | 2 | ✅ |
| 9 | User Profile | `app/profile` | `/app/profile` | 2 | ✅ |
| 10 | Reset Password | `reset-password` | `/reset-password` | 4 | ✅ |
| 11 | Verify Email | `verify-email` | `/verify-email` | 2 | ✅ |
| 12 | 404 | `404` | `/404` | 2 | ✅ |
| 13 | 403 | `403` | `/403` | 2 | ✅ |
| 14 | 500 | `500` | `/500` | 2 | ✅ |
| 15 | Terms | `terms` | `/terms` | 2 | ✅ |
| 16 | Privacy | `privacy` | `/privacy` | 2 | ✅ |
| 17 | Help | `help` | `/help` | 3 | ✅ |
| 18 | About | `about` | `/about` | 2 | ✅ |
| 19 | **Quiz** | `quiz` | `/quiz` | 3 | ✅ |

**Total:** 19 sider  
**GitHub Actions validerer:** ✅ Alle 19

---

## 🎯 VIKTIGE BESLUTNINGER (Låst)

### Beslutning 1: Login/Signup bruker data-attributter
**Status:** ✅ IMPLEMENTERT i kontrakt v1.3.0

| Element | Gammel (ID) | Ny (Data-attributt) |
|---------|-------------|---------------------|
| Login form | `id="login-form"` | `data-login-form` |
| Login email | `id="login-email-input"` | `data-login-email` |
| Login password | `id="login-password-input"` | `data-login-password` |
| Login button | `id="login-button"` | `data-login-submit` |
| Login error | `id="login-error"` | `data-login-error` |
| Signup form | `id="signup-form"` | `data-signup-form` |
| Signup email | `id="signup-email-input"` | `data-signup-email` |
| Signup password | `id="signup-password-input"` | `data-signup-password` |
| Signup confirm | `id="signup-confirm-password-input"` | `data-signup-password-confirm` |
| Signup terms | `id="signup-terms"` | `data-signup-terms` |
| Signup button | `id="signup-button"` | `data-signup-submit` |
| Signup error | `id="signup-error"` | `data-signup-error` |

**Grunnlag:** Matcher JavaScript-selektorer i auth.js

---

### Beslutning 2: /app/ prefix beholdes
**Status:** ✅ BEHOLDT i kontrakt

App-sider bruker `/app/` prefix i kontrakt-path:
- `/app/dashboard` (ikke `/dashboard`)
- `/app/settings` (ikke `/settings`)
- `/app/kalkulator` (ikke `/kalkulator`)
- `/app/history` (ikke `/trading-history`)
- `/app/profile` (ikke `/user-profile`)

**Webflow slug skal være:** `app/dashboard`, `app/settings`, etc.

**Grunnlag:** Ryddig hierarkisk struktur, skiller app-sider fra offentlige sider

---

## 🏠 Side 1: Home (/)

### Eksakt DOM Kontrakt (fra kontrakt v1.3.0)
```html
<!-- Root anchor -->
<div id="klarpakke-home-root" data-kp-root="home"></div>

<!-- Section anchors -->
<section id="hero-section"></section>
<h1 id="hero-headline"></h1>
<p id="hero-subheadline"></p>
<a id="hero-cta" href="/signup"></a>
<section id="features-section"></section>
```

---

## 💰 Side 2: Pricing (/pricing)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-pricing-root" data-kp-root="pricing"></div>
<section id="pricing-section"></section>
```

---

## 🔐 Side 3: Login (/login)

### Eksakt DOM Kontrakt (data-attributter)
```html
<!-- Root -->
<div id="klarpakke-login-root" data-kp-root="login"></div>

<!-- Form med data-attributter -->
<form data-login-form>
  <input data-login-email type="email" />
  <input data-login-password type="password" />
  <button data-login-submit type="submit">Logg inn</button>
  <div data-login-error style="display: none;"></div>
</form>
```

**VIKTIG:** Bruker `data-*` attributter, IKKE `id`

---

## ✍️ Side 4: Signup (/signup)

### Eksakt DOM Kontrakt (data-attributter)
```html
<!-- Root -->
<div id="klarpakke-signup-root" data-kp-root="signup"></div>

<!-- Form med data-attributter -->
<form data-signup-form>
  <input data-signup-email type="email" />
  <input data-signup-password type="password" />
  <input data-signup-password-confirm type="password" />
  <input data-signup-terms type="checkbox" />
  <button data-signup-submit type="submit">Opprett konto</button>
  <div data-signup-error style="display: none;"></div>
</form>
```

**VIKTIG:** Bruker `data-*` attributter, IKKE `id`

---

## 📊 Side 5: Dashboard (/app/dashboard)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-dashboard-root" data-kp-root="dashboard"></div>
<div data-signals-container></div>
<div id="filters-section"></div>
<button id="filter-all" data-filter="all"></button>
<div id="klarpakke-paper-trading-root" data-kp-feature="paper-trading"></div>
<div data-paper-trading-badge></div>
```

**Webflow slug:** `app/dashboard`

---

## ⚙️ Side 6: Settings (/app/settings)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-settings-root" data-kp-root="settings"></div>
<div id="settings-container"></div>
<section id="profile-section"></section>
<section id="security-section"></section>
<input type="checkbox" data-safe-mode-toggle />
<span data-safe-mode-status></span>
<div data-safe-mode-info></div>
<button id="logout-button"></button>
```

**Webflow slug:** `app/settings`

---

## 🧮 Side 7: Kalkulator (/app/kalkulator)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-calculator-root" data-kp-root="calculator"></div>
```

**Webflow slug:** `app/kalkulator`

---

## 📈 Side 8: Trading History (/app/history)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-history-root" data-kp-root="history"></div>
<div data-history-container></div>
```

**Webflow slug:** `app/history`

---

## 👤 Side 9: User Profile (/app/profile)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-profile-root" data-kp-root="profile"></div>
<div data-profile-container></div>
```

**Webflow slug:** `app/profile`

---

## 🔄 Side 10: Reset Password (/reset-password)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-reset-password-root" data-kp-root="reset-password"></div>
<form id="reset-password-form"></form>
<input id="reset-email-input" type="email" />
<button id="reset-button"></button>
```

---

## ✉️ Side 11: Verify Email (/verify-email)

### Eksakt DOM Kontrakt
```html
<div id="klarpakke-verify-email-root" data-kp-root="verify-email"></div>
<div data-verification-status></div>
```

---

## 🚫 Side 12-14: Error Pages

### 404 (/404)
```html
<div id="klarpakke-404-root" data-kp-root="404"></div>
<div data-error-message></div>
```

### 403 (/403)
```html
<div id="klarpakke-403-root" data-kp-root="403"></div>
<div data-error-message></div>
```

### 500 (/500)
```html
<div id="klarpakke-500-root" data-kp-root="500"></div>
<div data-error-message></div>
```

---

## 📜 Side 15-16: Legal

### Terms (/terms)
```html
<div id="klarpakke-terms-root" data-kp-root="terms"></div>
<article data-legal-content="terms"></article>
```

### Privacy (/privacy)
```html
<div id="klarpakke-privacy-root" data-kp-root="privacy"></div>
<article data-legal-content="privacy"></article>
```

---

## ❓ Side 17: Help (/help)

```html
<div id="klarpakke-help-root" data-kp-root="help"></div>
<div data-help-content></div>
<section id="faq-section"></section>
```

---

## ℹ️ Side 18: About (/about)

```html
<div id="klarpakke-about-root" data-kp-root="about"></div>
<article data-about-content></article>
```

---

## 🎓 Side 19: Quiz (/quiz)

### Eksakt DOM Kontrakt (v1.3.0)
```html
<!-- Root -->
<div id="klarpakke-quiz-root" data-kp-root="quiz"></div>

<!-- Question container -->
<div data-quiz-container>
  <div data-question="1">
    <h3>Spørsmål 1</h3>
    <button data-answer="a">Alternativ A</button>
    <button data-answer="b">Alternativ B</button>
    <button data-answer="c">Alternativ C</button>
  </div>
</div>

<!-- Result (hidden by default) -->
<div data-quiz-result style="display: none;">
  <span data-score></span>
  <a href="/dashboard">Tilbake til dashboard</a>
</div>
```

---

## 🔍 Oppsummering av endringer

### Kontrakt v1.3.0 endringer:

| Endring | Fra | Til |
|---------|-----|-----|
| Login anchors | ID-er | data-attributter |
| Signup anchors | ID-er | data-attributter |
| Quiz | Ikke i kontrakt | ✅ Lagt til |
| /app/ prefix | Uklart | ✅ Dokumentert |

---

## ✅ Valideringsstatus

| Sjekk | Status |
|-------|--------|
| Kontrakt fil | ✅ Finnes |
| JSON valid | ✅ Gyldig |
| 19 sider | ✅ Valideres |
| Unike paths | ✅ Ingen duplikater |
| Quiz inkludert | ✅ v1.3.0 |
| Login/Signup data-attrs | ✅ v1.3.0 |
| /app/ prefix | ✅ Beholdt |

---

## 📝 Filplassering

- **Kontrakt:** `webflow/contract/klarpakke-pages.v1.json`
- **Denne guiden:** `WEBFLOW-ROUTES-WITH-DOM-CONTRACT.md`
- **HTML-filer:** `webflow-embeds-fixed/*.html`

---

**Siste oppdatering:** 31. januar 2026  
**Versjon:** 1.3.0  
**Status:** ✅ Konsistent og klar for produksjon
