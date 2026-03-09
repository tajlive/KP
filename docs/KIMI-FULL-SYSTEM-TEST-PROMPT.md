# KIMI 2.5 Full System Test Prompt

**Generert:** 2026-03-09 17:04 CET  
**Status:** Klar for testing  
**Latest commit:** `83840699` (Linear oppgaver dokumentert)  
**Production URL:** https://klarpakke.no

---

## Kontekst

Du er senior QA engineer og skal kjøre komplett systemtest av Klarpakke crypto trading platform før lansering til private beta. Plattformen er deployed til production (Vercel) og alle nye features fra dagens arkitektur-review er committed og pushet.

**Prosjekt:** Klarpakke - Norsk crypto trading bot platform  
**Stack:** Next.js 15, TypeScript strict, Supabase, Vercel, Tailwind v4, next-intl  
**Target:** Norske brukere, mobile-first, paper trading som standard

**Value proposition:** "Boten jobber for deg" - brukere skal føle at boten handler trading mens de kan slappe av.

---

## Din Oppgave

Kjør en komplett systemtest som dekker:

1. **Smoke Test** (15 min) - Kritiske brukerfløyter
2. **Security Test** (30 min) - Sårbarheter og exploits
3. **Performance Test** (20 min) - Load, Lighthouse, WebVitals
4. **Mobile Test** (15 min) - Responsiveness og touch targets
5. **Regression Test** (10 min) - Tidligere kjente issues

**Totalt:** ~90 minutter

**Output:** Markdown rapport med:
- Test results (PASS/FAIL med screenshots)
- Funnet bugs prioritert etter severity (P0/P1/P2/P3)
- Blokkere for lansering
- Anbefalte fikser med estimater

---

## 1. SMOKE TEST (15 minutter)

### Test Case 1.1: Ny bruker sign up og onboarding

**Mål:** Verifiser at nye brukere kan registrere seg og komme i gang med paper trading.

**Steg:**
1. Gå til https://klarpakke.no
2. Klikk "Kom i gang" / "Sign up"
3. Registrer ny bruker med:
   - Email: `test+$(date +%s)@klarpakke.no`
   - Passord: Minst 8 tegn, 1 stor, 1 liten, 1 tall
4. Verifiser email (sjekk Resend dashboard hvis nødvendig)
5. Logg inn

**Forventet resultat:**
- [ ] Sign up form er synlig og funksjonell
- [ ] Passord validering viser feilmeldinger ved ugyldig input
- [ ] Email sendes innen 30 sekunder (sjekk Resend)
- [ ] Etter email verification: redirect til dashboard
- [ ] Første gang: Onboarding wizard vises (hvis implementert)
- [ ] Dashboard viser tom state med "Opprett din første bot" CTA

**Akseptansekriterier:**
- Hele fløyten skal ta maksimalt 2 minutter (ekskl. email verification)
- Ingen console errors i DevTools
- Alle tekster på norsk (default) eller engelsk (hvis /en/ route)

---

### Test Case 1.2: Opprett paper trading bot

**Mål:** Verifiser at brukere kan opprette og starte en paper trading bot.

**Steg:**
1. Fra dashboard, klikk "Opprett bot" / "Ny bot"
2. Velg strategi: "DCA (Dollar Cost Averaging)"
3. Konfigurer:
   - Navn: "Test Bot 1"
   - Trading pair: BTC/USDT
   - Investering: 1000 USDT
   - Interval: 1 time
4. Aktiver paper trading toggle (skal være ON som default)
5. Klikk "Start bot"

**Forventet resultat:**
- [ ] Bot creation form åpnes (modal eller egen side)
- [ ] Alle input fields har labels og placeholders
- [ ] Paper trading toggle er synlig og ON som default
- [ ] "Start bot" knapp er disabled inntil alle required fields er fylt
- [ ] Etter opprettelse: redirect til bot detail page
- [ ] Bot status viser "Aktiv" / "Running"
- [ ] Dashboard oppdateres med ny bot

**Akseptansekriterier:**
- Bot creation tar maksimalt 30 sekunder
- Bot vises i bot list innen 5 sekunder
- Ingen hardkodet "fake" data (alle verdier skal være ekte eller clearly marked som demo)

---

### Test Case 1.3: Se trade history og profitt

**Mål:** Verifiser at brukere kan se bot performance og trade history.

**Steg:**
1. Gå til bot detail page for "Test Bot 1"
2. Verifiser at følgende data vises:
   - Total profitt (kr eller %)
   - Antall trades
   - Success rate
   - Current holdings
3. Scroll ned til "Trade History" tabell
4. Verifiser at trades vises med:
   - Timestamp
   - Type (Buy/Sell)
   - Amount
   - Price
   - Fee
   - Profit/Loss

**Forventet resultat:**
- [ ] Dashboard viser live data (ikke cached > 5 min)
- [ ] Profitt-beregning inkluderer Binance fees (0.1% spot trading)
- [ ] Trade history oppdateres automatisk (WebSocket eller polling)
- [ ] Hvis ingen trades ennå: vis "Venter på første trade" med loading state
- [ ] Alle beløp har riktig valuta (NOK/USDT)
- [ ] Timestamps viser norsk tidssone (CET/CEST)

**Akseptansekriterier:**
- Data loading tar maksimalt 2 sekunder
- Profit calculation er nøyaktig (test med kjent trade: buy 1 BTC @ $100k, sell @ $101k = ~$798.99 profit etter fees)

---

### Test Case 1.4: Stopp bot

**Mål:** Verifiser at brukere kan stoppe en aktiv bot.

**Steg:**
1. Fra bot detail page, klikk "Stopp bot" / "Pause"
2. Bekreft i modal (hvis confirmation dialog vises)
3. Verifiser at bot status endres til "Stopped" / "Paused"
4. Verifiser at ingen nye trades kjøres

**Forventet resultat:**
- [ ] "Stopp bot" knapp er synlig når bot er aktiv
- [ ] Confirmation dialog vises (hindrer utilsiktet stopping)
- [ ] Bot status oppdateres innen 5 sekunder
- [ ] Trade execution stopper umiddelbart
- [ ] Bot kan restartes ("Start bot" knapp erstattes "Stopp bot")

**Akseptansekriterier:**
- Bot stopper innen 30 sekunder
- Ingen "orphan" trades etter stopping (alle pending orders cancelles)

---

### Test Case 1.5: Logout og login igjen

**Mål:** Verifiser at session management fungerer.

**Steg:**
1. Klikk "Logg ut" i topnav / user menu
2. Verifiser redirect til landing page
3. Klikk "Logg inn"
4. Logg inn med samme email/passord
5. Verifiser at dashboard viser samme bots og data

**Forventet resultat:**
- [ ] Logout clearing all session data (cookies, localStorage)
- [ ] Login restorer session
- [ ] Dashboard state bevares (bots, settings, preferences)
- [ ] Ingen data loss

**Akseptansekriterier:**
- Login/logout fløyt tar maksimalt 10 sekunder
- Supabase session token expires etter 1 time (check i DevTools → Application → Cookies)

---

## 2. SECURITY TEST (30 minutter)

### Test Case 2.1: SQL Injection

**Mål:** Verifiser at input fields er protected mot SQL injection.

**Steg:**
1. Login form: Prøv å logge inn med:
   - Email: `' OR '1'='1' --`
   - Passord: `anything`
2. Bot name field: Prøv å opprette bot med navn:
   - `'; DROP TABLE bots; --`
3. Search field (hvis tilgjengelig): Prøv:
   - `%' AND 1=0 UNION ALL SELECT NULL, NULL, NULL--`

**Forventet resultat:**
- [ ] Login feiler med "Invalid email or password"
- [ ] Bot opprettes med literal navn (SQL ikke executed)
- [ ] Search returnerer tom result eller error
- [ ] Ingen database errors i Sentry
- [ ] Supabase RLS policies blokkerer unauthorized queries

**Akseptansekriterier:**
- Alle SQL injection attempts skal feile
- Ingen data corruption
- Error messages skal være generic (ikke eksponere SQL structure)

---

### Test Case 2.2: XSS (Cross-Site Scripting)

**Mål:** Verifiser at user input er sanitized/escaped.

**Steg:**
1. Bot name field: Opprett bot med navn:
   - `<script>alert('XSS')</script>`
2. Bot description (hvis tilgjengelig):
   - `<img src=x onerror=alert('XSS')>`
3. Strategy notes field:
   - `<iframe src="javascript:alert('XSS')"></iframe>`

**Forventet resultat:**
- [ ] Script tags vises som plain text (ikke executed)
- [ ] HTML entities er escaped: `&lt;script&gt;` istedenfor `<script>`
- [ ] Ingen JavaScript execution i DevTools Console
- [ ] CSP (Content Security Policy) blokkerer inline scripts

**Akseptansekriterier:**
- Ingen XSS payloads skal execute
- DOMPurify eller lignende sanitizer skal være implementert
- CSP header skal være satt i Vercel (check i Network tab)

---

### Test Case 2.3: CSRF (Cross-Site Request Forgery)

**Mål:** Verifiser at state-changing requests krever CSRF token.

**Steg:**
1. Åpne DevTools → Network tab
2. Kjør en POST request (f.eks. opprett bot)
3. Verifiser at request inneholder CSRF token header eller cookie
4. Prøv å replay request fra curl uten token:
   ```bash
   curl -X POST https://klarpakke.no/api/bots \
     -H "Content-Type: application/json" \
     -d '{"name":"Evil Bot","strategy":"DCA"}'
   ```

**Forventet resultat:**
- [ ] POST requests har `x-csrf-token` header eller `_csrf` cookie
- [ ] Request uten token feiler med 403 Forbidden
- [ ] Supabase JWT token kreves for alle autentiserte API calls
- [ ] Double-submit cookie pattern implementert (hvis ikke bruker Supabase RLS)

**Akseptansekriterier:**
- Alle state-changing requests (POST/PUT/DELETE) skal validere CSRF token
- Token skal være unique per session
- Token skal expire etter logout

---

### Test Case 2.4: Authorization bypass

**Mål:** Verifiser at brukere kun kan aksessere egne data.

**Steg:**
1. Logg inn som User A
2. Opprett en bot og noter bot ID fra URL: `/dashboard/bots/:botId`
3. Logg ut og opprett User B
4. Som User B, prøv å aksessere User A sin bot:
   - Naviger til `/dashboard/bots/:botId_from_user_a`
5. Prøv å kalle API direkte:
   ```bash
   curl https://klarpakke.no/api/bots/:botId_from_user_a \
     -H "Authorization: Bearer :user_b_token"
   ```

**Forventet resultat:**
- [ ] URL access gir 403 Forbidden eller redirect til User B sin dashboard
- [ ] API call gir 403 Forbidden JSON response
- [ ] Supabase RLS blokkerer query (check i Supabase logs)
- [ ] Ingen data leakage (error message skal ikke si "Bot exists but you don't have access")

**Akseptansekriterier:**
- Alle cross-user access attempts skal feile
- RLS policies skal være enabled på alle tabeller med brukerdata
- Error messages skal være generic: "Not found" istedenfor "Forbidden"

---

### Test Case 2.5: Rate limiting

**Mål:** Verifiser at API rate limiting fungerer.

**Steg:**
1. Åpne terminal og kjør:
   ```bash
   for i in {1..20}; do
     curl -X POST https://klarpakke.no/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"wrong@example.com","password":"wrongpassword"}' &
   done
   wait
   ```
2. Verifiser at requests etter limit gir 429 Too Many Requests
3. Test Binance API rate limit (hvis mulig):
   - Opprett 10 bots samtidig
   - Verifiser at rate limiter kjører (check logs i Vercel)

**Forventet resultat:**
- [ ] Login: Max 5 attempts per 15 minutter per IP
- [ ] API: Max 100 requests per minutt per user
- [ ] Binance: Max 1000 requests per minutt globally (buffer under 1200 limit)
- [ ] 429 response inkluderer `Retry-After` header
- [ ] Rate limit info logges til Sentry (ikke som error, men som metric)

**Akseptansekriterier:**
- Rate limiting skal være implementert med Redis eller Vercel KV
- Distributed rate limiting (fungerer på tvers av flere Vercel Functions instances)
- Graceful degradation hvis rate limiter er nede

---

## 3. PERFORMANCE TEST (20 minutter)

### Test Case 3.1: Lighthouse audit

**Mål:** Verifiser at Lighthouse score er >90 på alle metrics.

**Steg:**
1. Åpne Chrome DevTools → Lighthouse tab
2. Kjør audit på:
   - Landing page: https://klarpakke.no
   - Dashboard: https://klarpakke.no/dashboard (logged in)
   - Bot detail: https://klarpakke.no/dashboard/bots/:botId
3. Test både Desktop og Mobile

**Forventet resultat:**

| Metric | Target | Landing | Dashboard | Bot Detail |
|--------|--------|---------|-----------|------------|
| Performance | >90 | ? | ? | ? |
| Accessibility | >95 | ? | ? | ? |
| Best Practices | >90 | ? | ? | ? |
| SEO | >90 | ? | ? | N/A (auth) |

**Akseptansekriterier:**
- Performance score >90 på mobile (hardest to optimize)
- No critical accessibility issues (A11y)
- All images have alt text
- Proper HTML semantic tags (header, nav, main, footer)

---

### Test Case 3.2: WebVitals (Core Web Vitals)

**Mål:** Verifiser at WebVitals møter Google's recommendations.

**Steg:**
1. Installer Web Vitals Extension: https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma
2. Naviger til https://klarpakke.no
3. Noter metrics:
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
4. Repeat for dashboard og bot detail pages

**Forventet resultat:**

| Metric | Target | Landing | Dashboard | Bot Detail |
|--------|--------|---------|-----------|------------|
| LCP | <2.5s | ? | ? | ? |
| FID | <100ms | ? | ? | ? |
| CLS | <0.1 | ? | ? | ? |
| FCP | <1.8s | ? | ? | ? |
| TTFB | <600ms | ? | ? | ? |

**Akseptansekriterier:**
- LCP <2.5s (main hero image/text visible quickly)
- FID <100ms (interactive immediately)
- CLS <0.1 (no layout shift from late-loading images/fonts)

---

### Test Case 3.3: Load test (10 samtidige brukere)

**Mål:** Verifiser at plattformen håndterer flere samtidige brukere.

**Steg:**
1. Bruk `k6` eller `artillery` for load testing:
   ```javascript
   // load-test.js
   import http from 'k6/http';
   import { check, sleep } from 'k6';
   
   export let options = {
     vus: 10, // 10 virtual users
     duration: '2m',
   };
   
   export default function () {
     let res = http.get('https://klarpakke.no/dashboard');
     check(res, {
       'status is 200': (r) => r.status === 200,
       'response time < 2s': (r) => r.timings.duration < 2000,
     });
     sleep(1);
   }
   ```
2. Kjør: `k6 run load-test.js`
3. Monitor Vercel dashboard for error rate og response time

**Forventet resultat:**
- [ ] 0% error rate (all requests succeed)
- [ ] p95 response time <2 sekunder
- [ ] p99 response time <5 sekunder
- [ ] Ingen Vercel Function timeouts (10s hobby, 60s pro)
- [ ] Supabase connection pool ikke exhausted

**Akseptansekriterier:**
- Plattformen skal håndtere 10 samtidige brukere uten degradering
- No cold start issues (Vercel Functions skal være warm)
- Graceful degradation ved high load (queue requests, ikke fail)

---

### Test Case 3.4: Database query performance

**Mål:** Verifiser at Supabase queries er optimaliserte.

**Steg:**
1. Gå til Supabase dashboard → Query Performance
2. Identifiser slowest queries (>1s)
3. Check for missing indexes:
   ```sql
   SELECT
     schemaname,
     tablename,
     attname,
     n_distinct,
     correlation
   FROM pg_stats
   WHERE schemaname = 'public'
     AND n_distinct > 100
     AND correlation < 0.5;
   ```
4. Test dashboard load time med 100+ bots (seed data hvis nødvendig)

**Forventet resultat:**
- [ ] Alle queries <500ms (p95)
- [ ] Indexes på:
   - `bots(user_id)` - for user's bot list
   - `trades(bot_id, created_at)` - for trade history
   - `api_keys(user_id, is_active)` - for API key lookup
- [ ] No sequential scans (Seq Scan) på store tabeller
- [ ] Connection pooling konfigurert (PgBouncer)

**Akseptansekriterier:**
- Dashboard med 100 bots skal laste <2 sekunder
- Query plan skal bruke indexes (check with EXPLAIN ANALYZE)
- No N+1 queries (use Supabase `.select('*, relation(*)')` eager loading)

---

## 4. MOBILE TEST (15 minutter)

### Test Case 4.1: iPhone SE (minste skjerm)

**Mål:** Verifiser at layout fungerer på minste mobile skjerm (375px bred).

**Steg:**
1. Åpne Chrome DevTools → Device Toolbar
2. Velg "iPhone SE" (375x667)
3. Naviger gjennom:
   - Landing page
   - Sign up / Login
   - Dashboard
   - Bot creation form
   - Bot detail page
4. Test både portrait og landscape

**Forventet resultat:**
- [ ] Ingen horizontal scroll
- [ ] All text er readable (minimum 16px font size)
- [ ] Buttons har minimum 44x44px touch targets
- [ ] Forms har stor nok input fields (minimum 44px høyde)
- [ ] Modals er scrollable (ikke cut off at bottom)
- [ ] Navigation fungerer (hamburger menu hvis nødvendig)

**Akseptansekriterier:**
- All critical functionality tilgjengelig på mobile
- No "desktop-only" features
- Touch-friendly UI (large tap targets, no hover-dependent interactions)

---

### Test Case 4.2: iPad (tablet)

**Mål:** Verifiser at layout tilpasser seg tablet screens.

**Steg:**
1. Velg "iPad" (768x1024) i Device Toolbar
2. Test både portrait og landscape
3. Verifiser at layout bruker available space (ikke bare stretched mobile layout)

**Forventet resultat:**
- [ ] Dashboard viser 2-column grid (ikke 1-column som mobile)
- [ ] Sidebar visible (ikke collapsed som mobile)
- [ ] Tables viser flere kolonner
- [ ] Modals er centered (ikke fullscreen)

**Akseptansekriterier:**
- Layout skal være optimalisert for tablet (not just scaled mobile)
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)

---

### Test Case 4.3: Touch interactions

**Mål:** Verifiser at touch events fungerer korrekt.

**Steg:**
1. Test swipe gestures (hvis implementert)
2. Test long-press (hvis context menus)
3. Test pinch-to-zoom (skal være disabled på forms)
4. Test double-tap (skal ikke zoom)

**Forventet resultat:**
- [ ] Swipe gestures smooth (60fps)
- [ ] No accidental taps (buttons ikke for nærme hverandre)
- [ ] Zoom disabled på input focus:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
   ```
- [ ] Pull-to-refresh disabled (hindrer accidental refresh)

**Akseptansekriterier:**
- All touch interactions skal føles native (ikke laggy)
- No 300ms tap delay (use `touch-action: manipulation` CSS)

---

### Test Case 4.4: Offline handling

**Mål:** Verifiser at app håndterer network errors gracefully.

**Steg:**
1. Åpne Chrome DevTools → Network tab
2. Set throttling til "Offline"
3. Prøv å navigere til dashboard
4. Prøv å opprette bot

**Forventet resultat:**
- [ ] "No internet connection" toast/banner vises
- [ ] App ikke crasher (graceful error state)
- [ ] Retry button tilgjengelig
- [ ] When back online: auto-retry failed requests

**Akseptansekriterier:**
- Service Worker implementert for offline support (optional)
- Error states skal være user-friendly (not technical errors)
- Loading states skal timeout etter 30 sekunder

---

## 5. REGRESSION TEST (10 minutter)

### Test Case 5.1: Tidligere kjente issues

**Mål:** Verifiser at tidligere bugs ikke har regressed.

**Sjekk Linear/GitHub issues merket "Fixed" siste 2 uker:**

1. **KLA-31:** Bot status ikke oppdateres live
   - [ ] Verifiser at bot status oppdateres innen 5 sekunder etter stopping

2. **KLA-34:** Paper trading fees ikke inkludert i profitt
   - [ ] Verifiser at profitt-beregning inkluderer fees
   - [ ] Test case: Buy 1 BTC @ $100k, sell @ $101k = $798.99 profit (ikke $1000)

3. **KLA-41:** Sentry error: RLS policy violation
   - [ ] Verifiser at cross-user access gir 403 (ikke RLS error)
   - [ ] Check Sentry: ingen RLS errors siste 24 timer

4. **Environment variables drift**
   - [ ] Verifiser at Vercel og GitHub Actions har samme secrets
   - [ ] Test at bot execution fungerer i både environments

**Akseptansekriterier:**
- Alle tidligere fixed bugs skal fortsatt være fixed
- No regression i critical functionality

---

## OUTPUT FORMAT

Lever rapporten i følgende struktur:

```markdown
# Full System Test Report - Klarpakke

**Dato:** 2026-03-09  
**Tester:** [Ditt navn]  
**Miljø:** Production (https://klarpakke.no)  
**Commit:** 83840699  
**Varighet:** XX minutter

## Executive Summary

- **Totalt antall tester:** XX
- **Passed:** XX (XX%)
- **Failed:** XX (XX%)
- **Blokkere for lansering:** XX

## Critical Findings

### P0 - BLOKKERE (må fikses før lansering)

#### BUG-001: [Kort beskrivelse]
**Severity:** P0 - Blocker  
**Funnet i:** Test Case X.X  
**Beskrivelse:** [Detaljert beskrivelse]  
**Repro steps:**
1. ...
2. ...

**Forventet:** [Hva som skulle skjedd]  
**Faktisk:** [Hva som skjedde]  
**Screenshot:** [link eller embedded image]  

**Root cause:** [Analyse av hvorfor feilen oppstår]  
**Anbefalt fix:** [Konkret løsningsforslag]  
**Estimat:** X timer  
**Risiko hvis ikke fikset:** [Konsekvens]

---

### P1 - KRITISKE (påvirker konvertering)

[Samme format som P0]

---

### P2 - VIKTIGE (forbedrer UX)

[Samme format]

---

### P3 - MINOR (kosmetiske)

[Samme format]

---

## Test Results

### 1. SMOKE TEST

#### 1.1 Ny bruker sign up og onboarding
**Status:** ✅ PASS / ❌ FAIL  
**Varighet:** XX sekunder  
**Noter:** [Observasjoner]

#### 1.2 Opprett paper trading bot
**Status:** ✅ PASS / ❌ FAIL  
**Varighet:** XX sekunder  
**Noter:** [Observasjoner]

[...fortsett for alle test cases]

---

## Performance Metrics

### Lighthouse Scores

| Page | Performance | A11y | Best Practices | SEO |
|------|-------------|------|----------------|-----|
| Landing | XX | XX | XX | XX |
| Dashboard | XX | XX | XX | XX |
| Bot Detail | XX | XX | XX | XX |

### WebVitals

| Page | LCP | FID | CLS | FCP | TTFB |
|------|-----|-----|-----|-----|------|
| Landing | XX | XX | XX | XX | XX |
| Dashboard | XX | XX | XX | XX | XX |
| Bot Detail | XX | XX | XX | XX | XX |

### Load Test Results

- **Virtual users:** 10
- **Duration:** 2 minutter
- **Total requests:** XX
- **Failed requests:** XX (XX%)
- **p95 response time:** XX ms
- **p99 response time:** XX ms

---

## Mobile Test Results

### iPhone SE (375x667)
- **Horizontal scroll:** ✅ NO / ❌ YES
- **Touch targets:** ✅ >44px / ❌ <44px
- **Readable text:** ✅ YES / ❌ NO
- **Issues funnet:** [List]

### iPad (768x1024)
- **Layout optimalisert:** ✅ YES / ❌ NO
- **Responsive breakpoints:** ✅ Working / ❌ Broken
- **Issues funnet:** [List]

---

## Security Test Results

### SQL Injection
- **Login form:** ✅ Protected / ❌ Vulnerable
- **Bot name field:** ✅ Protected / ❌ Vulnerable
- **Search field:** ✅ Protected / ❌ Vulnerable

### XSS
- **Bot name:** ✅ Escaped / ❌ Executed
- **Description:** ✅ Escaped / ❌ Executed
- **CSP header:** ✅ Present / ❌ Missing

### CSRF
- **Token present:** ✅ YES / ❌ NO
- **Token validated:** ✅ YES / ❌ NO

### Authorization
- **Cross-user access:** ✅ Blocked / ❌ Allowed
- **RLS enabled:** ✅ YES / ❌ NO

### Rate Limiting
- **Login:** ✅ Limited / ❌ Unlimited
- **API:** ✅ Limited / ❌ Unlimited
- **Binance:** ✅ Limited / ❌ Unlimited

---

## Regression Test Results

- **KLA-31:** ✅ Still fixed / ❌ Regressed
- **KLA-34:** ✅ Still fixed / ❌ Regressed
- **KLA-41:** ✅ Still fixed / ❌ Regressed
- **ENV sync:** ✅ Synced / ❌ Drifted

---

## Recommendations

### Må fikses før lansering (P0)
1. [Bug ID]: [Fix beskrivelse] - Estimat: X timer
2. [Bug ID]: [Fix beskrivelse] - Estimat: X timer

**Total estimat for P0:** XX timer (~X dager)

### Bør fikses før lansering (P1)
1. [Bug ID]: [Fix beskrivelse] - Estimat: X timer

### Kan fikses post-launch (P2/P3)
- [List av mindre kritiske issues]

---

## Conclusion

**Anbefaling:** ✅ GO for lansering / ❌ NO GO / ⚠️ GO med ressurser

**Begrunnelse:**
[1-2 paragrafer som oppsummerer overall kvalitet, kritiske mangler, og om plattformen er klar for private beta]

**Neste steg:**
1. Fiks alle P0 blokkere
2. Re-test kritiske flows
3. Private beta launch til 10 brukere
4. Overvåk i 48 timer
5. Fiks showstoppers
6. Public launch

---

**Signatur:** [Ditt navn]  
**Godkjent av:** Tom Jensen (Product Owner)  
**Dato:** 2026-03-09
```

---

## TOOLS DU TRENGER

1. **Chrome DevTools**
   - Lighthouse tab
   - Network tab (throttling, headers)
   - Console (errors, warnings)
   - Device Toolbar (mobile emulation)
   - Application tab (cookies, localStorage)

2. **Browser Extensions**
   - Web Vitals: https://chrome.google.com/webstore/detail/web-vitals/ahfhijdlegdabablpippeagghigmibma
   - WAVE Accessibility: https://wave.webaim.org/extension/
   - React DevTools: https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi

3. **Load Testing**
   - k6: https://k6.io/docs/
   - Artillery: https://www.artillery.io/
   - Apache Bench: `ab -n 1000 -c 10 https://klarpakke.no/`

4. **Screenshot/Recording**
   - Chrome DevTools → Capture screenshot (Cmd+Shift+P → "Screenshot")
   - Loom for video: https://www.loom.com/
   - CloudApp for annotated screenshots: https://www.getcloudapp.com/

5. **Database Access**
   - Supabase dashboard: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf
   - SQL Editor for manual queries
   - Query Performance tab

6. **Monitoring**
   - Vercel dashboard: https://vercel.com/tom-jensens-projects/klarpakke
   - Sentry: (check for errors)
   - Resend: (check for email delivery)

---

## SUCCESS CRITERIA

Plattformen er **GO for lansering** hvis:

- [ ] 0 P0 blokkere
- [ ] <3 P1 kritiske issues
- [ ] Lighthouse score >90 på mobile
- [ ] WebVitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] 0 critical security vulnerabilities
- [ ] Load test: 0% error rate med 10 brukere
- [ ] All smoke tests PASS
- [ ] No regression på tidligere fixed bugs

Plattformen er **NO GO for lansering** hvis:

- [ ] >0 P0 blokkere
- [ ] Data security issues (SQL injection, XSS, CSRF)
- [ ] Authorization bypass (cross-user access)
- [ ] Performance <60 Lighthouse score
- [ ] Critical functionality broken (can't sign up, can't create bot, can't see trades)

---

## NOTES

- Hvis du finner en kritisk bug, **stopp testing** og rapporter umiddelbart
- Ta screenshots av alle failures
- Note repro steps i detalj (må kunne reproduseres av utvikler)
- Check Sentry for related errors (correlation)
- Test i både Chrome og Safari (WebKit engine differences)
- Test med både norsk og engelsk locale (`/` vs `/en/`)
- Test med clearing cache/cookies (incognito mode)
- Test med slow 3G network (throttling i DevTools)

Lykke til! 🚀

---

**Generert:** 2026-03-09 17:04 CET  
**Versjon:** 1.0  
**Eier:** Tom Jensen  
**Reviewer:** Perplexity Pro (Chief Architect)
