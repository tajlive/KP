# 🤖 Super MCP - Klarpakke Produksjons Automatisering

Dette er din one-click løsning for å sette opp og vedlikeholde Klarpakke i produksjon.

## 🚀 Hvordan bruke

### Ved nytt prosjekt / etter reset:

```bash
# 1. Kopier denne filen til .kimi/mcp_config.json
mkdir -p ~/Klarpakke/.kimi
cp ~/Klarpakke/SUPER_MCP.md ~/Klarpakke/.kimi/mcp_config.json

# 2. Start Kimi og si:
"Kjør SUPER_MCP for Klarpakke"
```

## 📋 Automatiseringene

### 🔧 Level 1: Grunnleggende (Alltid kjør først)
- [ ] Verifiser Git config (bruker = tomarnejensen)
- [ ] Sjekk Vercel CLI innlogging
- [ ] Verifiser miljøvariabler i Vercel
- [ ] Test bygg lokalt

### 🚀 Level 2: Deploy
- [ ] Bygg og deploy til Vercel
- [ ] Verifiser at www.klarpakke.no fungerer
- [ ] Sjekk API health endpoint
- [ ] Test autentisering

### 🧪 Level 4: Testing & QA
- [ ] Kjør Playwright E2E tester
- [ ] Generer Allure rapport
- [ ] Verifiser testdekning
- [ ] Sjekk performance metrics

### 📊 Testing Kommandoer

```bash
# Kjør produksjons-tester
cd ~/Klarpakke
npm run test:e2e:report

# Generer Allure rapport
npm run allure:generate

# Åpne rapport i nettleser
npm run allure:open

# Debug tester (vis nettleser)
npx playwright test --headed
```

### 🎯 Kritiske Tester
- ✅ Hovedside laster korrekt
- ✅ API Health endpoint fungerer  
- ✅ Autentisering - Login knapp finnes
- ✅ Navigasjon - Alle hovedlenker fungerer
- ✅ Responsiv design - Mobil visning
- ✅ CSP Headers er satt
- ✅ Performance - Core Web Vitals
- [ ] Sett opp Sentry error tracking
- [ ] Konfigurer CSP headers
- [ ] Verifiser rate limiting
- [ ] Sett opp database backups

### 📊 Level 4: Avansert
- [ ] GitHub Actions CI/CD pipeline
- [ ] Automatisk rollback
- [ ] Performance monitoring
- [ ] Slack/Discord varsler

## 📝 Kjappe kommandoer

```bash
# Verifiser produksjon
curl -sI https://www.klarpakke.no/no | grep HTTP

# Sjekk siste deploy
vercel ls klarpakke

# Se logs
vercel logs klarpakke

# Deploy manuelt (hvis nødvendig)
vercel --prod
```

## 🔐 Kritiske hemmeligheter (må være satt i Vercel)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PERPLEXITY_API_KEY=
VERCEL_TOKEN=
```

## 🆘 Troubleshooting

| Problem | Løsning |
|---------|---------|
| 404-feil | Sjekk middleware.ts + CSP |
| Git mismatch | `git config user.name "tomarnejensen"` |
| Rate limit | Vent 3 timer eller bruk Dashboard |
| Build feiler | Sjekk next.config.mjs |

## 📁 Filer som må eksistere

```
~/Klarpakke/
├── .kimi/
│   └── mcp_config.json          # MCP konfigurasjon
├── .github/
│   └── workflows/
│       ├── deploy.yml           # Vercel deploy
│       └── ci.yml               # CI pipeline
├── src/
│   └── app/
│       └── api/
│           └── health/
│               └── route.ts     # Health check
├── next.config.mjs
└── vercel.json
```

## ✅ Pre-Deploy Sjekkliste

Før hver deploy:
- [ ] `npm run build` fungerer lokalt
- [ ] `npm run lint` passerer
- [ ] Git pushed til origin/main
- [ ] Vercel bygg grønt
- [ ] www.klarpakke.no svarer 200
- [ ] Login fungerer
- [ ] Supabase kobler

## 🎯 Neste gang du trenger hjelp

Si til Kimi:
1. "Kjør SUPER_MCP Level 1" - Grunnleggende verifisering
2. "Kjør SUPER_MCP Level 2" - Full deploy
3. "Kjør SUPER_MCP Level 3" - Sikkerhet
4. "Kjør SUPER_MCP ALL" - Alt

---
Lagret: 2026-03-05
Klarpakke Status: ✅ PRODUKSJON
