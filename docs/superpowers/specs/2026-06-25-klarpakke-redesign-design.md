# Klarpakke — Edu-fintech redesign: Nordic Trust + Live Accents

**Dato:** 2026-06-25  
**Type:** Designspesifikasjon (brainstorming output)  
**Godkjent retning:** C — Nordic Trust + Live Accents  
**Produkttype:** Opplæringsapp med betalte læringsverktøy + paper trading i samme plattform som live handel  
**Målgruppe:** Komplette nybegynnere, 18+, norsk språk i første versjon  
**Mobilfokus:** 70 % av brukerne er på mobil; desktop støttes parallelt  
**Stack:** Next.js 16.2.9, React 19, TypeScript 5.9, Tailwind v4, Supabase, Cloudflare Workers, Binance API, Stripe, Vipps, Resend

---

## 1. Overordnet visjon

Klarpakke er en **opplæringsplattform** der nybegynnere lærer trading gjennom praktiske oppdrag i paper trading. De betaler for tilgang til læringsverktøy, og kan — etter å ha gjennomført risikokurs — handle med ekte penger via Binance i samme grensesnitt.

Plattformen skal føles:

- **Trygg** — ren, profesjonell estetikk og tydelig risikokommunikasjon
- **Lærerik** — AI-drevet personlig læringssti med praktiske oppdrag
- **Levende** — sanntidsdata, mikro-animasjoner og engasjerende feedback
- **Klar** — intent-based UI der kompleksiteten skjules bak enkelhet

Designretningen er inspirert av Coinbase (tillit), Robinhood (mikro-animasjoner), Polymarket (kortbasert feed) og Kalshi (regulatorisk tydelighet).

---

## 2. Forretningsmodell

### 2.1 Freemium

- **Gratis:** introduksjonskurs + én paper-trade-økt
- **Betalt:** månedlig/årlig abonnement + livstidskjøp
- **Livstid:** all eksisterende og fremtidig innhold for alltid

### 2.2 Betaling

- **Stripe** og **Vipps** (API/MCP ligger klart)
- **Resend** for e-post (påminnelser, kvitteringer, support)

### 2.3 MVP-fokus

Første lansering inneholder:

1. Onboarding
2. Paper trading
3. Betaling

Fullstendige kursmoduler kommer i senere iterasjoner.

---

## 3. Målgruppe og brukerreise

### 3.1 Målgruppe

- Komplette nybegynnere
- 18+ med standard registrering
- Norsk språk i første versjon
- Primært mobilbrukere (70 %)

### 3.2 Hovedflyt

1. **Landingsside** → ser verdiforslag + live markedsdata
2. **Registrering** → 18+, enkel onboarding
3. **Kartlegging** → brukeren velger nivå + kort AI-samtale
4. **Personlig læringssti** → AI genererer oppdrag
5. **Paper trading** → praktiske oppdrag med lekepenger
6. **Risikokurs** → obligatorisk før live trading aktiveres
7. **Live trading** → via Binance i samme grensesnitt

---

## 4. Visuell identitet

### 4.1 Fargepalett

| Rolle | Farge | Bruk |
|---|---|---|
| Mørk bakgrunn | `#0B1220` → `#111827` | Default tema, reduserer øyetretthet |
| Lys bakgrunn | `#F8FAFC` → `#E2E8F0` | Lys modus for onboarding/tillit |
| Positiv/vekst | `#22C55E` | Positive trender, PNL, fullførte oppdrag |
| Negativ/risko | `#EF4444` | Tap, advarsler, risikomerking |
| AI/primary | `#3B82F6` | AI-insights, primærhandlinger |
| Live/dopamin | `#F59E0B` | Pulserende priser, badges, oppmerksomhet |
| Læring | `#A855F7` | Kurs, sertifikater, pedagogisk innhold |

**Regel:** Rød/grønn skal aldri stå alene. Alltid kombinere med ikon og tekst for fargeblinde.

### 4.2 Typografi

- **Skrift:** Inter eller Geist
- **Tall:** `font-variant-numeric: tabular-nums` for priser og PNL
- **Skala:** 12 / 14 / 16 / 20 / 24 / 32 / 40 px
- **Hierarki:** Maks 3 synlige nivåer samtidig på mobil

### 4.3 Avstander og touch-mål

- Primærknapp: minst 48 × 48 px
- Kort-padding: 16–20 px
- Seksjonsavstand: 32–48 px
- Komplekse handlinger: bottom sheets, ikke nye sider

---

## 5. Landingsside

### 5.1 Formål

Konvertere besøkende til registrering ved å kommunisere:

- **Hva:** Lær trading med lekepenger
- **Hvorfor:** Samme plattform som live handel, drevet av AI
- **Hvordan:** Gratis intro + én paper-trade-økt

### 5.2 Struktur

1. **Header:** Logo + Logg inn + Meny
2. **Hero:** "Lær å handle med AI — risikofritt med lekepenger"
3. **Live market strip:** Horisontalt scrollebare kort med pris, 24t-endring og sparkline
4. **Demo-widget:** Paper-trading-simulering med tidsramme-velger
5. **Sosialt bevis:** "X brukere øver denne uken", trust badges
6. **Tydelig CTA:** "Start gratis paper-trade-økt"

### 5.3 Prinsipper

- Verdi kommuniseres innen 3 sekunder.
- Live data skal føles ekte, ikke pynt.
- Demo-widgeten skal la brukeren teste uten registrering.

---

## 6. Onboarding

### 6.1 Prinsipper

- Kan hoppes over, men brukeren får en anbefalt vei.
- Kartlegging via kort AI-samtale + selvvalgt nivå.
- Maks 2–3 minutter for den anbefalte stien.

### 6.2 Steg

1. **Registrering** (e-post/passord eller Google)
2. **Aldersbekreftelse** (18+)
3. **Kartleggingssamtale** med AI-coach
4. **Nivåvalg** (nybegynner / middels / ekspert)
5. **Personlig læringssti** genereres
6. **Første paper-trade-økt** starter

---

## 7. Læring og læringssti

### 7.1 AI-genererte oppdrag

- Hovedinnholdet er praktiske oppdrag i paper trading.
- AI genererer oppdrag basert på brukerens nivå, mål og fremgang.
- Risikopåvirkende innhold må godkjennes av menneske før publisering.

### 7.2 Eksempler på oppdrag

- "Fullfør din første kjøpsordre i paper trading"
- "Prøv en AI-strategi og forklar hvorfor den valgte å selge"
- "Handle gjennom en volatil periode uten å tape mer enn 5 %"

### 7.3 Personalisering

AI tilpasser veien basert på:

- Quiz-resultater
- Fullførte oppdrag
- Paper-trading-resultater
- Tid brukt og engasjement
- Brukerens justerte fokusområde

### 7.4 Belønning

- **Badges** i appen for fullførte oppdrag og milepæler
- **Digitale sertifikater** for fullførte nivåer
- Sertifikater før live trading aktiveres

---

## 8. Paper trading

### 8.1 Regler

- Fast startbeløp i lekepenger for alle brukere
- Identiske strategier og markedsdata som live trading (Binance API)
- Nullstilling kun etter fullført kurs/oppdrag

### 8.2 UI

- Samme grensesnitt som live trading
- Tydelig "Paper Trading"-badge øverst
- PNL, portefølje og historikk på samme måte

### 8.3 Læringsintegrasjon

- Hvert oppdrag gir umiddelbar feedback.
- AI forklarer hva som skjedde og hva man kan lære.
- Brukeren må fullføre risikokurs før live trading låses opp.

---

## 9. Live trading

### 9.1 Aktivering

- Kun etter obligatorisk risikokurs
- Registrerings-disclaimer
- Kontekstuelle advarsler i appen
- Tydelig skille fra paper trading

### 9.2 Handelsflyt

1. **Intent:** Bruker velger mål (f.eks. "BTC oppgang")
2. **AI-forslag:** Strategi, risikobadge, simulert utfall
3. **Review:** Bottom sheet med detaljer, avgifter, maks tap
4. **Confirm:** Tydelig bekreftelsesknapp (ikke one-tap)
5. **Undo:** 3–5 sekunders angremulighet
6. **Success:** Haptisk feedback + animert bekreftelse

### 9.3 Integrasjon

- Binance API eksisterer allerede
- Alle ordrer valideres server-side
- Idempotente bestillinger for å unngå dobbeltkjøp

---

## 10. Mobilnavigasjon

- **Bottom nav** med 4–5 faner: Oversikt, Oppdrag, Marked, Portefølje, Profil
- **Sentral quick-action-knapp** for "Nytt paper trade / AI-signal"
- **Swipe-gester** mellom hovedfaner (fase 2/3)
- **Top bar:** Avatar, balanse, varselsikon

---

## 11. Dashboard / Oversikt

### 11.1 Layout

Kortbasert, scrolle-vennlig:

- **Øverst:** Nåværende nivå + neste oppdrag
- **Læringsfremgang:** Progress bar mot neste sertifikat
- **Paper-trading-sammendrag:** Total verdi + dagens PNL
- **Portfolio-chart:** Enkel linjegraf (custom SVG/canvas)
- **AI-coach:** Kort tips / neste anbefaling

### 11.2 Oppførsel

- Throttling av live data (maks 1 Hz på mobil)
- Skeleton loaders i appens fargepalett
- `aria-live="polite"` for prisoppdateringer

---

## 12. Bevegelse og mikro-interaksjoner

- **Rullende tall** på priser (teller-animasjon)
- **Pulserende "live"-indikatorer**
- **Scroll-reveal** på kort (0.2s ease-out)
- **Skeleton loaders** i egen palett
- **Success-check** ved fullført oppdrag/handél
- **Respekt for `prefers-reduced-motion`**

---

## 13. Gamification (MVP-fase 2/3)

> **⚠️ Krever juridisk/compliance-godkjenning før implementering.**

- **Badges:** "Første paper trade", "7 dager på rad", "Risikokurs fullført"
- **Sertifikater:** Digitale bevis for fullførte nivåer
- **Progressjon:** Nivåer som låser opp nye oppdrag
- **Streaks:** Daglig pålogging/oppdrag (med opt-out)
- **Ingen offentlige leaderboards eller sosiale grupper i MVP**

---

## 14. Tillit, risiko og compliance

- **Risikobadger** ved hver strategi (lav / medium / høy)
- **Tydelig "Hva kan jeg tape?"** forhåndsvisning
- **Progressive disclosure:** avanserte valg skjult bak "Vis mer"
- **Obligatorisk risikokurs** før live trading
- **Disclaimer** ved registrering og før første live trade
- **Kontekstuelle advarsler:** "Husk: de fleste taper penger på daytrading"
- **Sikkerhets-UX:** tydelige permissionscopes, idempotente bestillinger, rate limiting
- **AI-generert innhold:** menneskelig review for alt som påvirker risiko

---

## 15. Varsler og support

### 15.1 Varsler

- Push-varsler og e-post med granulære innstillinger
- Påminnelser om oppdrag
- Viktige markedsoppdateringer
- Fullførelser og sertifikater

### 15.2 Support

- AI-chatbot først
- Eskalering til e-post-support (Resend)

---

## 16. Admin-/lærerdashboard

Omfattende dashboard fra dag én:

- Brukeroversikt og fremgang
- Fullførelsesrater per oppdrag/nivå
- Inntekter og abonnementsstatus (Stripe/Vipps)
- AI-generert innhold — godkjenning av risikopåvirkende oppdrag
- Supporthenvendelser

---

## 17. Tekniske føringer

- **Mørk/lys modus:** Tailwind v4-tokens
- **Charts:** Custom SVG/canvas for sparklines og dashboard; Recharts kun for statiske demo-widgets
- **Animasjoner:** CSS transforms/keyframes først; Framer Motion sparsomt
- **Sanntid:** Start med cached snapshot (30–60s), gå til SSE/Realtime bare etter ytelsestesting
- **Performance-budsjett:** < 150 kB kritisk JS på landing, < 250 kB på dashboard
- **Tilgjengelighet:** WCAG 2.1 AA, farge-uavhengige indikatorer, reduced-motion

---

## 18. Faser

### Fase 1 — Design system + landingsside + onboarding

- Design tokens og komponentbibliotek
- Landingsside med gratis paper-trade-økt
- Registrering, kartlegging og personlig læringssti

### Fase 2 — Paper trading + betaling

- Paper-trading-grensesnitt identisk med live
- AI-genererte oppdrag
- Stripe + Vipps-betaling
- Badges og sertifikater

### Fase 3 — Live trading + liveliness

- Risikokurs og live trading-aktivering
- Motion polish
- Avanserte varsler
- Admin-dashboard-forbedringer

### Fase 4 — Kursmoduler og skalering

- Fullstendige kursmoduler
- Sosiale funksjoner (hvis ønskelig etter juridisk review)
- Flerspråklighet

---

## 19. Risikoer og avveininger

| Risiko | Tiltak |
|---|---|
| Recharts øker bundle-størrelse | Bruk custom SVG/canvas for live charts |
| Sanntidsdata tømmer batteri | Throttling, snapshot først, opt-in real-time |
| One-tap handel fører til feil | Review + confirm + undo, ikke one-tap |
| Gamification kan bryte regelverk | Juridisk review før bygg |
| AI-genererer feil læringsinnhold | Menneskelig review for risikopåvirkende innhold |
| Brukere forveksler paper og live | Tydelig badge, separat fargekoding, risikokurs |
| Bevegelse kan øke layout thrash | CSS-animasjoner, `will-change` sparsomt |

---

## 20. Suksesskriterier (første 3 måneder)

- **Konvertering fra gratis til betalt:** primært mål
- **Lighthouse mobile score ≥ 90** på landingsside
- **Time-to-first-paper-trade** redusert med 30 %
- **Fullføringsrate** av onboarding ≥ 70 %
- **Ingen WCAG 2.1 AA-brudd**
- **0 alvorlige hendelser** der paper/live forveksles

---

*Godkjent for å gå videre til implementeringsplan.*
