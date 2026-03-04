# KLARPAKKE DEPLOYMENT STRATEGY

# VERCEL-FIRST PROTOCOL

---

## 🔴 KRITISK: BRUK ALLTID VERCEL GIT-INTEGRERING

**REGEL #1:** Når du skal deploye Klarpakke til produksjon, bruk **ALLTID** `git push origin main`. Vercel tar seg av resten automatisk.

**REGEL #2:** Bruk Vercel CLI (`vercel --prod`) som backup hvis GitHub-integreringen feiler.

**REGEL #3:** Sjekk alltid build-logs i Vercel Dashboard ved feil.

---

## ⚠️ HVORFOR?

### Vercel fordeler:

- ✅ **Auto-scaling:** Håndterer trafikktopper sømløst.
- ✅ **Global Edge Network:** Rask respons overalt.
- ✅ **Enkel CI/CD:** Ingen kompleks konfigurasjon nødvendig.
- ✅ **Preview deployments:** Test endringer på unike URL-er før merge.
- ✅ **Zero Downtime:** Deployments skjer uten nedetid.

---

## 🎯 DEPLOYMENT WORKFLOW

### Standard Flyt (Anbefalt)

```bash
# 1. Verifiser build lokalt
npm run build

# 2. Commit og push til main
git add .
git commit -m "feat: your change"
git push origin main

# 3. Monitorering
# Følg med på https://vercel.com/tom-jensens-projects/klarpakke
```

### Backup Methode (Vercel CLI)

```bash
# Bruk dette hvis Git-push ikke trigger build
vercel --prod
```

---

## ✅ VERIFISERING ETTER DEPLOY

```bash
# 1. Sjekk produksjons-URL
curl -I https://www.klarpakke.no/no
# Forventet: HTTP/2 200

# 2. Health check
curl -s https://www.klarpakke.no/api/health
# Forventet: {"status":"ok"}

# 3. Auto Trade Dashboard (krever auth)
curl -I https://www.klarpakke.no/no/dashboard/auto-trade
# Forventet: HTTP/2 401 eller 200
```

---

## 🚨 FEILHÅNDTERING

### Build-feil

- Sjekk logs i Vercel Dashboard.
- Kjør `npm run build` lokalt for å isolere feilen.
- Sjekk at alle Environment Variables er satt i Vercel Dashboard.

### Auth-problemer

- Verifiser `NEXT_PUBLIC_APP_URL` i Vercel Dashboard.
- Sjekk Supabase Redirect URLs.

---

## 📊 DEPLOYMENT DECISION TREE

```
Skal du deploye til produksjon?
│
├── JA → Push til main?
│   │
│   ├── Virker det? → JA → ✅ FERDIG
│   │
│   └── Virker det? → NEI → Bruk `vercel --prod` CLI
│
└── Trenger du en preview?
    │
    └── Lag en Pull Request eller kjør `vercel` uten --prod
```
