# JokerTrade — Maksimal optimalisering

> **For Hermes:** Implementer dette steg for steg. Hvert steg verifiseres med `curl` + DB-spørring.

**Goal:** Gjøre JokerTrade til den mest lønnsomme AI-auto-traderen for alle 11 brukere.

**Architecture:** 12-agenters CryptoPilot-ensemble med ekte Binance-priser, dynamisk posisjonsstørrelse, og kontinuerlig læring fra resultater. Alle handler loggføres med forklaring. Ingen LLM-tokens i cron — rent skript.

**Tech Stack:** TypeScript, Supabase, Binance Market Data API, Cloudflare Workers

---

## 🔍 Nåværende tilstandsanalyse

| Styrke | Svakhet |
|--------|---------|
| Ekte priser fra Binance ✅ | Minimum order value bug (6.37 < 10 USDT) 🔴 |
| 12 agents stemmer ✅ | Sessions kræsjer etter én trade 🔴 |
| Dynamisk sizing ✅ | Ingen læring fra historiske resultater 🟡 |
| Script-cron (0 tokens) ✅ | Ingen stop-loss på eksisterende posisjoner 🟡 |
| joker_explanation i dashboard ✅ | Ingen A/B-testing av agent-konfig 🟡 |

---

## 🎯 Plan: 5 steg til optimal JokerTrade

### Steg 1: Fiks minimum order value-buggen 🔴

**Problem:** `dynamicPositionPct` kan gi posisjoner under 10 USDT (~73 kr), som avvises av Binance.

**Fix:** Legg til minimums-sjekk i `dynamicPositionPct`:
```typescript
const MIN_ORDER_USDT = 10;
const minPct = (MIN_ORDER_USDT / availableUsdt) * 100;
const pct = Math.max(minPct, BASE_POSITION_PCT * volFactor * confFactor);
```

**Fil:** `src/app/api/jokertrade/route.ts` — `dynamicPositionPct()`

**Verifisering:** `curl POST /api/jokertrade` → handel må ha `total_value >= 10 USDT`

---

### Steg 2: Forhindre at sessions kræsjer 🔴

**Problem:** Etter én handel settes session til `crashed` — trolig pga. DB-trigger som gjør `current_capital` negativt.

**Fix:** 
1. Legg til `GREATEST(current_capital - ..., 0)` i triggeren (allerede gjort, men kanskje ikke deployet riktig)
2. Legg til retry-logikk: hvis session crasher, opprett ny automatisk
3. Minimum kapital-grense: ikke opprett session hvis kapital < 500 kr

**Filer:**
- `src/app/api/jokertrade/route.ts` — `ensureActiveSession()`
- DB-trigger `trigger_update_session_state()`

**Verifisering:** 3 JokerTrade-sykluser på rad → 0 crashed sessions

---

### Steg 3: Legg til stop-loss på åpne posisjoner 🟡

**Problem:** `checkExits` har kun take-profit (+3%). Ingen beskytter mot tap.

**Fix:** Legg til fast stop-loss på −5 % i `checkExits`:
```typescript
if (pnlPct <= -STOP_LOSS_PCT) {
  // Utfør salg med reasonCode: "STOP_LOSS_SELL"
}
```

**Fil:** `src/app/api/jokertrade/route.ts` — `checkExits()`

**Verifisering:** Simuler tapende posisjon → skal selges automatisk

---

### Steg 4: Agent-resultat-læring 🟡

**Problem:** Ensemblet stemmer likt hver gang — ingen agenter lærer av feil.

**Fix:** 
1. Loggfør hver agents stemme + faktisk utfall i `market_intelligence`
2. Vekt agenter basert på historisk treffsikkerhet
3. Fjern agenter som konsekvent taper penger

**Filer:**
- `src/app/api/jokertrade/route.ts` — POST handler
- `src/lib/trading/agents/` — agent-implementasjoner

**Verifisering:** Etter 20 handler → agenter med <40% treffrate får lavere vekt

---

### Steg 5: Performance-dashboard for JokerTrade 🟢

**Problem:** Brukere ser handler men ikke om JokerTrade tjener eller taper penger.

**Fix:** 
1. API: `/api/jokertrade/analytics` — returnerer P&L, win-rate, coins, forklaringer
2. Side: `/dashboard/jokertrade` — grafer + tabell med forklaringer

**Filer:**
- `src/app/api/jokertrade/analytics/route.ts` (ny)
- `src/app/[locale]/(user)/dashboard/jokertrade/page.tsx` (ny)

---

## 📊 Suksesskriterier

| Metrikk | Nå | Mål |
|---------|-----|-----|
| Handler per time | 0–4 (blokkert av bug) | 16+ (4 per 15-min syklus) |
| Krasjede sessions | 2–3 per bruker | 0 |
| Win-rate | Ukjent | >55% |
| Minimum ordre-feil | Ja | Nei |
| Stop-loss | Nei | Ja (−5%) |
| Læring | Nei | Ja (agent-vekting) |
| Dashboard | Nei | Ja |

---

## ⚠️ Risiko

- **Trigger-fiks kan ha sideeffekter** → Test på 1 bruker først, deretter alle
- **Agent-vekting kan overfitte** → Bruk glidende snitt over siste 50 handler, ikke all historikk
- **Dashboard er ny side** → Trenger ny route + i18n + navigasjon
