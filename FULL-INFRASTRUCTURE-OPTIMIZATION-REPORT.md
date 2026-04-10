# 🔧 Full Infrastruktur-optimaliseringsanalyse - Klarpakke

**Dato:** 2026-04-10  
**Prosjekt:** Klarpakke Trading Platform  
**Mål:** $30-45/måned total infrastrukturkostnad  
**Nåværende:** ~$20/måned (Vercel Pro) + Supabase Free  

---

## 📊 Executive Summary

| Komponent | Status | Kostnad | Optimalisering |
|-----------|--------|---------|----------------|
| **Supabase** | ✅ OPTIMALISERT | $0 (Free) | 93.7% størrelsesreduksjon |
| **Vercel** | ✅ PRO AKTIVERt | $20/mnd | Tier-basert minnekonfig |
| **GitHub Actions** | ✅ OPTIMALISERT | $0 (Public) | Cache + parallelisering |
| **Cloudflare** | ⚠️ TRENGER GJENNOMGANG | $? | DNS + CDN + Cache |
| **Resend** | ⚠️ TRENGER VERIFISERING | $? | E-post kvoter |
| **Stripe** | ✅ KONFIGURERT | 2.9% + 30¢ | Webhook optimalisering |
| **Mempalace** | ✅ RAW MODE | $0 | M1 workaround |
| **Sentry** | ✅ KONFIGURERT | $0 (Free) | Error tracking |

**Anbefalt budsjett:** $25-35/måned

---

## ✅ 1. Supabase Database (OPTIMALISERT)

### Oppsummering av optimaliseringer
```
Før:  3,028 MB (605% av Free tier)
Etter:   190 MB (38% av Free tier)
Sparing: $25/måned (unngått Pro-upgrade)
```

### Fullførte tiltak
- [x] Truncated unified_notifications (8.9M → 2,490 rows)
- [x] Fjernet 160+ ubrukte indekser
- [x] Lagt til manglende FK-indekser
- [x] Implementert retention policy (daily cron @ 02:00)

### Gjenværende arbeid
- [ ] Monitorere 304 gjenværende ubrukte indekser (30-dagers vindu)
- [ ] Optimalisere 500+ RLS policies (auth_rls_initplan warnings)
- [ ] Arkiveringsstrategi for produksjon (30-dagers retention)

---

## ✅ 2. Vercel Pro (AKTIVERt)

### Konfigurasjon
```json
{
  "regions": ["arn1"],
  "functions": {
    "src/app/api/cron/**/*.ts": { "maxDuration": 300, "memory": 3008 },
    "src/app/api/v1/trading/**/*.ts": { "maxDuration": 30, "memory": 3008 },
    "src/app/api/ai/**/*.ts": { "maxDuration": 60, "memory": 3008 },
    "src/app/api/health/**/*.ts": { "maxDuration": 10, "memory": 512 },
    "src/app/api/status/**/*.ts": { "maxDuration": 5, "memory": 256 }
  }
}
```

### Kostnadsoptimaliseringer
| Rute | Minne | Dur | Est. Kjøring/mnd | Kostnad |
|------|-------|-----|------------------|---------|
| /api/cron/* | 3008MB | 300s | ~1,000 | Inkludert |
| /api/v1/trading/* | 3008MB | 30s | ~10,000 | Inkludert |
| /api/health/* | 512MB | 10s | ~50,000 | Inkludert |
| /api/status/* | 256MB | 5s | ~100,000 | Inkludert |

**Pro-funksjoner i bruk:**
- ✅ 90 min build time (vs 45 min Free)
- ✅ 30s function duration (vs 10s Free)
- ✅ 1TB båndbredde (vs 100GB Free)
- ✅ Prioritized builds
- ✅ Analytics + Speed Insights

---

## ✅ 3. GitHub Actions (OPTIMALISERT)

### Aktive Workflows

#### deploy.yml
```yaml
Triggere: workflow_run (etter PR Check) + manual
Timeout: 30 min
Cache: Next.js build + Vercel CLI
Features:
  - Supabase migrations (kun production)
  - Edge Functions deploy
  - Health check etter deploy
  - Cloudflare cache purge
```

#### test.yml
```yaml
Triggere: push/PR + schedule (03:00 UTC) + manual
Jobs:
  - Unit Tests (4 shards, parallel)
  - Smoke Tests (etter unit)
  - Critical E2E (2 shards, etter smoke)
  - Regression (kun schedule/manual)
```

#### pr-check.yml
```yaml
Triggere: push (main/staging/develop) + PR
Jobs:
  - Validate: Type check, Lint, Unit tests, i18n validate
  - Build: Build + artifact upload
```

### Optimaliseringer implementert
- [x] Node 24 runtime (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24`)
- [x] Build cache (`.next/cache`, `.turbo`)
- [x] Vercel CLI cache
- [x] Parallelisering (unit test shards)
- [x] Telemetry disabled (`NEXT_TELEMETRY_DISABLED=1`)

### Månedlige minutter (estimat)
| Workflow | Kjøringer/mnd | Minutter/kjøring | Totalt |
|----------|---------------|------------------|--------|
| PR Check | ~200 | ~8 | ~1,600 min |
| Deploy | ~100 | ~12 | ~1,200 min |
| Test | ~150 | ~15 | ~2,250 min |
| **Total** | | | **~5,050 min** |

**Kostnad:** $0 (public repository)

---

## ⚠️ 4. Cloudflare (TRENGER GJENNOMGANG)

### Nåværende konfigurasjon
```yaml
# GitHub Actions - deploy.yml
- name: Purge Cloudflare cache
  run: |
    curl -sS -X POST \
      "https://api.cloudflare.com/client/v4/zones/${{ secrets.CLOUDFLARE_ZONE_ID }}/purge_cache" \
      -H "Authorization: Bearer ${{ secrets.CLOUDFLARE_API_TOKEN }}" \
      -H "Content-Type: application/json" \
      --data '{"purge_everything":true}'
```

### Mangler verifisering
- [ ] **Plan-nivå:** Free ($0) vs Pro ($20/mnd)
- [ ] **Page Rules:** Cache-konfigurasjon for statiske assets
- [ ] **Argo Smart Routing:** Nødvendig for trading-latency?
- [ ] **Load Balancing:** Nødvendig?

### Anbefalinger
| Feature | Kostnad | Begrunnelse |
|---------|---------|-------------|
| **Free Plan** | $0 | Tilstrekkelig for nåværende trafikk |
| **Page Rules** | $0 (3 regler) | Cache static assets: `_next/static/*`, `images/*` |
| **Argo** | $5/mnd | Vurder ved høy trading-latency |

### DNS-oppsett (sjekk)
```
klarpakke.no → CNAME → cname.vercel-dns.com
www.klarpakke.no → CNAME → cname.vercel-dns.com
```

### SSL/TLS
- [ ] Verifiser "Full (strict)" modus
- [ ] Automatisk HTTPS rewrite
- [ ] HSTS enabled

---

## ⚠️ 5. Resend (E-post) (TRENGER VERIFISERING)

### Implementasjon
```typescript
// src/lib/resend/templates.ts
- 7 e-postmaler for Auto Trading
- Norsk språk
- HTML + plain text versjoner
- Responsive design
```

### Maler
1. `strategyActivated` - Strategi aktivert
2. `strategyDeactivated` - Strategi deaktivert
3. `tradeOpened` - Ny trade åpnet
4. `tradeClosed` - Trade lukket (P&L)
5. `circuitBreakerTriggered` - Sikkerhetsstopp
6. `dailyPnLSummary` - Daglig oppsummering
7. `autoTradeWelcome` - Velkomst-e-post

### API Endepunkter
- `POST /api/send-email` - Send e-post
- `POST /api/webhooks/resend` - Webhook handling
- `GET /api/admin/resend-health` - Health check

### Kostnadsberegning
| Plan | Månedlig | Volum | For Klarpakke |
|------|----------|-------|---------------|
| Free | $0 | 100/dag (3,000/mnd) | **Tilstrekkelig** |
| Pro | $20 | 50,000/mnd | Ved skalering |

**Anbefaling:** Fortsett med Free plan. Monitorer volum.

---

## ✅ 6. Stripe (Betalinger)

### Implementasjon
```typescript
// API Routes
- POST /api/webhooks/stripe - Webhook handling
- GET /api/pricing - Prisinformasjon
- GET /api/stripe/verify-session - Session verifisering
- GET /api/admin/stripe-health - Health check

// Dependencies
- stripe: ^22.0.1
- @stripe/stripe-js: ^9.1.0
```

### Webhook Events håndtert
- `checkout.session.completed` - Betaling fullført
- `invoice.paid` - Abonnement fornyet
- `invoice.payment_failed` - Betaling feilet
- `customer.subscription.deleted` - Kansellert

### Kostnad
| Transaksjon | Fee |
|-------------|-----|
| Europeiske kort | 1.5% + €0.25 |
| Internasjonale kort | 3.25% + €0.25 |
| Norsk bankkonto | 0.8% (maks kr 40) |

**Ingen fast kostnad** - kun transaksjonsgebyr

---

## ✅ 7. Mempalace (Minnesystem)

### Konfigurasjon
```yaml
# mempalace.yaml
wing: klarpakke
version: "2.0"
storage:
  mode: raw  # M1 Mac workaround
  search_backend: grep
  aaak_compression: true

rooms:
  - critical_decisions  (HIGH)
  - error_patterns      (HIGH)
  - auth_system         (HIGH)
  - tech_debt           (MEDIUM)
  - api_contracts       (MEDIUM)
  - project_status      (STANDARD)
  - kimi_sessions       (STANDARD)
  - archive             (LOW)
```

### Status
- [x] Raw mode aktivert (ChromaDB workaround for M1)
- [x] AAAK kompresjon
- [x] Knowledge Graph aktivert
- [x] Diary aktivert

### Kostnad
**$0** - Selv-hostet lokalt

---

## 🔧 8. Dependencies Audit

### Kritiske avhengigheter
```json
{
  "next": "16.2.3",
  "react": "19.1.0",
  "react-dom": "19.1.0",
  "typescript": "6.3.3",
  "@supabase/supabase-js": "2.49.4",
  "@supabase/ssr": "0.6.1",
  "stripe": "^22.0.1",
  "resend": "^6.9.3",
  "ai": "^4.3.9",
  "@ai-sdk/openai": "^1.3.12"
}
```

### DevTools
```json
{
  "playwright": "^1.51.1",
  "vitest": "^3.1.1",
  "eslint": "^9.24.0",
  "@storybook/react": "^8.6.12",
  "lighthouse": "^12.5.1"
}
```

### Optimaliseringsmuligheter

#### A. Bundle Size
```bash
# Analyser bundle size
npm run analyze

# Identifiser store pakker
npx webpack-bundle-analyzer
```

#### B. Ubrukte pakker (sjekk)
```bash
# Finn potensielt ubrukte pakker
npx depcheck --json > unused-deps.json
```

#### C. ESM-first
```bash
# Prioriter ESM-moduler for tree-shaking
# Eksisterende ESM-pakker: ai, @ai-sdk/*, next-intl
```

---

## 📈 9. Overvåking & Analytics

### Implementert
| Tjeneste | Status | Formål |
|----------|--------|--------|
| **Sentry** | ✅ Aktiv | Error tracking, performance |
| **Vercel Analytics** | ✅ Aktiv | Web Vitals |
| **Vercel Speed Insights** | ✅ Aktiv | Performance metrics |
| **Lighthouse CI** | ✅ Konfigurert | Automated audits |

### Sentry-konfigurasjon
```typescript
// sentry.server.config.ts
// sentry.edge.config.ts
// instrumentation-client.ts

DSN: Konfigurert via env
Traces Sample Rate: 10% (production)
Profiles Sample Rate: 5%
```

### Lighthouse CI
```json
// .lighthouserc.json
{
  "ci": {
    "collect": { "url": ["http://localhost:3000/no"] },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## 💰 Kostnadssammendrag

### Nåværende månedlige kostnader
| Tjeneste | Plan | Kostnad |
|----------|------|---------|
| Vercel | Pro | $20 |
| Supabase | Free | $0 |
| GitHub Actions | Public | $0 |
| Cloudflare | Free | $0 |
| Resend | Free | $0 |
| Stripe | Pay-as-you-go | $0 (kun transaksjonsgebyr) |
| Sentry | Free | $0 |
| **TOTAL** | | **$20/mnd** |

### Potensiell framtidig skalering
| Scenario | Endringer | Ny kostnad |
|----------|-----------|------------|
| **Høy trafikk** | Cloudflare Pro + Argo | $25/mnd |
| **Mange e-poster** | Resend Pro | $40/mnd |
| **Stor database** | Supabase Pro (8GB) | $25 + $25 = $50/mnd |
| **AI-heavy** | Vercel AI tokens | $20 + varierende |

### Mål: $30-45/måned
**Status:** ✅ Under budsjett ($20/mnd)
**Buffer:** $10-25/mnd for uforutsette behov

---

## 🎯 Prioriterte Optimaliseringer

### Høy prioritet (Umiddelbar)
1. [ ] **Cloudflare-verifisering**
   - Sjekk DNS-oppsett
   - Verifiser Page Rules
   - SSL/TLS konfigurasjon

2. [ ] **Resend volum-monitorering**
   - Sett opp alerts ved 80% av Free-kvote
   - Implementer rate limiting

3. [ ] **Bundle size analyse**
   - Kjør `npm run analyze`
   - Identifiser optimaliseringsmuligheter

### Medium prioritet (Denne måneden)
4. [ ] **Supabase indeks-monitorering**
   - Følg opp 304 ubrukte indekser
   - Fjern etter 30 dager hvis fortsatt ubrukte

5. [ ] **RLS policy optimalisering**
   - Erstatt `auth.uid()` med `(select auth.uid())`
   - Batch-oppdater 500+ policies

6. [ ] **GitHub Actions cache-tuning**
   - Review cache hit rates
   - Optimaliser cache nøkler

### Lav prioritet (Neste kvartal)
7. [ ] **Edge Functions optimalisering**
   - Bundle size reduksjon
   - Cold start optimalisering

8. [ ] **Trading latency måling**
   - Vurder Cloudflare Argo ved behov
   - Edge Function regions

---

## 📋 Sjekkliste for Vedlikehold

### Daglig
- [ ] Sjekk Vercel deploy status
- [ ] Monitor Supabase storage
- [ ] Sjekk error logs (Sentry)

### Ukentlig
- [ ] Review GitHub Actions minutter
- [ ] Sjekk Resend e-postvolum
- [ ] Analyser Web Vitals trends

### Månedlig
- [ ] Review ubrukte indekser
- [ ] Sjekk kostnadsutvikling
- [ ] Database vacuum/analyze

---

## 🔗 Viktige Lenker

| Dokument | Beskrivelse |
|----------|-------------|
| `SUPABASE-OPTIMIZATION-COMPLETE-2026-04-10.md` | Database-optimalisering |
| `VERCEL-PRO-OPTIMALISERING.md` | Vercel-konfigurasjon |
| `mempalace.yaml` | Minnesystem-konfig |
| `.github/workflows/deploy.yml` | Deploy-pipeline |
| `vercel.json` | Vercel-innstillingar |

---

**Rapport generert:** 2026-04-10  
**Neste review:** 2026-05-10  
**Ansvarlig:** Kimi Infrastructure Agent
