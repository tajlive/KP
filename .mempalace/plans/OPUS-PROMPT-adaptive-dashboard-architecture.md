# Claude Opus Prompt — Adaptive Dashboard Architecture for Klarpakke

**Bruk:** Lim inn i Claude Desktop (uten MCP-verktøy — ren tekst-modus)  
**Mål:** Få en arkitektur-skisse for adaptivt dashboard + AI-innsikt som KIMI så implementerer  
**Forventet output:** ~2000-4000 ord strukturert dokument (ikke kode — konsepter, dataflyt, state-machine, komponent-hierarki)

---

## PROMPT (lim inn i Claude Desktop)

```
You are an elite fintech UI/UX architect. I need you to design the architecture for an adaptive trading dashboard for "Klarpakke" — a Norwegian AI trading platform.

## Context

**Current state:**
- Next.js 15, React 19, TypeScript 5.9, Tailwind, Supabase PostgreSQL
- Dashboard currently shows: hero (balance + P&L), 3 stat cards (total return, win rate, balance), portfolio chart (Recharts), upgrade banner, gamification widgets, copy-trading preview, live trade feed
- ALL users see identical dashboard — new users and experienced traders get the same 12+ component stack
- Mobile is 40% complete (core hooks/components exist, but not integrated into dashboard/trading pages)
- Backend: PostgreSQL RPC for metrics aggregation, Supabase Realtime, Upstash Redis cache (5min TTL), rate limiting

**Verified user data point (for context):**
- User: tomarnejensen@gmail.com
- 12 paper trades, 71k NOK P&L, win rate ~42%
- Total capital: ~100.6M NOK, starting capital: ~100.56M NOK

**Existing plans (NOT yet implemented):**
- Dashboard redesign: remove dead code, CMS-driven content, SmartActions row, non-blocking upgrade banner
- Mobile modernization: BottomTabs v2, MobileTradingCard, SwipeAction, MobileBottomSheet — but not integrated

## What I need from you

Design an **adaptive dashboard architecture** that serves different experiences based on user state. Do NOT write implementation code — focus on:

1. **User state machine** — What states exist? How do users transition between them? What data determines state?
   - Examples: FirstVisit, OnboardingIncomplete, PaperNoTrades, PaperActive, LiveNoTrades, LiveActive, Inactive7Days, Inactive30Days, ChurnRisk

2. **Dashboard layout per state** — For each state, what components render? What's the visual hierarchy (primary CTA vs supporting info)?
   - Desktop layout (grid structure)
   - Mobile layout (stack/scroll structure)

3. **Data requirements per state** — What backend data is needed? Can it be fetched server-side? What requires client-side realtime?

4. **AI insight integration points** — Where does AI-generated insight fit?
   - "What does this mean?" buttons on stat cards
   - Predictive alerts ("23% probability of >10% drawdown")
   - Natural language query (chat bubble: "How did I do last week?")
   - Daily/weekly summary push notifications
   - Architecture: Should this be rule-based first or LLM-based from start?

5. **Progressive disclosure strategy** — How do we avoid overwhelming new users while not boring experienced ones?
   - What shows by default? What's behind "See more"?
   - How does the UI learn from user behavior?

6. **Mobile-specific considerations** — How does the adaptive logic change on mobile? What gestures/interactions make sense?

7. **Analytics/tracking requirements** — What events should we track to measure if the adaptive dashboard works?

## Constraints
- Must work with existing stack (Next.js App Router, Supabase, Tailwind)
- Must support Norwegian (no) and English (en) via next-intl
- Must be WCAG 2.2 AA accessible
- Must degrade gracefully if AI service is unavailable
- No breaking changes to existing database schema (can add views/functions, not alter tables)

## Output format

Provide your response as a structured architecture document with:
- Clear section headers
- Diagrams described in ASCII or text (not required to be pretty)
- Decision rationale (why A over B)
- Risk assessment for each major decision
- "Implementation readiness" score (1-10) for each component

Do NOT write React/TypeScript code — KIMI CLI (another agent) will handle implementation. Focus on architecture, data flow, and design decisions.
```

---

## INSTRUKSJONER TIL DEG (Tomar)

### Steg 1: Åpne Claude Desktop
- Start Claude Desktop-appen
- Start en **ny chat** (for ren kontekst)

### Steg 2: Lim inn prompten
- Kopier alt mellom ` ``` ` over
- Lim inn i Claude
- Vent på svar (Opus er treg, 30-60 sekunder)

### Steg 3: Følg opp-spørsmål (valgfritt men anbefalt)

Etter første svar, still gjerne:

```
Now go deeper on [specific section]. What are the edge cases? What would break this?
```

Eller:

```
Compare two approaches: [A] vs [B]. What are the trade-offs for a startup with limited dev resources?
```

Eller:

```
What would a minimum viable version of this look like? What can we cut for v1?
```

### Steg 4: Del resultatet med KIMI

Når du er fornøyd:
1. Kopier hele samtalen (eller de beste delene)
2. Kom tilbake til KIMI CLI
3. Si: "Her er Opus' arkitektur — implementer Fase X"
4. KIMI vil lese arkitekturen og produsere kode + tester + deploy

---

## FORVENTET KVALITET

Opus er spesielt sterk på:
- ✅ Komplekse state-machines med edge-case-analyse
- ✅ Trade-off-analyse mellom arkitektur-valg
- ✅ Data-modellering og flyt-diagrammer
- ✅ "Hva kan gå galt?"-tenkning

Opus er IKKE sterk på:
- ❌ Å vite KlarpakkE-spesifikke filnavn eller kode-konvensjoner
- ❌ Å produsere produksjonsklar kode (det gjør KIMI)

---

**Skrevet:** 2026-04-26  
**For:** Claude Opus (via Claude Desktop)  
**Neste steg etter dette:** KIMI CLI implementerer basert på Opus' arkitektur
