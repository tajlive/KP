# Tradeoppsett Analyse — Pre-Live Trading Plan

> **For Hermes:** Bruk subagent-driven-development skill for å implementere denne planen oppgave-for-oppgave.

**Mål:** Full analyse av alle trade-oppsett før vi aktiverer ekte penger. Ingen live trading før alt er verifisert.

**Arkitektur:** Gjennomgang av alle komponenter — API, sikkerhet, grid-logikk, feilhåndtering, overvåkning.

**Tech Stack:** Kraken API, Supabase, Cloudflare Workers, Next.js 16.

---

## Kritiske spørsmål å besvare

| Spørsmål | Status | Risiko |
|----------|--------|--------|
| Hvor lagres API-nøkler? | ✅ Kryptert i DB | Lav |
| Hva hvis Kraken API feiler? | ⚠️ Ukjent | Høy |
| Hva hvis grid går i minus? | ⚠️ Ukjent | Høy |
| Hva hvis bruker dobbeltklikker? | ⚠️ Ukjent | Middels |
| Hva hvis cron feiler? | ⚠️ Ukjent | Middels |
| Hvordan stopper vi alt? | ❌ Ikke implementert | Kritisk |

---

## Task 1: API-sikkerhet

**Objective:** Verifiser at API-nøkler er 100% sikre.

**Files:**
- Read: `src/lib/exchanges/kraken/client.ts`
- Read: `src/lib/crypto/encrypt-api-keys.ts`
- Read: `src/app/api/kraken/connect/route.ts`

**Sjekkpunkter:**
- [ ] API-nøkler krypteres før lagring
- [ ] Ingen logging av nøkler
- [ ] RLS policies riktig konfigurert
- [ ] Service role har minimal tilgang
- [ ] Decrypt kun når nødvendig

---

## Task 2: Grid-logikk verifisering

**Objective:** Test grid-strategi grundig før live.

**Files:**
- Read: `src/lib/trading/kraken-grid.ts`
- Read: `src/app/api/kraken/grid/start/route.ts`
- Create: `src/lib/trading/kraken-grid.test.ts`

**Test-scenarioer:**
1. Grid initialiseres korrekt
2. Ordre plasseres riktig
3. Fylte ordre håndteres
4. Motsatt ordre plasseres
5. Grid kanselleres trygt
6. Hva ved nettverksfeil?
7. Hva ved insufficient balance?
8. Hva ved rate limit?

---

## Task 3: Feilhåndtering

**Objective:** Alle feil håndteres — ingen crash.

**Files:**
- Modify: `src/lib/exchanges/kraken/client.ts`
- Modify: `src/lib/trading/kraken-grid.ts`
- Modify: `src/app/api/kraken/auto-convert/route.ts`

**Feil å håndtere:**
- Nettverksfeil (timeout, DNS, 5xx)
- Rate limits (429)
- Invalid API keys (401)
- Insufficient balance (400)
- Invalid symbol (400)
- Kraken maintenance (503)

---

## Task 4: Overvåkning og alarmer

**Objective:** Vi vet når noe går galt — før brukeren merker det.

**Files:**
- Create: `src/lib/monitoring/kraken-health.ts`
- Modify: `src/app/api/health/route.ts`

**Overvåk:**
- API-kall suksessrate
- Grid-ordre status
- Balanse endringer
- Feilrate per bruker
- Konverteringer fullført/feilet

---

## Task 5: Nødstopp (kill switch)

**Objective:** En knapp som stopper ALT — umiddelbart.

**Files:**
- Create: `src/app/api/admin/kill-switch/route.ts`
- Create: `src/features/admin/KillSwitchButton.tsx`

**Funksjon:**
- Kanseller alle åpne ordre
- Stopp alle grid-sesjoner
- Stopp auto-reinvestering
- Varsle admin
- Logg alt

---

## Task 6: Bruker-beskyttelse

**Objective:** Brukere kan ikke skade seg selv.

**Files:**
- Modify: `src/app/api/kraken/grid/start/route.ts`
- Modify: `src/features/onboarding/KrakenConnect.tsx`

**Beskyttelse:**
- Maks kapital per bruker
- Maks antall grid-sesjoner
- Minimum innskudd
- Advarsel før live trading
- Bekreftelse på risiko

---

## Task 7: Testing (TDD)

**Objective:** Alt testet før live.

**Files:**
- Create: `src/lib/trading/kraken-grid.test.ts`
- Create: `src/lib/exchanges/kraken/__tests__/integration.test.ts`
- Create: `src/app/api/kraken/__tests__/e2e.test.ts`

**Test-dekning:**
- Unit: Grid-logikk
- Integration: Kraken API
- E2E: Hele flyten
- Edge cases: Feil, nettverk, rate limits

---

## Task 8: Dokumentasjon

**Objective:** Alt dokumentert for fremtidig drift.

**Files:**
- Create: `docs/kraken-live-trading-runbook.md`
- Update: `AGENTS.md`

**Innhold:**
- Arkitektur-diagram
- Feilsøking-guide
- Kontaktinfo (Kraken, etc.)
- Nød-prosedyrer
- Overvåkning-dashboard

---

## Risiko-matrise

| Risiko | Sannsynlighet | Konsekvens | Tiltak |
|--------|-------------|------------|--------|
| API-nøkkel lekkasje | Lav | Kritisk | Kryptering, RLS |
| Grid-crash | Middels | Høy | Kill switch |
| Nettverksfeil | Høy | Middels | Retry, backoff |
| Rate limit | Middels | Middels | Queue, delay |
| Bruker-feil | Høy | Lav | Beskyttelse, advarsler |

---

## Åpne spørsmål

1. **Maks kapital per bruker?** (Forslag: €1000)
2. **Maks grid-sesjoner?** (Forslag: 3)
3. **Minimum innskudd?** (Forslag: €10)
4. **Auto-reinvest threshold?** (Forslag: €10)
5. **Hvem har kill-switch tilgang?** (Forslag: Kun admin)

---

## Neste steg

| Valg | Handling |
|------|----------|
| **A** | Start med Task 1 (API-sikkerhet) |
| **B** | Start med Task 5 (Kill switch) — høyest risiko |
| **C** | Alle parallelt med subagenter |

**Hva prioriterer vi?**
