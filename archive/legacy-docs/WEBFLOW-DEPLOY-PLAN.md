# 🎨 Webflow Deploy Plan - Klarpakke

**Stack:** Webflow + Supabase  
**Dato:** 1. februar 2026  
**Estimert tid:** 6 timer

---

## 📋 Hva du trenger

- [ ] Webflow konto (Core plan eller høyere for custom code)
- [ ] Tilgang til Webflow Designer
- [ ] Supabase prosjekt (allerede satt opp)

---

## 🎯 Plan for de neste 6 timene

```
02:15 - 03:00   Fase 1: Webflow Setup (45 min)
03:00 - 04:00   Fase 2: Custom Code (1t)
04:00 - 05:00   Fase 3: Side-bygging (1t)
05:00 - 06:00   Fase 4: Element ID Mapping (1t)
06:00 - 07:00   Fase 5: Testing & Bugfixes (1t)
07:00 - 08:15   Fase 6: Polish & Launch Prep (1t 15m)
08:15           🚀 SOFT LAUNCH!
```

---

## 🏗️ FASE 1: Webflow Setup (45 min)

### Steg 1.1: Opprett/Åpne Webflow Site
1. Gå til [Webflow Dashboard](https://webflow.com/dashboard)
2. Opprett nytt site: **"Klarpakke"**
3. Velg en blank template

### Steg 1.2: Konfigurer Project Settings
1. Klikk **Project Settings** (tannhjul ikon)
2. Gå til **Custom Code** tab
3. Vi skal legge inn HEAD og FOOTER code her

### Steg 1.3: Setup Pages
Opprett disse sidene i Webflow:

**Offentlige sider:**
- `/` (Home)
- `/pricing` (Pricing)
- `/login` (Login)
- `/signup` (Signup)

**App-sider (krever auth):**
- `/app/dashboard` (Dashboard)
- `/app/signals` (Signals)
- `/app/paper-trading` (Paper Trading)
- `/app/live-trading` (Live Trading)
- `/app/history` (History)
- `/app/settings` (Settings)

**Auth-sider:**
- `/reset-password` (Reset Password)
- `/verify-email` (Verify Email)

**Legal:**
- `/terms` (Terms)
- `/privacy` (Privacy)
- `/help` (Help)

**Error:**
- `/404` (404 Page)
- `/403` (403 Page)

**Extra:**
- `/quiz` (Quiz)

**Totalt: 19 sider**

---

## 💻 FASE 2: Custom Code (1 time)

### Steg 2.1: HEAD Code (Global)
Gå til **Project Settings → Custom Code → HEAD Code**

Lim inn fra `WEBFLOW-CUSTOM-CODE.txt` - seksjonen "STEP 1: HEAD CODE":

```html
<!-- Supabase Client Library -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Klarpakke Global Configuration -->
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdXNjZWlvdXFsa3MiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc2OTE4NjgwMSwiZXhwIjoyMDg0NzYyODAxfQ.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk',
    VERSION: '1.0.0',
    DEBUG: false
  };
</script>

<!-- Global Styles -->
<style>
  /* Kopier fra WEBFLOW-CUSTOM-CODE.txt */
</style>
```

### Steg 2.2: FOOTER Code (Global)
Gå til **Project Settings → Custom Code → FOOTER Code**

Lim inn fra `EMBEDDED_FOOTER.txt`:

```html
<!-- Klarpakke JavaScript -->
<script>
  // Auth + Login + Dashboard + etc. (minifisert)
  // Kopier hele innholdet fra EMBEDDED_FOOTER.txt
</script>
```

**Alternativ:** Last opp JS filer til Webflow Assets og bruk:
```html
<script src="https://cdn.prod.website-files.com/YOUR_ASSET_URL/auth.js"></script>
```

---

## 🎨 FASE 3: Side-bygging (1 time)

### Steg 3.1: Home Page (/)
**Sections å lage:**
1. **Navbar** - Logo + Navigasjon + CTA knapp
2. **Hero** - H1 + undertekst + 2 CTA knapper
3. **Features** - 4 feature cards (Trygg Modus, Paper Trading, Live Signaler, Norsk Support)
4. **Social Proof** - Stats (500+ traders, 85% win rate, 4.8/5 rating)
5. **CTA** - Signup CTA
6. **Footer** - Lenker + Copyright

### Steg 3.2: Auth Pages (/login, /signup)
**Login:**
- Email input (ID: `login-email`)
- Password input (ID: `login-password`)
- Submit button (ID: `login-submit`)
- Error message container (ID: `login-error`)
- "Forgot password?" link

**Signup:**
- Email input (ID: `signup-email`)
- Password input (ID: `signup-password`)
- Confirm password input (ID: `signup-confirm`)
- Submit button (ID: `signup-submit`)
- Terms checkbox (ID: `signup-terms`)

### Steg 3.3: Dashboard (/app/dashboard)
**Sections:**
1. **App Navbar** - Logo + Navigasjon + User menu
2. **Stats Cards** - Total signals, Pending, Approved, Win rate
3. **Signals List** - Signal cards med approve/reject knapper
4. **Quick Actions** - New signal, Settings, Help

### Steg 3.4: Andre sider
Bygg resten av sidene basert på HTML referansen i `webflow-pages/`.

---

## 🏷️ FASE 4: Element ID Mapping (1 time)

### Kritisk: Sett riktige element IDer
JavaScript forventer spesifikke IDer. Se `element-ids.json` for full liste.

**Viktigste IDer:**

**Login Page:**
```
#login-email          (email input)
#login-password       (password input)
#login-submit         (submit button)
#login-error          (error message)
```

**Signup Page:**
```
#signup-email         (email input)
#signup-password      (password input)
#signup-confirm       (confirm password)
#signup-submit        (submit button)
#signup-error         (error message)
```

**Dashboard:**
```
#signals-list         (container for signals)
#signal-card          (template for signal cards)
#stats-total          (total signals stat)
#stats-pending        (pending signals stat)
#stats-approved       (approved signals stat)
#stats-winrate        (win rate stat)
```

### Hvordan sette ID i Webflow:
1. Klikk på elementet
2. Gå til **Element Settings** (D ikonet)
3. Skriv inn ID i "ID" feltet
4. Trykk Enter

---

## 🧪 FASE 5: Testing (1 time)

### Steg 5.1: Preview Test
1. Klikk **Preview** (øye ikonet)
2. Test hver side:
   - [ ] Logo vises
   - [ ] Navigasjon fungerer
   - [ ] Ingen console errors (F12)

### Steg 5.2: Auth Testing
1. Gå til Preview av /signup
2. Prøv å registrere test-bruker
3. Sjekk at Supabase får ny bruker
4. Test login med samme credentials

### Steg 5.3: Dashboard Testing
1. Logg inn
2. Sjekk at signaler lastes
3. Test approve/reject knapper
4. Verifiser at status oppdateres

---

## 🚀 FASE 6: Launch Prep (1t 15m)

### Steg 6.1: Publish to Staging
1. Klikk **Publish**
2. Velg **staging** domain
3. Test live URL

### Steg 6.2: SEO & Meta
1. Gå til **Page Settings** for hver side
2. Sett:
   - Title
   - Meta Description
   - OG Image

### Steg 6.3: Publish to Production
1. Klikk **Publish**
2. Velg **custom domain** (hvis konfigurert)
3. Test live URL

---

## 🐛 Troubleshooting

### Problem: JavaScript fungerer ikke
**Løsning:**
1. Sjekk console (F12) for errors
2. Verifiser at HEAD code er lagt inn
3. Verifiser at element IDer matcher

### Problem: Auth fungerer ikke
**Løsning:**
1. Sjekk at Supabase URL og key er korrekt i HEAD code
2. Verifiser at CORS er satt opp i Supabase
3. Sjekk at redirect URL er konfigurert

### Problem: Signals laster ikke
**Løsning:**
1. Sjekk at bruker er logget inn
2. Verifiser at `signals-list` ID er satt
3. Sjekk Supabase logs for errors

---

## 📞 Support

Hvis noe går galt:
1. Sjekk Webflow console (F12)
2. Sjekk Supabase logs
3. Se [WEBFLOW-IMPLEMENTATION-GUIDE.md](WEBFLOW-IMPLEMENTATION-GUIDE.md)
4. Sjekk [TEST-PLAN.md](TEST-PLAN.md)

---

**Klar for Webflow deploy! 🎨**

*Sist oppdatert: 2026-02-01*
