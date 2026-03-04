# KLARPAKKE AUTH LOOP FIX
# KIMI CODE 2.5 — ABSOLUTT PROSEDYRE

---

## 🔴 PROBLEM: Login loop (alle sider redirecter til innlogging)

**Symptom:** Bruker logger inn → Redirectes tilbake til login → Uendelig loop

**Årsak:** Supabase SSR cookies settes ikke riktig i Cloud Run

---

## ⚡ RASK FIX (KJØR DETTE FØRST)

```bash
# KIMI: Bruk Shell tool
cd ~/klarpakke

# STEG 1: Generer NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)
echo "Generated NEXTAUTH_SECRET: $NEXTAUTH_SECRET"

# STEG 2: Hent nåværende env vars fra .env
export NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(grep NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY .env | cut -d'=' -f2)

# STEG 3: Deploy med ALLE auth-relaterte env vars
gcloud run services update klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --update-env-vars="NEXTAUTH_URL=https://www.klarpakke.no,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

# STEG 4: Vent på deploy
echo "⏳ Venter 30 sekunder på Cloud Run..."
sleep 30

# STEG 5: Verifiser
curl -I https://www.klarpakke.no/no/innlogging
echo "✅ Auth fix deployed. Test login nå."
```

**Tid:** 1-2 minutter

---

## 🔍 HVIS RASK FIX IKKE FUNGERER: FULL DEBUG

### STEG 1: Sjekk Cloud Run env vars

```bash
# KIMI: Bruk Shell tool
gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="yaml(spec.template.spec.containers[0].env)" > /tmp/cloudrun-env.yaml

cat /tmp/cloudrun-env.yaml
```

**Forventet output skal inneholde:**
```yaml
env:
- name: NEXTAUTH_URL
  value: https://www.klarpakke.no
- name: NEXTAUTH_SECRET
  value: <32-char base64 string>
- name: NEXT_PUBLIC_SUPABASE_URL
  value: https://vuxbjlykgmzskxbclquf.supabase.co
- name: NEXT_PUBLIC_SUPABASE_ANON_KEY
  value: eyJ...
```

**Hvis noen mangler:** Gå til STEG 2

---

### STEG 2: Legg til manglende env vars

```bash
# KIMI: Bruk Shell tool
cd ~/klarpakke

# Hent fra .env
export NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(grep NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY .env | cut -d'=' -f2)

# Generer NEXTAUTH_SECRET hvis mangler
if ! gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(spec.template.spec.containers[0].env)" | grep -q "NEXTAUTH_SECRET"; then
  
  echo "❌ NEXTAUTH_SECRET mangler. Legger til..."
  NEXTAUTH_SECRET=$(openssl rand -base64 32)
  
  gcloud run services update klarpakke \
    --region=us-central1 \
    --project=klarpakke-universitet \
    --update-env-vars="NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
else
  echo "✅ NEXTAUTH_SECRET finnes"
fi

# Sjekk NEXTAUTH_URL
if ! gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(spec.template.spec.containers[0].env)" | grep -q "NEXTAUTH_URL=https://www.klarpakke.no"; then
  
  echo "❌ NEXTAUTH_URL feil eller mangler. Fikser..."
  gcloud run services update klarpakke \
    --region=us-central1 \
    --project=klarpakke-universitet \
    --update-env-vars="NEXTAUTH_URL=https://www.klarpakke.no"
else
  echo "✅ NEXTAUTH_URL korrekt"
fi

# Sjekk NEXT_PUBLIC_* vars
if ! gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(spec.template.spec.containers[0].env)" | grep -q "NEXT_PUBLIC_SUPABASE_URL"; then
  
  echo "❌ NEXT_PUBLIC_SUPABASE_URL mangler. Legger til..."
  gcloud run services update klarpakke \
    --region=us-central1 \
    --project=klarpakke-universitet \
    --update-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
else
  echo "✅ NEXT_PUBLIC_* vars finnes"
fi

echo "✅ Alle env vars verifisert"
```

---

### STEG 3: Sjekk Supabase auth config

```bash
# KIMI: Bruk Shell tool
cd ~/klarpakke

# Test Supabase connection
curl -s -X POST \
  "https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testtest123"}' \
  | jq .

# Forventet: {"error": ...} (email already exists eller lignende)
# IKKE forventet: Connection refused, 401 Unauthorized
```

**Hvis connection refused eller 401:**
- Sjekk at `NEXT_PUBLIC_SUPABASE_ANON_KEY` er riktig
- Sjekk at Supabase project er aktiv

---

### STEG 4: Sjekk Supabase Site URL

```bash
# KIMI: Rapporter til bruker
echo "🔍 Sjekk Supabase Dashboard:"
echo "1. Gå til: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration"
echo "2. Verifiser at 'Site URL' er: https://www.klarpakke.no"
echo "3. Verifiser at 'Redirect URLs' inkluderer:"
echo "   - https://www.klarpakke.no/**"
echo "   - https://www.klarpakke.no/no/**"
echo "   - https://www.klarpakke.no/en/**"
echo "4. Hvis feil: Oppdater og test igjen"
```

**KRITISK:** Supabase Site URL **MÅ** være `https://www.klarpakke.no`

---

### STEG 5: Test auth flow manuelt

```bash
# KIMI: Bruk Shell tool

# Test login page
curl -s -I https://www.klarpakke.no/no/innlogging | grep -E "HTTP|location|set-cookie"

# Forventet: HTTP/2 200
# IKKE forventet: 404, 500, redirect loop

# Test dashboard (skal redirect til login)
curl -s -I https://www.klarpakke.no/no/dashboard/auto-trade | grep -E "HTTP|location"

# Forventet: HTTP/2 307 eller 302, location: /no/innlogging?redirectTo=...
```

---

### STEG 6: Rebuild med riktige env vars i build-time

Hvis problemet fortsetter, kan det være at `NEXT_PUBLIC_*` vars ikke ble baked inn i build:

```bash
# KIMI: Bruk Shell tool
cd ~/klarpakke

# Hent env vars
export NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(grep NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY .env | cut -d'=' -f2)

# Rebuild og deploy
gcloud run deploy klarpakke \
  --source . \
  --region us-central1 \
  --project klarpakke-universitet \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production,NEXTAUTH_URL=https://www.klarpakke.no,NEXTAUTH_SECRET=$(openssl rand -base64 32),NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

echo "⏳ Venter på rebuild (6-8 min)..."
```

**Tid:** 6-8 minutter

---

## 🐛 DEBUGGING: Live logs

Hvis fortsatt problemer, sjekk live logs:

```bash
# KIMI: Bruk Shell tool
gcloud run services logs read klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --limit=100 \
  | grep -E "auth|supabase|cookie|session|middleware"
```

**Se etter:**
- `Error: Missing NEXTAUTH_SECRET`
- `Supabase client error`
- `Cookie parse error`
- `Middleware redirect loop`

---

## 📋 COMMON ISSUES & FIXES

### Issue 1: `NEXTAUTH_SECRET` mangler

**Symptom:** Cookies ikke settes

**Fix:**
```bash
gcloud run services update klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --update-env-vars="NEXTAUTH_SECRET=$(openssl rand -base64 32)"
```

---

### Issue 2: `NEXTAUTH_URL` feil

**Symptom:** Redirect går til feil domene

**Fix:**
```bash
gcloud run services update klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --update-env-vars="NEXTAUTH_URL=https://www.klarpakke.no"
```

---

### Issue 3: Supabase Site URL feil

**Symptom:** CORS errors, cookies blocked

**Fix:**
1. Gå til [Supabase Dashboard](https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf/auth/url-configuration)
2. Sett **Site URL** til: `https://www.klarpakke.no`
3. Legg til **Redirect URLs:**
   - `https://www.klarpakke.no/**`
4. Klikk **Save**

---

### Issue 4: `NEXT_PUBLIC_*` vars ikke i build

**Symptom:** Frontend kan ikke kommunisere med Supabase

**Fix:**
```bash
cd ~/klarpakke

# Rebuild med env vars
gcloud run deploy klarpakke \
  --source . \
  --region us-central1 \
  --project klarpakke-universitet \
  --set-env-vars="NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

---

### Issue 5: Middleware loop

**Symptom:** `getUser()` feiler alltid

**Fix:**
```bash
cd ~/klarpakke

# Sjekk at middleware bruker getUser() ikke getSession()
grep -n "getUser\|getSession" src/middleware.ts

# Forventet: Kun getUser() brukes (linje 119 i middleware.ts)
```

**Hvis `getSession()` brukes:**
```bash
sed -i '' 's/getSession()/getUser()/g' src/middleware.ts
git add src/middleware.ts
git commit -m "fix: use getUser() instead of getSession() in middleware"
git push origin main

# Deretter deploy
gcloud run deploy klarpakke --source . --region us-central1 --project klarpakke-universitet
```

---

## ✅ VERIFISERING ETTER FIX

```bash
# KIMI: Bruk Shell tool

echo "=== VERIFISERER AUTH FIX ==="

# 1. Test login page
echo "1. Login page:"
curl -s -I https://www.klarpakke.no/no/innlogging | grep "HTTP"

# 2. Test at dashboard redirecter til login
echo "2. Dashboard redirect:"
curl -s -I https://www.klarpakke.no/no/dashboard/auto-trade | grep -E "HTTP|location"

# 3. Sjekk env vars
echo "3. Env vars:"
gcloud run services describe klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --format="value(spec.template.spec.containers[0].env)" \
  | grep -E "NEXTAUTH_URL|NEXTAUTH_SECRET|NEXT_PUBLIC_SUPABASE"

echo "✅ Verifisering fullført. Bruker må teste login manuelt."
```

**Forventet output:**
```
1. Login page:
HTTP/2 200

2. Dashboard redirect:
HTTP/2 307
location: https://www.klarpakke.no/no/innlogging?redirectTo=%2Fno%2Fdashboard%2Fauto-trade

3. Env vars:
NEXTAUTH_URL=https://www.klarpakke.no
NEXTAUTH_SECRET=<secret>
NEXT_PUBLIC_SUPABASE_URL=https://vuxbjlykgmzskxbclquf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<key>
```

---

## 📊 FIX DECISION TREE

```
Auth loop problem?
│
├── RASK FIX: Deploy med NEXTAUTH_SECRET + NEXTAUTH_URL (1 min)
│   │
│   ├── Fungerer? → ✅ FERDIG
│   │
│   └── Fungerer ikke? → Gå til FULL DEBUG
│
├── FULL DEBUG:
│   │
│   ├── STEG 1: Sjekk env vars
│   │   ├── Mangler? → STEG 2: Legg til
│   │   └── OK? → STEG 3
│   │
│   ├── STEG 3: Test Supabase connection
│   │   ├── Feiler? → Sjekk API keys
│   │   └── OK? → STEG 4
│   │
│   ├── STEG 4: Sjekk Supabase Site URL
│   │   ├── Feil? → Oppdater i dashboard
│   │   └── OK? → STEG 5
│   │
│   ├── STEG 5: Test auth flow
│   │   ├── Feiler? → Sjekk logs (DEBUGGING)
│   │   └── OK? → STEG 6
│   │
│   └── STEG 6: Rebuild med env vars (6-8 min)
│       └── Test igjen
│
└── DEBUGGING: Live logs
    └── Se etter auth errors
```

---

## 🔥 KIMI EXECUTION SCRIPT

**KIMI: Når bruker rapporterer auth loop, kjør dette:**

```bash
echo "🚨 Fikser auth loop..."
cd ~/klarpakke

# RASK FIX
NEXTAUTH_SECRET=$(openssl rand -base64 32)
export NEXT_PUBLIC_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env | cut -d'=' -f2)
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env | cut -d'=' -f2)
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$(grep NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY .env | cut -d'=' -f2)

gcloud run services update klarpakke \
  --region=us-central1 \
  --project=klarpakke-universitet \
  --update-env-vars="NEXTAUTH_URL=https://www.klarpakke.no,NEXTAUTH_SECRET=$NEXTAUTH_SECRET,NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY,NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"

echo "⏳ Venter 30 sekunder..."
sleep 30

# VERIFISER
echo "✅ Auth fix deployed. Verifiserer..."
curl -s -I https://www.klarpakke.no/no/innlogging | grep "HTTP"

echo "✅ Bruker må teste login nå: https://www.klarpakke.no/no/innlogging"
```

---

## 📝 RAPPORT TEMPLATE

**KIMI: Generer denne rapporten etter fix:**

```markdown
# AUTH LOOP FIX — <TIMESTAMP>

## Problem
Login loop: Bruker redirectes tilbake til innlogging etter vellykket login.

## Årsak
<NEXTAUTH_SECRET mangler | NEXTAUTH_URL feil | Supabase Site URL feil | annet>

## Fix utført
1. <Steg 1>
2. <Steg 2>
3. ...

## Resultater
✅ NEXTAUTH_URL: https://www.klarpakke.no
✅ NEXTAUTH_SECRET: <satt>
✅ NEXT_PUBLIC_SUPABASE_URL: https://vuxbjlykgmzskxbclquf.supabase.co
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: <satt>

## Verifisering
✅ Login page: HTTP 200
✅ Dashboard redirect: HTTP 307 → /no/innlogging
✅ Env vars: Alle korrekte

## Neste steg for bruker
1. Gå til: https://www.klarpakke.no/no/innlogging
2. Logg inn med Google eller email
3. Verifiser at du redirectes til dashboard etter login
4. Hvis fortsatt problem: Sjekk Supabase Site URL i dashboard

## Status
<✅ LØST | ⚠️ DELVIS LØST | ❌ IKKE LØST>
```

---

## 🎯 SUKSESSKRITERIER

Auth loop er FIKSET når:

- [ ] Login page viser (HTTP 200)
- [ ] Dashboard redirecter til login når uautentisert (HTTP 307)
- [ ] NEXTAUTH_URL = https://www.klarpakke.no
- [ ] NEXTAUTH_SECRET er satt
- [ ] NEXT_PUBLIC_SUPABASE_URL er riktig
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY er riktig
- [ ] Bruker kan logge inn og se dashboard
- [ ] Cookies settes etter login

---

## 🔥 START EXECUTION NÅ

**KIMI: Kjør RASK FIX nå. Ikke vent på bekreftelse.**
