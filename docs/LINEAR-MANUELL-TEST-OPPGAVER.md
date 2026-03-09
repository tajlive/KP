# Linear Manuell Test Oppgaver

Dette dokumentet inneholder alle oppgaver som må opprettes i Linear før manuell testing.

## Rotårsak
Vi har gjennomført omfattende arkitektur- og lanseringsplanlegging. Før vi kan starte manuell testing må alle blokkere, kritiske fikser og testplan være dokumentert i Linear for sporing og kvalitetssikring.

## Prioritering
1. **BLOKKERE** (må fikses før lansering)
2. **KRITISK** (påvirker konvertering/stabilitet direkte)
3. **VIKTIG** (forbedrer UX/sikkerhet)
4. **TEKNISK GJELD** (kan håndteres post-launch)

---

## BLOKKERE - Må fikses før lansering

### KLA-101: Supabase RLS policies mangler på kritiske tabeller
**Prioritet:** P0 - Blocker  
**Estimat:** 3 timer  
**Team:** Backend/Security

**Problem:**  
Flere tabeller i production database mangler Row Level Security policies. Dette er en kritisk sikkerhetssårbarhet som kan eksponere brukerdata.

**Rotårsak:**  
RLS policies ble ikke migrert fra development til production. Ingen automatisk validering av RLS i CI/CD.

**Løsning:**
1. Audit alle Supabase tabeller for manglende RLS
2. Implementer RLS policies for:
   - `bot_configurations` (owner = auth.uid())
   - `trade_history` (via bot ownership)
   - `api_keys` (owner = auth.uid() AND encrypted)
   - `strategy_templates` (public read OR owner)
3. Legg til RLS validation i CI/CD
4. Dokumenter RLS patterns i SECURITY.md

**Testplan:**
- [ ] Logg inn som User A, prøv å lese User B sine bots → Skal feile
- [ ] Logg inn som User A, opprett bot, verifiser at kun User A ser den
- [ ] Test API key access på tvers av brukere → Skal feile
- [ ] Kjør automated RLS test suite

**Akseptansekriterier:**
- [ ] Alle tabeller med brukerdata har RLS enabled
- [ ] RLS policies dekker read/write/update/delete
- [ ] CI fails hvis nye tabeller mangler RLS
- [ ] Ingen data leaks i production audit

**Risiko hvis ikke fikset:**
🔴 **KRITISK** - Data breach, brudd på GDPR, full stopp på lansering

---

### KLA-102: Binance API rate limiting ikke implementert
**Prioritet:** P0 - Blocker  
**Estimat:** 4 timer  
**Team:** Backend/Trading

**Problem:**  
Binance API har strikte rate limits (1200 req/min). Hvis vi overskrider dette, får alle brukere API ban i 24 timer.

**Rotårsak:**  
Ingen rate limiting implementert i API wrapper. Hver bot kaller Binance direkte uten koordinering.

**Løsning:**
1. Implementer Redis-basert rate limiter:
   ```typescript
   // lib/exchange/rate-limiter.ts
   export class BinanceRateLimiter {
     private redis: Redis;
     private maxRequestsPerMinute = 1000; // Buffer under 1200
     
     async acquireSlot(): Promise<boolean> {
       const key = `binance:rate:${Date.now() / 60000 | 0}`;
       const current = await this.redis.incr(key);
       await this.redis.expire(key, 60);
       return current <= this.maxRequestsPerMinute;
     }
   }
   ```
2. Wrap alle Binance API calls med rate limiter
3. Implementer exponential backoff på 429 errors
4. Legg til monitoring for rate limit usage

**Testplan:**
- [ ] Stress test: 100 bots kjører samtidig i 5 minutter
- [ ] Verifiser at rate aldri overskrider 1000 req/min
- [ ] Test at requests queues når limit nås
- [ ] Verifiser exponential backoff på 429

**Akseptansekriterier:**
- [ ] Rate limiter implementert med Redis
- [ ] Alle Binance calls går gjennom limiter
- [ ] Grafana dashboard viser rate limit usage
- [ ] Alerts på >80% rate limit usage

**Risiko hvis ikke fikset:**
🔴 **KRITISK** - Alle brukere får API ban, plattformen blir ubrukelig i 24 timer

---

### KLA-103: Ingen fallback når Vercel Functions feiler
**Prioritet:** P0 - Blocker  
**Estimat:** 5 timer  
**Team:** Backend/DevOps

**Problem:**  
Vercel Functions har timeout på 10 sekunder (hobby plan) eller 60 sekunder (pro). Hvis en trading bot henger, blokkerer den hele queue.

**Rotårsak:**  
Bot execution kjører i Vercel Functions uten timeout, retry logic eller circuit breaker.

**Løsning:**
1. Migrer bot execution til GitHub Actions cron jobs:
   - Stable (ingen Vercel cold starts)
   - Kan kjøre i opptil 6 timer
   - Gratis for public repos
2. Implementer circuit breaker pattern:
   ```typescript
   class BotExecutionCircuitBreaker {
     private failures = new Map<string, number>();
     
     async execute(botId: string, fn: () => Promise<void>) {
       if (this.failures.get(botId) >= 3) {
         throw new Error('Circuit open: bot disabled after 3 failures');
       }
       try {
         await fn();
         this.failures.delete(botId);
       } catch (error) {
         this.failures.set(botId, (this.failures.get(botId) || 0) + 1);
         throw error;
       }
     }
   }
   ```
3. Legg til dead letter queue for failed executions
4. Send email til bruker hvis bot disables

**Testplan:**
- [ ] Test bot execution timeout etter 5 minutter
- [ ] Verifiser at andre bots ikke påvirkes
- [ ] Test circuit breaker: 3 feil = bot disabled
- [ ] Verifiser email notification sendes

**Akseptansekriterier:**
- [ ] Bot execution har 5 min timeout
- [ ] Circuit breaker disabler bots etter 3 feil
- [ ] Failed executions går til dead letter queue
- [ ] Bruker får email ved bot disable

**Risiko hvis ikke fikset:**
🔴 **KRITISK** - En feilende bot kan blokkere alle andre bots, dårlig UX

---

### KLA-104: ENV vars ikke synkronisert mellom Vercel og GitHub Actions
**Prioritet:** P0 - Blocker  
**Estimat:** 2 timer  
**Team:** DevOps

**Problem:**  
Vercel og GitHub Actions har separate secret stores. Hvis vi oppdaterer en API key i Vercel, feiler GitHub Actions.

**Rotårsak:**  
Ingen single source of truth for secrets. Manuell synkronisering fører til drift.

**Løsning:**
1. Bruk Vercel som single source of truth
2. Sync secrets til GitHub Actions via API:
   ```yaml
   # .github/workflows/sync-secrets.yml
   name: Sync Secrets from Vercel
   on:
     schedule:
       - cron: '0 */6 * * *'  # Every 6 hours
   jobs:
     sync:
       runs-on: ubuntu-latest
       steps:
         - name: Fetch secrets from Vercel
           run: |
             vercel env pull .env.production \
               --token=${{ secrets.VERCEL_TOKEN }}
         - name: Update GitHub secrets
           uses: actions/github-script@v6
           with:
             script: |
               // Parse .env.production og oppdater GitHub secrets
   ```
3. Legg til validation at begge miljøer har samme secrets
4. Alert hvis secrets drifter

**Testplan:**
- [ ] Oppdater secret i Vercel
- [ ] Verifiser at GitHub Actions får oppdatering innen 6 timer
- [ ] Test at validation feiler hvis secrets mangler

**Akseptansekriterier:**
- [ ] Vercel er single source of truth
- [ ] GitHub Actions synker secrets automatisk
- [ ] Validation kjører hver 6. time
- [ ] Alert på drift mellom miljøer

**Risiko hvis ikke fikset:**
🔴 **KRITISK** - Bot execution feiler i production uten forklaring

---

## KRITISK - Påvirker konvertering/stabilitet

### KLA-105: Paper trading viser ikke riktig profitt
**Prioritet:** P1 - Kritisk  
**Estimat:** 3 timer  
**Team:** Frontend/Backend

**Problem:**  
Paper trading dashboard viser feil profitt pga. manglende gebyrberegning.

**Løsning:**
1. Legg til Binance fee structure (0.1% spot trading)
2. Beregn fees på både buy og sell
3. Vis fees tydelig i trade history
4. Oppdater profitt-beregning til å trekke fees

**Testplan:**
- [ ] Paper trade: Buy 1 BTC @ $100k → Skal koste $100,100 (inkl. fee)
- [ ] Sell 1 BTC @ $101k → Skal gi $100,898.99 (etter fees)
- [ ] Verifiser total profitt = $798.99 (ikke $1000)

---

### KLA-106: Ingen onboarding for nye brukere
**Prioritet:** P1 - Kritisk  
**Estimat:** 6 timer  
**Team:** Frontend/Product

**Problem:**  
Brukere som logger inn første gang ser tom dashboard uten guidance.

**Løsning:**
1. Implementer onboarding wizard:
   - Step 1: Velg trading strategy (vellykket template)
   - Step 2: Start paper trading
   - Step 3: Se første trade (fake data hvis nødvendig)
2. First-time user experience:
   - Auto-opprett demo bot med DCA strategy
   - Vis «Boten jobber for deg» med animasjon
   - Onboarding checklist i sidebar

**Testplan:**
- [ ] Ny bruker: Skal se onboarding wizard
- [ ] Wizard completion: Demo bot opprettet og aktivert
- [ ] Returning user: Ingen wizard, normal dashboard

---

### KLA-107: Manglende error boundaries i React
**Prioritet:** P1 - Kritisk  
**Estimat:** 2 timer  
**Team:** Frontend

**Problem:**  
Hvis en komponent crasher, crasher hele appen.

**Løsning:**
1. Wrap kritiske komponenter i error boundaries
2. Vis fallback UI istedenfor blank skjerm
3. Send error til Sentry
4. Implementer «Prøv igjen» knapp

---

## VIKTIG - Forbedrer UX/sikkerhet

### KLA-108: Loading states mangler på dashboard
**Prioritet:** P2 - Viktig  
**Estimat:** 3 timer  
**Team:** Frontend

**Problem:**  
Dashboard viser blank skjerm i 2-3 sekunder mens data laster.

**Løsning:**
1. Legg til Skeleton loaders for alle datatabeller
2. Implementer optimistic UI updates for bot actions
3. Legg til pulse animation på loading states

---

### KLA-109: Ingen CAPTCHA på login
**Prioritet:** P2 - Viktig  
**Estimat:** 2 timer  
**Team:** Backend/Security

**Problem:**  
Login endpoint kan bruteforces uten begrensning.

**Løsning:**
1. Implementer Cloudflare Turnstile (gratis, privacy-first CAPTCHA)
2. Rate limit login attempts (5 per 15 min per IP)
3. Send email ved mistenkelig aktivitet

---

### KLA-110: Mobile responsiveness på settings page
**Prioritet:** P2 - Viktig  
**Estimat:** 4 timer  
**Team:** Frontend

**Problem:**  
Settings page er ikke optimalisert for mobil.

**Løsning:**
1. Refactor settings til accordion-layout på mobil
2. Forbedre touch targets (minimum 44x44px)
3. Test på iPhone SE (minste skjerm)

---

## TEKNISK GJELD - Kan håndteres post-launch

### KLA-111: Manglende TypeScript strict mode
**Prioritet:** P3 - Teknisk gjeld  
**Estimat:** 8 timer  
**Team:** Frontend/Backend

**Problem:**  
TypeScript strict mode er disabled, mange any-typer i kodebasen.

**Løsning:**
1. Enable strict mode i tsconfig.json
2. Fiks alle type errors (estimert 50-100 filer)
3. Fjern alle `@ts-ignore` kommentarer

---

### KLA-112: Test coverage under 30%
**Prioritet:** P3 - Teknisk gjeld  
**Estimat:** 16 timer  
**Team:** Alle

**Problem:**  
Vitest test coverage er ~25%, mange kritiske funksjoner er ikke testet.

**Løsning:**
1. Skriv unit tests for trading logic (target: 80% coverage)
2. Legg til integration tests for Binance API wrapper
3. Implementer E2E tests med Playwright for kritiske flows

---

### KLA-113: Ingen logging av user actions
**Prioritet:** P3 - Teknisk gjeld  
**Estimat:** 4 timer  
**Team:** Backend

**Problem:**  
Vi har ingen audit log av user actions (opprett bot, endre settings, etc).

**Løsning:**
1. Implementer audit_log table i Supabase
2. Log alle CRUD operations på bots, strategies, API keys
3. Legg til UI for admin til å se audit log

---

## Manuell Test Checklist

Når alle blokkere (KLA-101 til KLA-104) er fikset, kjør denne testen:

### Smoke Test (15 minutter)
- [ ] Sign up ny bruker → Skal få onboarding wizard
- [ ] Opprett paper trading bot → Skal starte innen 1 minutt
- [ ] Se trade history → Skal vise fees korrekt
- [ ] Stopp bot → Skal stoppe innen 30 sekunder
- [ ] Logout og login igjen → Skal beholde session

### Security Test (30 minutter)
- [ ] SQL injection på login form → Skal blockes
- [ ] Prøv å lese andre brukeres bots via API → Skal få 403
- [ ] Brute force login (10 forsøk) → Skal rate limiteres
- [ ] XSS i bot name field → Skal escapes
- [ ] CSRF på API endpoints → Skal valideres med token

### Performance Test (20 minutter)
- [ ] Load dashboard med 10 aktive bots → Skal laste < 2 sekunder
- [ ] Lighthouse score på mobile → >90 performance
- [ ] WebVitals: LCP <2.5s, FID <100ms, CLS <0.1

### Mobile Test (15 minutter)
- [ ] Test på iPhone SE (375px bred skjerm)
- [ ] Test på iPad (landscape og portrait)
- [ ] Verifiser at alle buttons er minimum 44x44px
- [ ] Test at modals er scrollable

---

## KIMI 2.5 Code Prompts

### Prompt for KLA-101 (RLS Policies)
```
Du er senior Supabase database engineer. Implementer Row Level Security policies for følgende tabeller:

1. `bot_configurations`: Brukere skal kun se egne bots
2. `trade_history`: Brukere skal kun se trades fra egne bots
3. `api_keys`: Brukere skal kun se egne API keys, og keys skal være encrypted
4. `strategy_templates`: Public read for alle, men kun owner kan update/delete

Krav:
- RLS policies skal være performante (bruk indexes)
- Alle policies skal ha tester (pgTAP)
- Legg til audit logging for RLS policy violations
- Dokumenter RLS patterns i docs/SECURITY.md

Lever SQL migrations i supabase/migrations/ og test suite i supabase/tests/
```

### Prompt for KLA-102 (Rate Limiting)
```
Du er senior backend engineer. Implementer Redis-basert rate limiter for Binance API:

1. Opprett `lib/exchange/rate-limiter.ts` med BinanceRateLimiter class
2. Rate limit: 1000 requests per minutt (buffer under Binance limit på 1200)
3. Bruk Redis for distributed rate limiting (flere Vercel Functions instances)
4. Implementer exponential backoff på 429 errors
5. Legg til Grafana metrics for rate limit usage

Krav:
- TypeScript strict mode
- 100% test coverage for rate limiter
- Graceful degradation hvis Redis er nede
- Alert når rate limit usage > 80%

Lever kode i lib/exchange/ og tester i __tests__/exchange/
```

### Prompt for KLA-103 (Circuit Breaker)
```
Du er senior backend engineer. Implementer circuit breaker pattern for bot execution:

1. Opprett `lib/bot-execution/circuit-breaker.ts`
2. Circuit breaker skal disable bot etter 3 feil på rad
3. Implementer exponential backoff (1 min, 5 min, 15 min) før retry
4. Send email til bruker når bot disables
5. Legg til admin UI for å manuelt re-enable bots

Krav:
- Circuit breaker state lagres i Supabase
- Email template i Resend med norsk og engelsk versjon
- Logging til Sentry ved circuit open
- Dashboard widget i admin panel

Lever kode i lib/bot-execution/ og email templates i lib/email/templates/
```

### Prompt for KLA-106 (Onboarding Wizard)
```
Du er senior React/Next.js utvikler. Implementer onboarding wizard for nye brukere:

1. Opprett `app/(dashboard)/onboarding/page.tsx`
2. 3-stegs wizard:
   - Step 1: Velg trading strategy (pre-populated templates)
   - Step 2: Start paper trading (auto-create demo bot)
   - Step 3: Se første trade (vis live eller simulert data)
3. Wizard skal vises kun for first-time users (check user_metadata)
4. Etter wizard completion, redirect til dashboard med demo bot aktivert

Krav:
- Tailwind CSS v4 styling, mobile-first
- Framer Motion for smooth transitions
- next-intl for norsk/engelsk tekst
- Optimistic UI updates (vis fake trade hvis ingen ekte trades ennå)
- Accessibility: keyboard navigation, screen reader support

Lever kode i app/(dashboard)/onboarding/ og oversettelser i messages/
```

---

## Estimat Totalt

| Prioritet | Antall | Timer | Status |
|-----------|--------|-------|--------|
| P0 Blocker | 4 | 14t | 🔴 Må fikses før test |
| P1 Kritisk | 3 | 11t | 🟠 Påvirker konvertering |
| P2 Viktig | 3 | 9t | 🟡 Kan lanseres uten |
| P3 Teknisk gjeld | 3 | 28t | 🟢 Post-launch |
| **TOTAL** | **13** | **62t** | **~8 arbeidsdager for 1 dev** |

## Neste Steg

1. ✅ Opprett alle issues i Linear (bruk denne filen som mal)
2. ⏳ Fiks alle P0 blokkere (KLA-101 til KLA-104) → Estimat 14 timer
3. ⏳ Kjør manuell test checklist → 1-2 timer
4. ⏳ Fiks bugs funnet i testing → Buffer 4-8 timer
5. ⏳ Fiks P1 kritiske (KLA-105 til KLA-107) → 11 timer
6. ✅ Launch til private beta (10 brukere)
7. ✅ Overvåk i 48 timer, fiks showstoppers
8. ✅ Public launch

## Suksesskriterier for Lansering

- [ ] Alle P0 blokkere er lukket
- [ ] Manuell test checklist 100% grønn
- [ ] Ingen kritiske Sentry errors siste 24 timer
- [ ] Lighthouse score >90 på mobile og desktop
- [ ] Security audit godkjent (ingen high/critical findings)
- [ ] Load test: 100 samtidige brukere uten degradering
- [ ] Backup/restore testet og verifisert
- [ ] Rollback plan dokumentert og testet
- [ ] Incident response team på call første 48 timer

---

**Generert:** 2026-03-09 17:00 CET  
**Versjon:** 1.0  
**Eier:** Tom Jensen  
**Review:** Perplexity Pro (Chief Architect)
