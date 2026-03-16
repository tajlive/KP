# 🚀 Klarpakke MVP Launch Plan

**Mål:** Soft launch på 2 uker (14 dager)  
**Strategi:** Start med det essensielle, iterer raskt

---

## 📊 Gjenstående arbeid (87 timer → 30 timer ved fokus)

### FASE 1: Webflow Setup (DAG 1-2) - 4 timer

#### Oppgaver:
1. **Kopier 10 kritiske sider til Webflow** (3 timer)
   - ✅ Home (/)
   - ✅ Pricing (/pricing)
   - ✅ Login (/login)
   - ✅ Signup (/signup)
   - ✅ Dashboard (/app/dashboard)
   - ✅ Signals (/app/signals)
   - ✅ Settings (/app/settings)
   - ✅ Terms (/terms)
   - ✅ Privacy (/privacy)
   - ✅ Help (/help)

2. **Last opp assets til CDN** (1 time)
   ```bash
   # Rask versjon - bruk GitHub Pages
   git checkout --orphan gh-pages
   mkdir -p js css
   cp webflow-pages/shared/styles.css css/
   cp web/js/klarpakke-bundle.js js/
   git add .
   git commit -m "Add assets"
   git push origin gh-pages
   # URL: https://tajlive.github.io/KP/css/styles.css
   ```

#### Verifisering:
- [ ] Alle 10 sider vises korrekt
- [ ] CSS laster riktig
- [ ] Mobil responsivitet OK
- [ ] Norske tegn (æøå) fungerer

---

### FASE 2: Supabase Setup (DAG 3-4) - 6 timer

#### Steg-for-steg:

**1. Opprett Production Project (30 min)**
```bash
# I Supabase Dashboard:
# 1. Klikk "New Project"
# 2. Navn: "klarpakke-production"
# 3. Region: eu-north-1 (Stockholm) - nærmest Norge
# 4. Vent på provisioning (~2 min)
```

**2. Deploy Migrations (1 time)**
```bash
# Koble til prosjektet
supabase link --project-ref [din-project-ref]

# Push alle migrations
supabase db push

# Verifiser at tabeller er opprettet
supabase db dump > verify.sql
```

**3. Deploy Edge Functions (2 timer)**
```bash
# Kjør setup scriptet
./scripts/setup-production.sh

# Eller manuelt:
supabase functions deploy binance-connector
supabase functions deploy stripe-webhook
supabase functions deploy broadcast-telegram
supabase functions deploy upsert-profile-on-signup
supabase functions deploy get-billing-status
```

**4. Sett Secrets (30 min)**
```bash
# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Telegram (kan vente til etter launch)
supabase secrets set TELEGRAM_BOT_TOKEN=...

# Site URL
supabase secrets set SITE_URL=https://klarpakke.no
```

**5. Konfigurer Auth (2 timer)**
```bash
# I Supabase Dashboard → Authentication → Settings:

# Site URL
https://klarpakke.no

# Redirect URLs
https://klarpakke.no/app/dashboard
https://klarpakke.no/quiz

# Email templates (tilpass på norsk)
# - Confirmation email
# - Reset password email
# - Invite email
```

---

### FASE 3: JavaScript MVP (DAG 5-7) - 12 timer

#### Prioriter funksjoner:

**1. Auth (4 timer)**
```javascript
// MUST HAVE:
- Signup med e-post/passord
- Login
- Logout
- Session persistence
- Redirect etter auth

// Kopier kode fra web/js/auth.js
// Legg inn i Webflow Site Settings → Footer Code
```

**2. Paper Trading Basic (4 timer)**
```javascript
// MUST HAVE:
- Opprett paper account
- Vis balance
- Følg signal (lagre i DB)
- Vis active trades

// Kopier kode fra web/js/paper-trading.js
```

**3. Quiz (2 timer)**
```javascript
// MUST HAVE:
- 3 spørsmål
- Lagre svar i user_metadata
- Enable Trygg Modus for nybegynnere
- Redirect til dashboard

// Kopier kode fra web/js/quiz.js
```

**4. Stripe Basic (2 timer)**
```javascript
// MUST HAVE:
- Vis pricing cards
- Redirect til Stripe Checkout
- Webhook håndterer subscription

// Kopier kode fra web/js/stripe-checkout.js
```

---

### FASE 4: Testing (DAG 8-9) - 8 timer

#### Test-scenarier:

**1. Signup Flow (2 timer)**
```
1. Gå til klarpakke.no/signup
2. Fyll ut e-post og passord
3. Klikk "Opprett konto"
4. Sjekk at bruker opprettes i Supabase
5. Sjekk at du blir redirectet til /quiz
```

**2. Quiz Flow (1 time)**
```
1. Svar på 3 spørsmål
2. Sjekk at Trygg Modus aktiveres
3. Sjekk at du blir redirectet til /app/dashboard
```

**3. Paper Trading (2 timer)**
```
1. Klikk "Opprett Paper Trading Konto"
2. Sjekk at konto opprettes i Supabase
3. Gå til /app/signals
4. Klikk "Følg signal"
5. Sjekk at trade opprettes
6. Sjekk at balance oppdateres
```

**4. Stripe (2 timer)**
```
1. Gå til /pricing
2. Klikk "Start 7-dagers trial"
3. Sjekk at Stripe Checkout åpnes
4. Test med testkort: 4242 4242 4242 4242
5. Sjekk at subscription opprettes
```

**5. Cross-browser (1 time)**
```
- Chrome (desktop + mobile)
- Safari (iOS)
- Firefox (desktop)
```

---

### FASE 5: Launch Prep (DAG 10-12) - 6 timer

#### Oppsett:

**1. Custom Domain (2 timer)**
```
Webflow:
→ Project Settings → Hosting
→ Add Custom Domain: klarpakke.no
→ Verifiser DNS (A-record + CNAME)

DNS-oppsett:
A-record: @ → 75.2.70.75
CNAME: www → proxy-ssl.webflow.com
```

**2. SSL Certificate (automatisk)**
```
Webflow provisionerer automatisk SSL når DNS er verifisert
```

**3. Analytics (1 time)**
```html
<!-- Legg til i Webflow Head Code -->
<script>
  // PostHog
  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.async=!0,p.src=s.api_host+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
  posthog.init('phc_din_project_api_key',{api_host:'https://app.posthog.com'})
</script>
```

**4. Error Tracking (1 time)**
```html
<!-- Sentry -->
<script src="https://js.sentry-cdn.com/din-sentry-key.min.js" crossorigin="anonymous"></script>
```

**5. Status Page (1 time)**
```
Opprett hos https://statuspage.io
→ Legg til link i footer: status.klarpakke.no
```

---

### FASE 6: Soft Launch (DAG 13-14) - 4 timer

#### Launch Checklist:

**Dag 13: Beta Testing**
- [ ] Inviter 10 venner/familie til testing
- [ ] Send e-post med signup-link
- [ ] Be om tilbakemeldinger
- [ ] Fiks kritiske bugs

**Dag 14: Publisering**
- [ ] Final QA
- [ ] Publiser i Webflow
- [ ] Post på sosiale medier
- [ ] Send lanserings-e-post til mailingliste

---

## 📋 Minimal Viable Product (MVP)

### Funkjsoner INKLUDERT i MVP:
- ✅ Signup/Login/Logout
- ✅ Onboarding quiz (3 spørsmål)
- ✅ Paper trading (basic)
- ✅ Signalfølging
- ✅ Stripe betaling (basic)
- ✅ Profil-innstillinger

### Funkjsoner IKKE i MVP (kommer senere):
- ❌ Telegram bot (kan legges til etter launch)
- ❌ Binance live trading (krever mer testing)
- ❌ Blog (ikke kritisk)
- ❌ Advanced analytics
- ❌ Referral system (kan legges til senere)
- ❌ Copy trading

---

## 🎯 Daily Schedule

### Uke 1
| Dag | Fokus | Timer | Mål |
|-----|-------|-------|-----|
| 1 | Webflow setup (sider 1-5) | 4 | Home, Pricing, Login, Signup, Dashboard i Webflow |
| 2 | Webflow setup (sider 6-10) | 4 | Signals, Settings, Terms, Privacy, Help i Webflow |
| 3 | Supabase setup | 6 | Project, migrations, functions deployed |
| 4 | Supabase auth + testing | 6 | Auth fungerer, test signup/login |
| 5 | JavaScript auth | 4 | Auth.js implementert og testet |
| 6 | Paper trading JS | 4 | Paper trading fungerer |
| 7 | Quiz + Stripe JS | 4 | Quiz og Stripe basic fungerer |

### Uke 2
| Dag | Fokus | Timer | Mål |
|-----|-------|-------|-----|
| 8 | Testing | 4 | Alle flows testet, bugs fikset |
| 9 | Testing + fixes | 4 | Cross-browser, mobile testing |
| 10 | Domain + SSL | 4 | klarpakke.no peker til Webflow |
| 11 | Analytics + monitoring | 4 | PostHog, Sentry oppe |
| 12 | Final QA | 4 | Alt fungerer, klart for launch |
| 13 | Beta testing | 4 | 10 beta-testere gir feedback |
| 14 | LAUNCH! 🚀 | 4 | Publisert, markedsført |

---

## 💰 Kostnadsoversikt

| Tjeneste | Kostnad/mnd | Kommentar |
|----------|-------------|-----------|
| Webflow CMS | ~$20 | Hosting + CMS |
| Supabase | $0-25 | Gratis tier holder lenge |
| Stripe | 1.4% + 1.8kr | Kun ved betaling |
| PostHog | $0 | Gratis tier: 1M events/mnd |
| Sentry | $0 | Gratis tier |
| Domain | ~$10/år | hos Namecheap/Domeneshop |
| **Total** | **~$45/mnd** | + Stripe fees ved salg |

---

## 🆘 Fallback Plan

**Hvis noe går galt:**

1. **Supabase nede?**
   - Auth: Bruk Webflow's innebygde Memberstack
   - Data: Lagre i Webflow CMS midlertidig

2. **Stripe problemer?**
   - Bruk Vipps direkte
   - Manuell fakturering først

3. **Tidsnød?**
   - Kutt quiz (bruk default settings)
   - Kutt paper trading (gå rett til live)
   - Bruk Webflow's e-commerce istedenfor Stripe

---

## ✅ Go/No-Go Kriterier

**LAUNCH kun hvis:**
- [ ] Signup → Quiz → Dashboard flow fungerer
- [ ] Paper trading kan opprettes
- [ ] Stripe betaling fungerer (test mode OK)
- [ ] Mobilversjon er brukbar
- [ ] Terms og Privacy er på plass
- [ ] Custom domain fungerer

**VENT hvis:**
- [ ] Auth er ustabil
- [ ] Database connections feiler
- [ ] Betaling ikke fungerer

---

**Klar til å starte?** Start med FASE 1 i morgen! 🚀
