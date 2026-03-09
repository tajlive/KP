# KIMI 2.5 - VERIFISER FIXES I PRODUCTION

**Generert:** 2026-03-09 17:40 CET  
**Commit:** 1ca6ad881  
**Status:** 🟡 VENTER PÅ VERCEL DEPLOY  
**Estimat:** 15-20 minutter

---

## KONTEKST

Du har nettopp pushet kritiske fixes til production:

### ✅ FASE 2 KOMPLETT: Paper Trading Fix
**File:** `src/lib/paper-trading/supabase.ts`

**Endringer:**
- ❌ `paper_simulations` (deprecated tabell i _historical/)
- ✅ `trading_sessions` (unified schema i produksjon)
- ✅ Mapping-funksjon `mapToPaperSimulation()`
- ✅ Kolonne mapping:
  - `initial_capital` → `initial_balance`
  - `current_capital` → `current_balance`
  - `status === 'active'` → `is_active`

### ✅ FASE 3 KOMPLETT: LCP Optimalisering
**File:** `src/app/[locale]/layout.tsx`

**Endringer:**
- ✅ Preconnect til Supabase (vuxbjlykgmzskxbclquf.supabase.co)
- ✅ Preconnect til Google Fonts
- ✅ DNS-prefetch for raskere oppslag
- ✅ Eksisterende: AVIF/WebP, font-display: swap

---

## DIN OPPGAVE

**FASE 4: VERIFISER I PRODUCTION (15-20 minutter)**

1. Vent på Vercel deploy (2-3 min)
2. Verifiser paper trading bots vises
3. Verifiser LCP <2.5s
4. Dokumenter resultat
5. GO/NO-GO beslutning for KLA-129

---

## STEG 1: VENT PÅ VERCEL DEPLOY (2-3 min)

### 1.1: Sjekk Deploy Status

**Metode 1: Vercel CLI**
```bash
vercel ls klarpakke --scope tom-jensens-projects
```

**Forventet output:**
```
Project: klarpakke
Latest Deployment:
  URL: https://klarpakke.vercel.app
  Status: READY ✅
  Created: 2026-03-09 17:42 CET
  Commit: 1ca6ad881
```

**Status indikerer:**
- `BUILDING` → Vent 1-2 min, sjekk igjen
- `READY` → Deploy fullført, fortsett til Steg 2
- `ERROR` → Deploy feilet, sjekk Vercel logs

---

### 1.2: Ping Health Endpoint

**Test at production er oppe:**
```bash
curl -s https://www.klarpakke.no/api/health | jq
```

**Forventet response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-09T16:42:30.123Z",
  "uptime": 1234567,
  "version": "1ca6ad881"
}
```

**Hvis 404 eller 500:**
- Deploy kan ha feilet
- Sjekk Vercel dashboard: https://vercel.com/tom-jensens-projects/klarpakke
- Sjekk Sentry for errors

---

## STEG 2: VERIFISER PAPER TRADING BOTS (5 min)

### 2.1: Test Trading Sessions API

**Query Supabase direkte for å verifisere data:**

**SQL (kjør i Supabase SQL Editor):**
```sql
-- 1. Sjekk at trading_sessions tabell eksisterer
SELECT 
  id,
  user_id,
  initial_capital,
  current_capital,
  status,
  strategy_id,
  created_at
FROM trading_sessions
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 10;
```

**Forventet:**
- 3 rader (Tom Jensen sine bots)
- `initial_capital`: 100000 (hver)
- `status`: 'active'
- `user_id`: Tom Jensen user ID

**Hvis 0 rader:**
- Bots finnes ikke i trading_sessions
- Sjekk paper_trading_sessions (emergency tabell)
- Mulig datamigrasjon kreves

---

### 2.2: Test Paper Trading API Endpoint

**Hvis API endpoint eksisterer:**
```bash
curl -s https://www.klarpakke.no/api/paper-trading/sessions \
  -H "Authorization: Bearer [USER_TOKEN]" \
  | jq
```

**Forventet response:**
```json
{
  "sessions": [
    {
      "id": "uuid-1",
      "initial_balance": 100000,
      "current_balance": 100523.45,
      "is_active": true,
      "preset": "dca",
      "created_at": "2026-03-09T15:00:00Z"
    },
    // ... 2 more
  ],
  "total": 3
}
```

**Hvis 401 Unauthorized:**
- Trenger valid JWT token
- Logg inn via browser først
- Copy token fra DevTools → Application → Cookies → `sb-access-token`

---

### 2.3: Manuell Test i Browser

**Steg:**

1. **Åpne https://www.klarpakke.no i incognito**
   - Incognito sikrer fresh state (ingen cached data)

2. **Logg inn:**
   - Email: [Tom Jensen sin email]
   - Passord: [passord]

3. **Naviger til Dashboard:**
   - URL: https://www.klarpakke.no/dashboard
   - eller: https://www.klarpakke.no/nb/dashboard

4. **Åpne Chrome DevTools:**
   - F12 eller Cmd+Option+I
   - Gå til Console tab

5. **Sjekk for console errors:**
   ```javascript
   // Skal være 0 errors relatert til paper trading
   // Tillatte warnings: React hydration (non-kritisk)
   ```

6. **Verifiser dashboard viser:**

   **Stats Cards (top row):**
   - [ ] **Total Investert:** 300,000 USDT (3 × 100,000)
   - [ ] **Nåværende Verdi:** ~300,000 USDT (±fees og profit/loss)
   - [ ] **Total Profitt:** [dynamisk, kan være positiv eller negativ]
   - [ ] **Profitt %:** [dynamisk]

   **Bot List (main content):**
   - [ ] 3 bots vises
   - [ ] Hver bot har:
     - Navn (f.eks. "Bot 1", "Bot 2", "Bot 3")
     - Status: "Aktiv" (grønn badge)
     - Initial Capital: 100,000 USDT
     - Current Value: [dynamisk]
     - Profit/Loss: [dynamisk]
     - Last Updated: < 5 minutter siden

7. **Klikk på en bot for detaljer:**
   - URL: https://www.klarpakke.no/dashboard/bots/[bot-id]
   - [ ] Trade history tabell vises
   - [ ] Minst 1 trade (hvis bot har kjørt >5 min)
   - [ ] Trade kolumner:
     - Timestamp
     - Type (Buy/Sell)
     - Symbol (f.eks. BTC/USDT)
     - Quantity
     - Price
     - Total
     - Fee (0.1% av total)

8. **Åpne DevTools Network tab:**
   - Refresh page (Cmd+R)
   - Sjekk requests:
     - [ ] `/api/paper-trading/sessions` → 200 OK
     - [ ] `/api/paper-trading/trades` → 200 OK (hvis endpoint eksisterer)
     - [ ] Supabase requests → 200 OK
   - Sjekk response times:
     - [ ] API responses < 500ms
     - [ ] Page load < 2s

---

### 2.4: Dokumenter Resultat

**Ta screenshots:**
1. Dashboard overview (stats + bot list)
2. Bot detail page (trade history)
3. DevTools Console (0 errors)
4. DevTools Network (200 OK responses)

**Markdown template:**
```markdown
### Test Result: Paper Trading Bots

**URL:** https://www.klarpakke.no/dashboard  
**Testet:** 2026-03-09 17:45 CET  
**Browser:** Chrome 122 (incognito)

**Status:** ✅ PASS / ❌ FAIL

**Dashboard Stats:**
- Total Investert: [value] (forventet: 300,000 USDT)
- Nåværende Verdi: [value]
- Total Profitt: [value]

**Bots:**
- Bot 1: [status] - [current value]
- Bot 2: [status] - [current value]
- Bot 3: [status] - [current value]

**Trade History:**
- Bot 1: [X trades]
- Bot 2: [X trades]
- Bot 3: [X trades]

**Console Errors:** [antal] (forventet: 0)
**Network Errors:** [antal] (forventet: 0)

**Screenshots:**
- [link to dashboard screenshot]
- [link to bot detail screenshot]

**Konklusjon:**
[✅ Bots vises korrekt / ❌ Bots vises ikke / ⚠️ Bots vises men med feil data]
```

---

## STEG 3: VERIFISER LCP <2.5s (5 min)

### 3.1: Lighthouse Audit (Chrome DevTools)

**Steg:**

1. **Åpne https://www.klarpakke.no i incognito**
   - Lukk alle andre tabs (for clean test)
   - Disable browser extensions (kan påvirke score)

2. **Åpne Chrome DevTools:**
   - F12 eller Cmd+Option+I
   - Gå til Lighthouse tab

3. **Konfigurer Lighthouse:**
   - Mode: **Navigation** (default)
   - Categories: **Performance** (kun)
   - Device: **Mobile** (hardest to optimize)

4. **Kjør audit:**
   - Klikk "Analyze page load"
   - Vent 30-60 sekunder

5. **Noter scores:**

   | Metric | Target | Actual | Status |
   |--------|--------|--------|--------|
   | Performance | >90 | ? | ? |
   | LCP | <2.5s | ? | ? |
   | FCP | <1.8s | ? | ? |
   | TBT | <200ms | ? | ? |
   | CLS | <0.1 | ? | ? |
   | Speed Index | <3.4s | ? | ? |

6. **Sjekk LCP element:**
   - I Lighthouse report, scroll til "Largest Contentful Paint"
   - Klikk "View Treemap" eller "View Original Trace"
   - Noter hvilket element som er LCP:
     - [ ] Image? (forventet: optimalisert med Next.js Image)
     - [ ] Text? (forventet: hero heading)
     - [ ] Background? (forventet: ingen store backgrounds)

7. **Sjekk Opportunities:**
   - "Eliminate render-blocking resources"
   - "Properly size images"
   - "Reduce unused JavaScript"
   - Noter topp 3 opportunities (hvis score <90)

---

### 3.2: PageSpeed Insights (Google)

**URL:** https://pagespeed.web.dev/analysis?url=https://www.klarpakke.no

**Test både:**
- Mobile (default)
- Desktop (klikk tab)

**Noter Core Web Vitals:**

| Metric | Mobile | Desktop | Status |
|--------|--------|---------|--------|
| LCP | ? | ? | ? |
| FID | ? | ? | ? |
| CLS | ? | ? | ? |

**Status legend:**
- 🟢 Green = Good (LCP <2.5s)
- 🟡 Yellow = Needs Improvement (LCP 2.5-4.0s)
- 🔴 Red = Poor (LCP >4.0s)

---

### 3.3: Vercel Analytics (Real User Data)

**URL:** https://vercel.com/tom-jensens-projects/klarpakke/analytics

**Sjekk Real Experience Score:**
- Basert på faktiske brukere (mer reliable enn lab tests)
- Target: >75

**Sjekk Web Vitals tab:**
- LCP: p75 <2.5s
- FID: p75 <100ms
- CLS: p75 <0.1

**Note:** Real user data kan ta 24-48 timer å akkumulere etter deploy.

---

### 3.4: Dokumenter Resultat

**Markdown template:**
```markdown
### Test Result: LCP Performance

**URL:** https://www.klarpakke.no  
**Testet:** 2026-03-09 17:50 CET  
**Device:** Mobile (Chrome DevTools)

**Lighthouse Scores:**

| Metric | Target | Before | After | Δ | Status |
|--------|--------|--------|-------|---|--------|
| Performance | >90 | 64 | ? | ? | ? |
| LCP | <2.5s | 6.4s | ? | ? | ? |
| FCP | <1.8s | 2.1s | ? | ? | ? |
| TBT | <200ms | 220ms | ? | ? | ? |
| CLS | <0.1 | 0.004 | ? | ? | ? |

**LCP Element:**
- Type: [Image/Text/Background]
- Selector: [CSS selector]
- Load Time: [ms]

**PageSpeed Insights:**
- Mobile LCP: [s] ([Green/Yellow/Red])
- Desktop LCP: [s] ([Green/Yellow/Red])

**Opportunities (if score <90):**
1. [Opportunity 1] - Impact: [ms]
2. [Opportunity 2] - Impact: [ms]
3. [Opportunity 3] - Impact: [ms]

**Screenshot:**
- [link to Lighthouse report screenshot]

**Konklusjon:**
[✅ LCP <2.5s achieved / ❌ LCP still >2.5s / ⚠️ LCP improved but not yet target]
```

---

## STEG 4: FINAL REPORT (5 min)

### 4.1: Sammendrag av Alle Tests

**Lag komplett rapport:**

```markdown
# Production Verification Report - 2026-03-09

**Commit:** 1ca6ad881  
**Deploy:** 2026-03-09 17:42 CET  
**Verified:** 2026-03-09 17:55 CET  
**Tester:** KIMI 2.5

---

## Executive Summary

**Overall Status:** ✅ GO / ❌ NO-GO / ⚠️ CONDITIONAL GO

| Issue | Status | Notes |
|-------|--------|-------|
| Paper Trading Bots Vises Ikke | ✅/❌ | [notes] |
| LCP 6.4s → <2.5s | ✅/❌ | [notes] |

---

## Issue 1: Paper Trading Bots

**Status:** ✅ FIXED / ❌ NOT FIXED / ⚠️ PARTIAL

**Test Results:**
- Dashboard viser bots: ✅/❌
- Total Investert: [value] (forventet: 300,000 USDT)
- Bots synlige: [antal] (forventet: 3)
- Trade history: ✅/❌
- Console errors: [antal] (forventet: 0)

**Root Cause (bekreftet):**
- Kode brukte `paper_simulations` (deprecated)
- Fikset til `trading_sessions` (correct)
- Mapping-funksjon implementert

**Remaining Issues:**
[List hvis ikke 100% fixed]

---

## Issue 2: LCP Performance

**Status:** ✅ FIXED / ❌ NOT FIXED / ⚠️ PARTIAL

**Performance Metrics:**

| Metric | Before | After | Target | Δ | Status |
|--------|--------|-------|--------|---|--------|
| LCP | 6.4s | [s] | <2.5s | [s] | ✅/❌ |
| Lighthouse | 64/100 | [score] | >90 | [pts] | ✅/❌ |
| FCP | 2.1s | [s] | <1.8s | [s] | ✅/❌ |
| TBT | 220ms | [ms] | <200ms | [ms] | ✅/❌ |

**Changes Applied:**
- Preconnect til Supabase: ✅
- Preconnect til Google Fonts: ✅
- DNS-prefetch: ✅
- AVIF/WebP images: ✅ (already configured)
- font-display: swap: ✅ (already configured)

**Remaining Issues:**
[List hvis LCP fortsatt >2.5s]

---

## GO/NO-GO Decision for KLA-129

**Decision:** ✅ GO / ❌ NO-GO / ⚠️ CONDITIONAL GO

**Reasoning:**
[1-2 paragrafer som forklarer beslutningen]

**Conditions (if conditional GO):**
1. [Condition 1]
2. [Condition 2]

**Blokkere (if NO-GO):**
1. [Blocker 1]
2. [Blocker 2]

---

## Next Steps

**If GO:**
1. ✅ Start KLA-129 (i18n implementation)
2. Monitor Sentry for 24 timer
3. Monitor Vercel Analytics for LCP

**If NO-GO:**
1. Fix remaining blokkere
2. Re-test
3. Re-evaluate GO/NO-GO

**If CONDITIONAL GO:**
1. Address conditions
2. Parallel start på KLA-129 (low risk parts)
3. Re-test before KLA-129 deploy

---

## Appendix

**Screenshots:**
- Dashboard: [link]
- Bot detail: [link]
- Lighthouse report: [link]
- PageSpeed Insights: [link]

**Raw Data:**
- Lighthouse JSON: [link eller paste]
- Supabase query results: [link eller paste]
- Network waterfall: [link]

---

**Signatur:** KIMI 2.5  
**Godkjent av:** Tom Jensen (Product Owner)  
**Dato:** 2026-03-09 17:55 CET
```

---

### 4.2: Lagre Rapport

**File:** `docs/PRODUCTION-VERIFICATION-20260309.md`

```bash
# Lagre rapport til docs/
cat > docs/PRODUCTION-VERIFICATION-20260309.md << 'EOF'
[paste full report here]
EOF

# Commit
git add docs/PRODUCTION-VERIFICATION-20260309.md
git commit -m "docs: Add production verification report for paper trading + LCP fixes"
git push origin main
```

---

## SUCCESS CRITERIA

**✅ GO for KLA-129 hvis:**
- [ ] Paper trading bots vises (3/3)
- [ ] Total Investert = 300,000 USDT
- [ ] Trade history vises (minst 1 trade per bot)
- [ ] LCP <2.5s (Mobile)
- [ ] Lighthouse Performance >90 (Mobile)
- [ ] 0 kritiske console errors
- [ ] 0 kritiske Sentry errors siste 1 time

**❌ NO-GO hvis:**
- [ ] Bots vises ikke (0/3)
- [ ] LCP >4.0s (fortsatt veldig tregt)
- [ ] Kritiske console errors (RLS, 500, etc.)
- [ ] Dashboard crasher

**⚠️ CONDITIONAL GO hvis:**
- [ ] Bots vises men med feil data (f.eks. 0 USDT)
- [ ] LCP 2.5-4.0s (bedre men ikke target)
- [ ] Lighthouse 80-89 (bra men ikke excellent)
- [ ] Noen non-kritiske errors

---

## TROUBLESHOOTING

### Problem: Bots vises ikke

**Sjekk 1: Data finnes i database?**
```sql
SELECT COUNT(*) FROM trading_sessions WHERE status = 'active';
-- Forventet: 3
```

**Hvis 0:** Bots finnes ikke, mulig data tap under migrasjon.

**Sjekk 2: RLS policies blokkerer?**
```sql
SELECT * FROM trading_sessions; -- Kjør som service role
-- Hvis data vises: RLS issue
-- Hvis data ikke vises: Data finnes virkelig ikke
```

**Sjekk 3: Frontend query feil?**
```javascript
// I Chrome Console (når logget inn):
const { data, error } = await window.supabase
  .from('trading_sessions')
  .select('*')
  .eq('status', 'active');
  
console.log('Data:', data);
console.log('Error:', error);
```

**Fix:**
- Hvis RLS issue: Deploy RLS policy fix
- Hvis query feil: Fix frontend code
- Hvis data mangler: Run data migration

---

### Problem: LCP fortsatt >2.5s

**Sjekk 1: Hvilken element er LCP?**
```javascript
// I Chrome Console:
new PerformanceObserver((list) => {
  const entries = list.getEntries();
  const lastEntry = entries[entries.length - 1];
  console.log('LCP element:', lastEntry.element);
  console.log('LCP time:', lastEntry.renderTime || lastEntry.loadTime);
}).observe({entryTypes: ['largest-contentful-paint']});

// Refresh page
```

**Hvis Image:**
- Sjekk at Next.js Image brukes (ikke <img>)
- Sjekk at `priority` flag er satt
- Sjekk at AVIF/WebP format brukes

**Hvis Text:**
- Sjekk at font lastes med preload
- Sjekk at font-display: swap er satt
- Sjekk at kritisk CSS er inlined

**Hvis Background:**
- Konverter til <Image> component
- Lazy-load hvis under-the-fold

**Fix:**
- Identifier element
- Apply corresponding optimization
- Re-test

---

## TIMELINE

**17:40 → START**
- Deploy status: BUILDING

**17:42 → Deploy READY**
- Health check: OK
- Start testing

**17:45 → Paper Trading Test**
- Logg inn
- Verifiser bots
- Take screenshots

**17:50 → LCP Test**
- Lighthouse audit
- PageSpeed Insights
- Vercel Analytics

**17:55 → Report**
- Skriv rapport
- GO/NO-GO beslutning
- Commit og push

**18:00 → FERDIG**
- Total tid: 20 minutter

---

**DETTE ER EN STRENGT DEFINERT VERIFICATION PROMPT.**
**FØLG ALLE STEG I REKKEFØLGE.**
**DOKUMENTER ALT MED SCREENSHOTS OG DATA.**

**Deadline:** 2026-03-09 18:00 CET (20 min fra nå)  
**Approved by:** Tom Jensen (Product Owner)

---

**START NÅ. GI FINAL RAPPORT OM 20 MINUTTER.**
