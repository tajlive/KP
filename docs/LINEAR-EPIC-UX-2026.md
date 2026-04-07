# Linear EPIC: UX Modernisering Q2 2026

**EPIC ID:** KLA-UX-2026-Q2  
**Status:** ✅ FASE 1 FULLFØRT  
**Dato:** April 2026  
**Ansvarlig:** KIMI CLI

---

## 🎯 Sammendrag

Fullført omfattende UX-modernisering av Klarpakke-plattformen med fokus på:
- Fjerning av emoji-ikoner (erstattet med Lucide)
- Token-konsistens i design-systemet
- Forbedret onboarding-opplevelse
- Mobil-optimalisering

---

## ✅ Fullførte oppgaver

### Fase 1: Quick Wins (100%)

| # | Oppgave | Status | Filer endret |
|---|---------|--------|--------------|
| 1.1 | Emoji→Lucide i strategies | ✅ | `strategies-data.ts`, `StrategyCard.tsx`, `SetupWizard.tsx`, `OptimalTrader.tsx` |
| 1.2 | Onboarding Lucide-ikon + redirect | ✅ | `ClientOnboarding.tsx` |
| 1.3 | Token-konsistens | ✅ | `VelkommenContent.tsx`, `ClientCheckout.tsx`, `ClientCheckoutSuccess.tsx` |
| 1.4 | BRAND.link i TrustBar | ✅ | Allerede implementert |
| 1.5 | CTA etter testimonials | ✅ | Allerede implementert |
| 1.6 | KLTWallet emoji→Lucide | ✅ | Allerede implementert |

### Fase 2: Strukturelle endringer

| # | Oppgave | Status | Kommentar |
|---|---------|--------|-----------|
| 2.7 | Bottom-nav for mobil | ✅ | Eksisterte - verifisert funksjonell |
| 2.8 | Dashboard forenkling | 🔄 | Krev mer design-arbeid |
| 2.9 | Profile/konto konsolidering | ⏸️ | Planlagt Q3 |

### Fase 3: Nye features

| # | Oppgave | Status | Planlagt |
|---|---------|--------|----------|
| 3.12 | Leaderboard-preview | ⏸️ | Q3 2026 |
| 3.13 | KLT-teaser | ⏸️ | Q3 2026 |
| 3.14 | Dynamisk brukertall | ⏸️ | Q3 2026 |
| 3.15 | Mikro-læring | ⏸️ | Q3 2026 |
| 3.16 | Glass-morfisme | ⏸️ | Q3 2026 |

---

## 📊 Metrikker

| Metrikk | Baseline | Mål | Status |
|---------|----------|-----|--------|
| Mobil bounce rate | - | -20% | Måles etter 2 uker |
| Onboarding completion | - | +30% | Måles etter 2 uker |
| Konvertering | - | +15% | Måles etter 2 uker |
| Dashboard engagement | - | +25% | Måles etter 2 uker |

---

## 🔧 Tekniske endringer

### Design-tokens
- ✅ `BRAND.gradient` brukes konsistent
- ✅ `BRAND.link` for lenker
- ✅ `BRAND.primary` for CTA-knapper

### Lucide-ikoner erstatter emoji
- ✅ Strategies: Shield, Scale, Rocket
- ✅ Sentiment: AlertOctagon, AlertTriangle, Meh, Smile, Laugh
- ✅ Onboarding: Zap
- ✅ Risk profiles: Shield, TrendingUp, Zap, Flame

### Kommando-mapping (KIMI CLI)
```
kimi_db status     → npm run db:status
kimi_ci            → npm run lint:gate
kimi_monitor prod  → npm run verify:prod
kimi_deploy prod   → npm run deploy:prod
```

---

## 🚀 Deploy-pipeline

```bash
# Full pipeline
./scripts/deploy-pipeline.sh preview
./scripts/deploy-pipeline.sh prod

# Eller via npm
npm run kimi_deploy preview
npm run kimi_deploy prod
```

### Slack-integrasjon
- Webhook: `SLACK_DEPLOY_WEBHOOK`
- Varsler ved: started, success, failure
- Kanal: #klarpakke-alerts

---

## 📝 Notater

### Kjente issues
- Deploy preview timeout ved første kjøring (Vercel installasjon)
- Løst: Fjernet ugyldig `nodeVersion` fra vercel.json

### Neste steg
1. Overvåke metrikker i Posthog
2. Samle brukerfeedback
3. Planlegge Fase 2 (Q3 2026)

---

**Godkjent av:** KIMI CLI  
**Sist oppdatert:** 2026-04-07
