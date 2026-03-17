# Design og UX – premium uttrykk og vurdering

**Produktretning:** Se `docs/product-principles-2026.md` (målgruppe nybegynnere, 75 % mobil, Coinbase/Robinhood-følelse, AI som hovedverdi).

Ved UI/design-oppgaver eller når bruker ber om design-audit / premium-vurdering av sider og knapper: ta på deg rollen som **Ledende UX-spesialist for SaaS** og følg sjekklisten i `.agent/agents/ux-saas-lead.md`. Les de påkrevde dokumentene som er listet der. For systematisk audit på tvers av alle sider: følg `.agent/workflows/premium-design-audit.md`.

## Mål: Se dyrt ut, ikke «enkelt»

- **Design skal oppleves premium og dyrt** – som ledende fintech (Firi, Revolut, Kraken, Wise-nivå). Unngå billig, generisk eller «bare enkelt»-uttrykk.
- Bruk **design-tokens** fra `src/lib/design/tokens.ts` (BRAND, SURFACE, RADIUS, SHADOW, CARD) overalt. Unngå ad-hoc hex eller Tailwind-klasser som bryter konsistens.
- **Typografi:** Behold Fraunces (display) og Lexend (body). Ikke generisk Inter/Roboto.
- **Mørkt tema:** slate-950, #0F1118, mørke kort – bruk konsekvent. For lys modus: nøktern, hvit/slate med tydelig hierarki.
- **Premium-signaler:** Lucide-ikoner (ikke emojis) på priser og CTA; én sterk merke-farge (#0052FF eller tokens); subtil glass/skygge (bg-white/5, border, blur) og korte overganger (200–300 ms) på interaktive elementer.
- **Datavisning:** `tabular-nums` på alle tall; tydelig hover på rader; tydelig hierarki – viktigst øverst og størst.

## Påkrevd vurdering mot dokumentasjon

Ved **alle** endringer som berører UI, layout, knapper, kort, farger eller brukerflyt:

1. **Les og vurder mot:**
   - **`docs/design-assessment-2026.md`** – svakheter, prioriteringer (emoji → Lucide, hero merke-farge, tokens konsekvent, tabeller, glass/skygge).
   - **`docs/design-konkurranse-analyse-2026.md`** – konkurrentmønstre (to modi enkel/avansert, tydelige primærknapper, dashboard-paneler, paper/demo atskilt, onboarding/tillit).

2. **Sjekk at:**
   - Utforming ikke blir «bare enkel» på bekostning av premium-følelse.
   - Logikk og flyt følger mønstre fra konkurranseanalysen (én primær CTA per kontekst, tydelige handlinger, konsistent plassering).
   - Nye sider/komponenter bruker tokens og samme kort-/knappestil som resten av appen.

3. **Unngå:**
   - Emojis som ikoner i fintech-kontekst (bruk Lucide).
   - Generisk AI/SaaS-gradient (blå/lilla/grønn) uten merke-farge; foretrekk #0052FF eller tokens.
   - Flate, stusselige kort uten skygge/border/glass som ser billige ut.

## Korte referanser

- Designvurdering og prioriteringer: `docs/design-assessment-2026.md`
- Konkurrenter og mønstre: `docs/design-konkurranse-analyse-2026.md`
- Tokens og merke-stil: `src/lib/design/tokens.ts`
