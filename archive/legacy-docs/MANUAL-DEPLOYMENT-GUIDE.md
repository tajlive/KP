# 📖 MANUELL DEPLOYMENT-GUIDE

> **Sist oppdatert**: 2026-01-31  
> **Site ID**: 69743573d50cc16bbbe54344  
> **Webflow Designer**: https://webflow.com/designer/69743573d50cc16bbbe54344

---

## 📊 Status

| Komponent | Status |
|-----------|--------|
| Eksisterende sider | 10 ✅ |
| Manglende sider | 14 ⚠️ |
| JavaScript filer | 15 ✅ |
| Custom Code | Klar ✅ |

---

## 🚀 STEG-FOR-STEG DEPLOYMENT

### Steg 1: Åpne Webflow Designer (2 min)

1. Gå til:
   ```
   https://webflow.com/designer/69743573d50cc16bbbe54344
   ```

2. Logg inn med din Webflow-konto

---

### Steg 2: Opprett Manglende Sider (30 min)

Klikk på **"Pages"** i venstre sidebar, deretter **"Create Page"**.

Opprett disse sidene:

#### A. Autentiseringssider (3 sider)

| Side | Slug | SEO Title | HTML Fil |
|------|------|-----------|----------|
| **Signup** | `signup` | Registrer deg - Klarpakke | `webflow-pages-missing/signup.html` |
| **Reset Password** | `reset-password` | Tilbakestill passord - Klarpakke | `webflow-pages-missing/reset-password.html` |
| **Verify Email** | `verify-email` | Bekreft e-post - Klarpakke | `webflow-pages-missing/verify-email.html` |

**For hver side:**
1. Page Name: [navn fra tabell]
2. Slug: [slug fra tabell]
3. Klikk "Create Page"
4. Gå til Page Settings (⚙️)
5. SEO Title: [tittel fra tabell]
6. SEO Description: Kopier fra HTML-filen
7. Lim inn HTML-innhold

---

#### B. Error-sider (3 sider)

| Side | Slug | SEO Title | HTML Fil |
|------|------|-----------|----------|
| **404** | `404` | Siden finnes ikke - Klarpakke | `webflow-pages-missing/404.html` |
| **403** | `403` | Ingen tilgang - Klarpakke | `webflow-pages-missing/403.html` |
| **500** | `500` | Serverfeil - Klarpakke | `webflow-pages-missing/500.html` |

---

#### C. Juridiske sider (3 sider)

| Side | Slug | SEO Title | HTML Fil |
|------|------|-----------|----------|
| **Terms** | `terms` | Vilkår for Bruk - Klarpakke | `webflow-pages-missing/terms.html` |
| **Privacy** | `privacy` | Personvernerklæring - Klarpakke | `webflow-pages-missing/privacy.html` |
| **Help** | `help` | Hjelp og Support - Klarpakke | `webflow-pages-missing/help.html` |

---

#### D. App-sider (5 sider)

| Side | Slug | SEO Title | HTML Fil |
|------|------|-----------|----------|
| **Home** | (blank) | Klarpakke - Professional Trading Signals | `webflow-pages-missing/signup.html` (modify) |
| **Login** | `login` | Logg inn - Klarpakke | Eksisterer (oppdater) |
| **Dashboard** | `app/dashboard` | Dashboard - Klarpakke | Eksisterer (oppdater) |
| **Kalkulator** | `app/kalkulator` | Kalkulator - Klarpakke | Eksisterer (oppdater) |
| **Settings** | `app/settings` | Innstillinger - Klarpakke | Eksisterer (oppdater) |

**Note**: De eksisterende sidene må oppdateres med riktige element IDs.

---

### Steg 3: Legg til Element IDs (20 min)

For hver side, legg til disse element-IDene i Webflow Designer:

#### Login-siden (`/login`)
```
Form:           data-login-form
Email:          data-login-email
Password:       data-login-password
Submit:         data-login-submit
Error:          data-login-error
```

#### Signup-siden (`/signup`)
```
Form:           data-signup-form
Name:           data-signup-name
Email:          data-signup-email
Password:       data-signup-password
Confirm:        data-signup-password-confirm
Submit:         data-signup-submit
Error:          data-signup-error
```

#### Dashboard (`/app/dashboard`)
```
Container:      signals-container
Filter All:     filter-all
Filter Buy:     filter-buy
Filter Sell:    filter-sell
Signal Card:    .signal-card (class)
Loading:        loading
Error:          error-message
```

#### Kalkulator (`/app/kalkulator`)
```
Form:           calculator-form
Capital:        capital-input
Risk %:         risk-percent-input
Entry:          entry-price-input
Stop Loss:      stop-loss-input
Calculate:      calculate-button
Result:         calculation-result
```

#### Settings (`/app/settings`)
```
Container:      settings-container
Profile:        profile-section
Security:       security-section
Notifications:  notifications-section
Save:           save-settings-button
Logout:         logout-button
```

---

### Steg 4: Last opp JavaScript-filer (10 min)

1. I Webflow Designer, klikk **"Assets"** (venstre sidebar)
2. Klikk **"Upload"** (blå knapp øverst)
3. Velg alle filer fra `webflow/` mappen:
   - auth.js
   - login.js
   - app-with-auth.js
   - password-reset.js
   - email-verification.js
   - history.js
   - profile.js
   - realtime.js
   - dashboard-roles.js
   - signal-performance.js
   - push-notifications.js
   - dark-mode.js

4. Vent på at alle får ✅ checkmark
5. For hver fil: klikk ⚙️ → "Copy Public URL"
6. Lim inn i en tekstfil midlertidig

---

### Steg 5: Konfigurer Custom Code (5 min)

1. Klikk **"Project Settings"** (tannhjul øverst til høyre)
2. Gå til **"Custom Code"**
3. I **HEAD Code**, lim inn:

```html
<!-- Supabase Client Library -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Klarpakke Configuration -->
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdXNjZWlvdXFsa3MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2OTE4NjgwMSwiZXhwIjoyMDg0NzYyODAxfQ.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk',
    VERSION: '1.0.0'
  };
</script>
```

4. I **FOOTER Code**, lim inn (erstatt URLs):

```html
<!-- Authentication -->
<script src="PASTE_AUTH_JS_URL_HERE"></script>

<!-- Page Scripts -->
<script>
  const path = window.location.pathname;
  
  if (path === '/login' || path === '/signup') {
    loadScript('PASTE_LOGIN_JS_URL_HERE');
  }
  
  if (path.startsWith('/app/')) {
    loadScript('PASTE_APP_JS_URL_HERE');
    loadScript('PASTE_DASHBOARD_ROLES_JS_URL_HERE');
  }
  
  function loadScript(src) {
    const script = document.createElement('script');
    script.src = src;
    document.body.appendChild(script);
  }
</script>
```

5. Klikk **"Save"**

---

### Steg 6: Publiser Site (2 min)

1. Klikk **"Publish"** (blå knapp øverst til høyre)
2. Velg **"Production"**
3. Klikk **"Publish to Selected Domains"**
4. Vent på at publiseringen fullføres

---

### Steg 7: Verifiser (5 min)

Test følgende URLer:

```
https://klarpakke.webflow.io/                    (Home)
https://klarpakke.webflow.io/login               (Login)
https://klarpakke.webflow.io/signup              (Signup)
https://klarpakke.webflow.io/pricing             (Pricing)
https://klarpakke.webflow.io/app/dashboard       (Dashboard)
https://klarpakke.webflow.io/terms               (Terms)
https://klarpakke.webflow.io/privacy             (Privacy)
https://klarpakke.webflow.io/help                (Help)
```

---

## ✅ VERIFISERINGSSJEKKLISTE

- [ ] Alle 15 sider opprettet
- [ ] Element IDs satt på alle sider
- [ ] 12 JavaScript filer lastet opp
- [ ] Custom Code injisert
- [ ] Site publisert
- [ ] Login fungerer
- [ ] Dashboard viser signaler
- [ ] Mobilvisning OK
- [ ] Ingen console errors

---

## 📞 Support

Hvis du støter på problemer:
1. Sjekk `FEATURES-SUMMARY.md` for oversikt
2. Verifiser at alle element IDs er korrekte
3. Sjekk browser console (F12) for feil
4. Kontakt: support@klarpakke.no

---

**Estimert total tid**: ~75 minutter
