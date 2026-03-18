# Anbefalinger – trading og UX

Korte, prioriterte anbefalinger etter «én trading-side» og design/routing-sjekk.

---

## Høy prioritet

### 1. i18n for trading-UI

- **«Mine sesjoner»** og «Tilbake til oversikt» er hardkodet i `PaperTradingPageClient` og `UnifiedTradingDashboard`. Legg i `paperTrading` eller `trading`-namespace og bruk `useTranslations`/`getTranslations` slik at norsk/engelsk (og ev. th/zh) er konsistente.
- Ev. egne nøkler for «Øving» / «Live» hvis de brukes flere steder.

### 2. Realtime for session-listen

- `PaperTradingList` abonnerer på `trading_sessions`. Sjekk at `trading_sessions` er med i Supabase Realtime-publikasjonen, slik at nye/oppdaterte sessions vises uten manuell refresh (jf. PAPER-TRADING-ANALYSE.md).

### 3. E2E / smoke-test for trading-flyt

- Minst én Playwright-test: Handle → `/paper-trading`, bytt paper/live, åpne «Mine sesjoner», ev. opprette session og åpne session-detalj. Verifiser at ingen lenker går til `/live-trading/[id]` og at tier-gate (live) kan testes.

---

## Medium prioritet

### 4. Live-sessions i «Mine sesjoner» (valgfritt)

- I dag viser `?view=sessions` kun **paper**-sessions (server henter bare paper). Ved `?mode=live` vises rød banner men samme liste. Alternativ: hent også live-sessions når `mode=live` (f.eks. client-fetch eller server som leser searchParams) og vis to faner eller én filtrert liste, slik at «Mine sesjoner» i live-kontekst viser live-sessions.

### 5. «Tilbake til dashboard» på trading-siden

- Paper-trading har egen layout uten sidebar. Tydelig lenke «Tilbake til dashboard» (f.eks. i header eller over «Mine sesjoner») gjør navigasjon tydelig for brukere som kommer fra Handle.

### 6. Beta-lenker

- Portfolio-siden lenker til `/${locale}/beta/live-trading`. Når beta flyttes inn i ordinær flyt, bytt til `/${locale}/paper-trading?mode=live` (ev. behold beta-rute inntil beta fjernes – da oppdater lenkene).

---

## Lav prioritet

### 7. Design-tokens overalt

- Noen dashboard-komponenter (PaperTradingCard, AutoTradingConfigCard, m.fl.) bruker fortsatt hardkodede `bg-slate-900` / `border-slate-800`. Gradvis erstatte med `SURFACE`/`CARD` fra `tokens.ts` for enhetlig vedlikehold (jf. design-assessment-2026.md).

### 8. Uinnlogget teaser

- `/paper-trading` har allerede teaser for uinnloggede (ikke bare redirect). Kan strammes inn med tydeligere CTA og ev. kort forklaring på «100k virtuell kapital» (allerede nevnt i analysen).

### 9. Tier-gate ved åpning av live-session

- I dag gates `?mode=live` på URL. Åpning av en **live**-session på `/paper-trading/[id]` uten `?mode=live` i URL sjekkes ikke i middleware (kun path + query). Valgfritt: gate også når `session.mode === 'live'` (krever at middleware eller side henter session – tyngre; alternativt client-side sjekk og redirect til priser).

---

## Oppsummert

| Prioritet | Tiltak                                                           |
| --------- | ---------------------------------------------------------------- |
| Høy       | i18n for «Mine sesjoner», «Tilbake til oversikt», ev. Øving/Live |
| Høy       | Verifiser Realtime for `trading_sessions`                        |
| Høy       | E2E/smoke-test for trading-ruter og tier-gate                    |
| Medium    | Vurder live-sessions i «Mine sesjoner» ved mode=live             |
| Medium    | Tydelig «Tilbake til dashboard» på trading-siden                 |
| Medium    | Oppdater beta-lenker når beta flyttes                            |
| Lav       | Flere komponenter på design-tokens                               |
| Lav       | Finpuss på uinnlogget teaser                                     |
| Lav       | Valgfritt: tier-sjekk ved åpning av live-session uten ?mode=live |
