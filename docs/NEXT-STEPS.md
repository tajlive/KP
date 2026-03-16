# 🚀 Neste steg - Fullfør setup

## 1. Kopier API-nøkler til .env.local

### Gå til Supabase Dashboard:
https://app.supabase.com/project/swfyuwkptusceiouqlks/settings/api

### Kopier disse verdiene:

**Project URL:**
```
https://swfyuwkptusceiouqlks.supabase.co
```

**anon (public):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (kopier hele)
```

**service_role (secret):**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (kopier hele)
```

### Opprett .env.local på din maskin:

```bash
cd /Users/taj/klarpakke
cat > .env.local << 'EOF'
# Supabase
SUPABASE_URL=https://swfyuwkptusceiouqlks.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_REF=swfyuwkptusceiouqlks

# Stripe (bruk TEST keys først!)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Site
SITE_URL=http://localhost:3000
EOF
```

**VIKTIG:** Erstatt `eyJ...` med dine faktiske verdier!

---

## 2. Konfigurer Auth i Supabase

### Gå til:
https://app.supabase.com/project/swfyuwkptusceiouqlks/auth/settings

### Under "Site URL":
```
https://klarpakke.no
```

### Under "Redirect URLs" (legg til alle):
```
https://klarpakke.no/app/dashboard
https://klarpakke.no/quiz
https://klarpakke.no/login
https://klarpakke.no/signup
```

### Email Templates (tilpass på norsk):

**Confirmation Email:**
```html
<h2>Velkommen til Klarpakke!</h2>
<p>Klikk lenken under for å bekrefte e-postadressen din:</p>
<p><a href="{{ .ConfirmationURL }}">Bekreft e-post</a></p>
<p>Hvis du ikke opprettet denne kontoen, kan du ignorere denne e-posten.</p>
```

**Reset Password Email:**
```html
<h2>Tilbakestill passord</h2>
<p>Klikk lenken under for å tilbakestille passordet ditt:</p>
<p><a href="{{ .ConfirmationURL }}">Tilbakestill passord</a></p>
```

---

## 3. Kopier til Webflow

### Gå til Webflow:
https://webflow.com/dashboard

### Site Settings → Custom Code

**Head Code:**
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://tajlive.github.io/KP/css/styles.css">
```

**Footer Code:**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script>
  window.KLARPAKKE_CONFIG = {
    supabaseUrl: 'https://swfyuwkptusceiouqlks.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    stripePublishableKey: 'pk_test_...'
  };
</script>
<script src="https://tajlive.github.io/KP/js/klarpakke-bundle.js"></script>
```

**VIKTIG:** Erstatt `eyJ...` med din faktiske ANON key!

---

## 4. Opprett sider i Webflow

### Side 1: Home (/)
1. Pages → Add Page
2. Name: Home
3. Slug: (tom)
4. Settings → Custom Code
5. Kopier innhold fra `webflow-pages/01-home.html`
6. Lim inn i "Inside <body> tag"

### Side 2: Pricing (/pricing)
1. Add Page
2. Name: Pricing
3. Slug: pricing
4. Kopier fra `02-pricing.html`

### Side 3: Login (/login)
1. Add Page
2. Name: Login
3. Slug: login
4. Kopier fra `03-login.html`

### Side 4: Signup (/signup)
1. Add Page
2. Name: Signup
3. Slug: signup
4. Kopier fra `04-signup.html`

### Side 5: Dashboard (/app/dashboard)
1. Add Page
2. Name: Dashboard
3. Slug: app/dashboard
4. Kopier fra `05-dashboard.html`

---

## 5. Publiser og test

### I Webflow:
1. Klikk "Publish" (øvre høyre)
2. Velg ditt domene
3. Vent på publisering

### Test:
1. Gå til https://klarpakke.webflow.io (eller ditt domene)
2. Klikk "Signup"
3. Fyll ut e-post og passord
4. Sjekk at du får bekreftelses-e-post
5. Klikk lenken i e-posten
6. Verifiser at bruker opprettes i Supabase Auth

---

## Verifisering

### Sjekk at bruker ble opprettet:
https://app.supabase.com/project/swfyuwkptusceiouqlks/auth/users

### Sjekk at profil ble opprettet:
https://app.supabase.com/project/swfyuwkptusceiouqlks/editor
→ Table: profiles

---

**Når du har fullført steg 1-3, si ifra så hjelper jeg deg med testing!** 🎯
