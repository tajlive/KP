# Neste steg – markedsfører & webdesigner

**Perspektiv:** Konvertering, tillit, tydelig verdi og premium-uttrykk. Basert på landing-audit, design-assessment, konkurranseanalyse og implementeringsplan.

---

## Neste steg – teknisk (Linear mars 2026)

| Id                                                    | Tittel                                                                  | Prioritet |
| ----------------------------------------------------- | ----------------------------------------------------------------------- | --------- |
| [KLA-226](https://linear.app/klarpakke/issue/KLA-226) | Kjør tier-migrering i prod                                              | Urgent    |
| [KLA-227](https://linear.app/klarpakke/issue/KLA-227) | Push DB-lint-fikser (pgcrypto, decrypt_binance_keys, can_follow_leader) | Urgent    |
| [KLA-228](https://linear.app/klarpakke/issue/KLA-228) | TYPE_DEBT: ignoreBuildErrors false + fiks resten                        | High      |
| [KLA-229](https://linear.app/klarpakke/issue/KLA-229) | Regenerer Supabase-typer og reduser as any                              | High      |
| [KLA-230](https://linear.app/klarpakke/issue/KLA-230) | DB lint: profiles/user_profiles (VIEW eller migrering)                  | Medium    |

Kommandoer: `npm run db:migrate-tier` (KLA-226, krever DATABASE_URL i .env.local), `npm run db:push` (KLA-227). Type-check er i CI (pr-check.yml) og passerer lokalt.

**Kjørt 2026-03-18:** Linear-oppgaver opprettet (KLA-226–KLA-230). Tier-migrering: krever DATABASE_URL (ikke satt i denne kjøringen). db:push: remote har migrasjon som ikke finnes lokalt – kjør `supabase migration repair --status reverted 20260313` eller `supabase db pull` for å synkronisere, deretter `npm run db:push`. Type-check: ✅ passerer.

---

## Prioritet 1: Konvertering på landing (markedsføring)

### 1.1 Final CTA før footer

**Hva:** Legg inn `FinalCTASection` (eller tilsvarende) **etter** EmailCapture og **før** footer på forsiden (`src/app/[locale]/page.tsx`).

**Hvorfor:** Sist synlige blokk er i dag e-post-capture uten tydelig «Start gratis»-knapp. En sterk avslutning med «Start din trading-reise» + CTA til paper-trading eller signup øker signup fra brukere som scroller til bunns.

**Konkrett:** Importer og render `<FinalCTASection />` på landing-page. FinalCTASection har allerede «Start gratis nå» → paper-trading og «Se studieplan» → kurs.

---

### 1.2 KLT og 50k premie synlig på forsiden

**Hva:** Gi besøkende én tydelig linje om KLT og premie uten å laste hele priser-seksjonen.

**Hvorfor:** 50 000 KLT til månedens vinner og «10 millioner KLT» er sterk differensiator og driver FOMO – i dag kun på /priser. Et kort strip eller en linje i TrustBar/hero-nærhet gjør at verdien sees før brukeren forlater forsiden.

**Konkrett:**

- Alternativ A: Under hero-CTA, én linje: «Tjen KLT ved å lære. 50 000 KLT til månedens vinner.» med lenke til /paper-trading eller /priser.
- Alternativ B: Utvid TrustBar med en ekstra linje (eller liten badge): «10M KLT · 50k til månedens vinner» med lenke.
- Bruk i18n (f.eks. `landing.kltTeaser` eller `gamification.kltStoryShort`).

---

### 1.3 CTA under testimonials

**Hva:** Legg til én primær knapp under testimonial-kortene: «Start med lekepenger» → paper-trading eller «Bli med» → signup.

**Hvorfor:** Testimonials bygger tillit på et høyt-intent øyeblikk; uten CTA forsvinner momentum. Konkurrenter (Revolut, eToro) kobler sosial bevis direkte til handling.

**Konkrett:** I `Testimonials.tsx`, under «1,200+ users» / rating, legg inn en CTA-knapp med samme stil som hero (tokens/Brand).

---

### 1.4 TrustBar som konverteringsmoment

**Hva:** Gjør TrustBar klikkbar eller legg til en liten knapp: «Bli med» / «Join them» → signup eller paper-trading.

**Hvorfor:** TrustBar viser antall brukere og tillit – men inviterer ikke til handling. En lavterskel lenke øker klikk uten å ødelegge ren «trust»-følelse.

**Konkrett:** I TrustBar, etter trust-icons, legg til en diskret lenke eller ghost-knapp som peker på signup eller paper-trading.

---

## Prioritet 2: Sosialt bevis og leaderboard (markedsføring)

### 2.1 Leaderboard-preview på landing

**Hva:** En liten «Topp 3» eller «Se leaderboard»-teaser på forsiden (ev. under ThreeSteps eller ved Testimonials) med lenke til /leaderboard eller /paper-trading.

**Hvorfor:** Skaper konkurranse-FOMO og kobler «50k KLT til månedens vinner» til noe konkret. Konkurrentene (Bybit WSOT, Crypto.com) bruker leaderboard aktivt i markedsføring.

**Konkrett:** Gjenbruk eksisterende leaderboard-API eller CopyTradingSection-logikk; vis 3 toppnavn (eller anonymisert «Trader 1, 2, 3») + «Se leaderboard» / «Konkurrer om 50k KLT» som lenke.

---

### 2.2 Live-teller og testimonials oppdatert

**Hva:** (Fra implementeringsplan) Sikre at «live-teller» (brukere/studenter) er synlig og oppdatert; vurder ekte eller mer troverdige testimonials-tall (hvis dere har 1,200+ brukere, behold; ellers juster til «X studenter» fra DB eller fjern hardkoding).

**Hvorfor:** Sosialt bevis fungerer bare når det oppleves som ærlig. Design-assessment og konkurranseanalyse understreker tillit (Wise, Firi).

---

## Prioritet 3: Design og premium-uttrykk (webdesign)

### 3.1 Hero med merke-farge #0052FF

**Hva:** Bytt hero-gradient til én merke-farge (#0052FF) med nøktern gradient eller subtil mesh (jf. design-assessment-2026.md).

**Hvorfor:** Nåværende blå/lilla/grønn er «AI-SaaS-generisk». Én sterk merke-farge gir mer særegen, fintech-klang og bedre merkevaregjenkjenning.

**Konkrett:** Oppdater HERO.gradient i tokens eller overstyr i HeroSection til f.eks. `from-[#0052FF] via-[#0047E0] to-slate-900` (eller kun #0052FF + mørk bakgrunn).

---

### 3.2 Priser: Lucide-ikoner i stedet for emojis

**Hva:** Erstatt emoji-ikoner (🎓 📈 🏆 🎯) på priser med Lucide-ikoner (GraduationCap, TrendingUp, Award, Target).

**Hvorfor:** Design-assessment: «Føles uformelt for fintech». Lucide er allerede i bruk; konsistent ikonspråk øker profesjonell følelse.

**Konkrett:** I PriserClient / plan-kort, bytt emoji til `<GraduationCap />` etc. med passende farge/størrelse.

---

### 3.3 Design-tokens konsekvent

**Hva:** Gradvis erstatte hardkodede `slate-900`, `blue-600` osv. på landing og priser med SURFACE, BRAND, CARD fra `tokens.ts`.

**Hvorfor:** Enklere vedlikehold og konsistent uttrykk; design-assessment anbefaler det.

---

## Prioritet 4: Teknisk og innhold

### 4.1 E2E-test for konverteringsflyt

**Hva:** Minst én Playwright-test: landing → klikk CTA (signup eller paper-trading) → at bruker havner på riktig side; ev. paper-trading → opprett session.

**Hvorfor:** Sikrer at CTAs og ruter ikke brytes ved refaktor; gir trygghet ved endringer i nav og lenker.

---

### 4.2 Realtime for trading_sessions

**Hva:** Verifiser at `trading_sessions` er med i Supabase Realtime-publikasjonen slik at session-listen oppdateres uten manuell refresh.

**Hvorfor:** Bedre opplevelse på paper-trading og mindre forvirring («hvorfor ser jeg ikke ny session»).

---

## Kort sjekkliste (rekkefølge)

| #   | Tiltak                                                 | Perspektiv    |
| --- | ------------------------------------------------------ | ------------- |
| 1   | Legg FinalCTASection på landing (før footer)           | Markedsføring |
| 2   | KLT/50k-teaser på forsiden (TrustBar eller under hero) | Markedsføring |
| 3   | CTA under Testimonials (paper-trading eller signup)    | Markedsføring |
| 4   | TrustBar: «Bli med»-lenke til signup/paper-trading     | Markedsføring |
| 5   | Leaderboard-preview (topp 3 + lenke) på landing        | Markedsføring |
| 6   | Hero-gradient til #0052FF / merke-farge                | Webdesign     |
| 7   | Priser: Lucide-ikoner i stedet for emojis              | Webdesign     |
| 8   | Design-tokens på landing/priser                        | Webdesign     |
| 9   | E2E-test: landing CTA → signup/paper-trading           | Teknisk       |
| 10  | Realtime for trading_sessions (verifiser)              | Teknisk       |

---

## Bruk av spesialagenter

- **Explore-agent:** Allerede brukt for landing-audit (se oppsummering over). Kan brukes igjen for å verifisere at FinalCTASection, TrustBar og Testimonials er riktig koblet etter endringer.
- **Design/UX:** For større visuelle endringer (hero, priser) – kjør `.agent/workflows/premium-design-audit.md` eller Cursor-regel `design-ux-premium.md` på de berørte sidene.
- **E2E:** Playwright-tester kan skrives eller utvides med en shell/generalPurpose-agent som kjører `playwright test` og oppdaterer tester for nye CTAs.

---

_Sist oppdatert: mars 2026. Kilder: landing page audit (explore-agent), design-assessment-2026.md, design-konkurranse-analyse-2026.md, implementation-plan-2026.md, ANBEFALINGER-TRADING-OG-UX.md._
