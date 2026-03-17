# Design og funksjonalitet: Konkurrentanalyse 2026

**Formål:** Oversikt over om Klarpakke har en designagent, og hvordan 10 ledende konkurrenter bruker utforming og logikk (UX/UI).

---

## Har vi en designagent?

**Kort svar: Vi har designverktøy og vurderinger, men ingen løpende «designagent» som automatisk vurderer UI.**

| Element | Status | Beskrivelse |
|--------|--------|-------------|
| **Designvurdering** | ✅ | `docs/design-assessment-2026.md` – manuell vurdering av fintech-design, svakheter og prioriteringer |
| **Design-tokens** | ✅ | `src/lib/design/tokens.ts` – BRAND, SURFACE, RADIUS, SHADOW for konsistent styling |
| **Design system-script** | ✅ | `.agent/.shared/ui-ux-pro-max/scripts/design_system.py` – genererer designanbefalinger fra søk (SaaS/dashboard), kan kjøres på bestemte sider |
| **Designer Extension** | ✅ | Webflow Designer Extension (`docs/DESIGNER-EXTENSION-GUIDE.md`) – for Webflow-sider, ikke for Next.js-appen |
| **Automatisk designagent** | ❌ | Ingen agent som kontinuerlig ser på utforming og funksjonalitet i Next.js-appen (f.eks. Lighthouse UX, komponent-audit, konkurranse-benchmark) |

**Anbefaling:** For å få en «designagent» som ser på utforming og funksjonalitet kan du:
1. **Kjøre design-system-scriptet** med input f.eks. «crypto trading dashboard» og «Klarpakke» for anbefalinger.
2. **Legge til en design-/UX-regel** i `.cursor/rules/` som beskriver fintech-best practices og referanse til denne konkurranseanalysen.
3. **Automatisere design-review** i CI (f.eks. Lighthouse UX, axe, eller egen sjekk av tokens/tilgjengelighet) – kan utvides til en slags «designagent» som feiler bygget ved store avvik.

---

## 10 ledende konkurrenter: Utforming og logikk

### 1. Binance
- **Utforming:** AI-drevet tilpasning (2025), tilpassbar forsiden med drag-and-drop widgets, Basic vs Advanced-modus.
- **Logikk:** Tydelig skille nybegynner/avansert; smarte anbefalinger basert på erfaring; regional/kulturell tilpasning (fear/greed, ETF-strøm).
- **Takeaway:** Én merke-farge og tydelig modus (enkel vs avansert) reduserer kognitiv belastning.

### 2. Kraken
- **Utforming:** «Bold, lean, fast» – oppdatert fargepalett og enklere nettopplevelse; én portefølje-graf; knapper Buy / Sell / Send.
- **Logikk:** Færre steg (f.eks. kjøp på tre klikk); progressive disclosure (enkle handlinger fremme, avanserte verktøy tilgjengelig uten å overvelde).
- **Takeaway:** Ren terminologi (Buy/Sell/Send i stedet for Trade/Withdraw) og færre skjermer øker forståelsen.

### 3. eToro
- **Utforming:** Social/copy trading i fokus; Discover-side redesignet mobile-first (2024); mindre scrolling, tydeligere hierarki.
- **Logikk:** Velg trader → se statistikk → tildel beløp → «Copy»; mikro-læring og community fremhevet.
- **Takeaway:** Mobile-first og personlige, datadrevne innholdsopplevelser øker engasjement.

### 4. Coinbase
- **Utforming:** Enkel, ren layout; lite komplekse grafer på hovedflaten; tydelig fokus på tillit og sikkerhet (2FA, informasjon).
- **Logikk:** To lag – enkel kjøp/selg for nybegynnere, Coinbase Pro for erfarne; stegvis onboarding med ID-verifikasjon.
- **Takeaway:** Én enkel handlingssti for nybegynnere og separat avansert modus.

### 5. TradingView
- **Utforming:** Dashboard med faste paneler (markedsoversikt, watchlist, åpne posisjoner, risiko, kalender, ytelse); tilpassbare layout (flere grafer); fargekoding (gul advarsel, rød/grønn for negativ/positiv).
- **Logikk:** Informasjonshierarki – viktigst øverst og størst; redusert støy; konsistent plassering av informasjon; sanntidsdata der det trengs.
- **Takeaway:** For handel/paper trading: tydelige paneler for saldo, posisjoner, PnL og risiko på ett sted.

### 6. Firi (norsk)
- **Utforming:** Enkel, tydelig app; fokus på trygghet og rask navigasjon; portefølje og fordeling vises tydelig.
- **Logikk:** «Invest» (enkel markedsordre) vs avansert web-handel; Vipps/BankID for rask onboarding; integrert skattekalkulator og sparing.
- **Takeaway:** Lokal onboarding (BankID/Vipps) og få, tydelige handlingsmoduser (enkelt vs avansert).

### 7. Revolut
- **Utforming:** Trading inne i hovedappen; balanse tydelig på forsiden; rene linjer og enkel navigasjon.
- **Logikk:** Lav terskel (f.eks. fra £1); læring via korte «Stories»-lignende opplevelser; brukere som tar mikroleksjoner handler mer.
- **Takeaway:** Kort, visuell læring og synlig saldo/portefølje på forsiden støtter beslutninger.

### 8. Bybit
- **Utforming:** Forenklet, reimagined interface; demo trading tydelig skilt fra ekte konto (egen bruker-ID, eget domene).
- **Logikk:** Demo-konto med samme regler som ekte handel, men uten penger; API støtter demo for utviklere.
- **Takeaway:** Paper/demo tydelig atskilt og like regler som live – ingen overraskelser ved bytte.

### 9. Crypto.com
- **Utforming:** Widget-basert, tilpassbar trading-UI (grafer, order book, ordreskjema); raskere lasting og mindre CPU; ny app med bedre søk, «trending», nye tokens, personlig «Earn».
- **Logikk:** Rask bytte mellom mange instrumenter på én side; oppdagelse (trending, nye tokens) og personlige anbefalinger (Earn).
- **Takeaway:** Tilpassbare widgets og tydelig «discovery» (trending, nye lister) øker bruk.

### 10. Wise (fintech-referanse)
- **Utforming:** Enkel, lesbar typografi; tydelig pris og tidsestimat; få distraksjoner; sterkt fokus på tillit (offentlige priser, ingen skjulte kostnader).
- **Logikk:** Én primær handling per skjerm; transparente gebyrer; stegvis flyt uten overveldende valg.
- **Takeaway:** Én tydelig CTA per kontekst og full åpenhet om kostnader/priser bygger tillit.

---

## Felles mønstre (sammendrag)

| Mønster | Eksempler |
|--------|-----------|
| **To modi** | Binance (Basic/Advanced), Coinbase (enkel/Pro), Kraken (enkel/Pro), Firi (Invest/avansert web) |
| **Tydelige primære handlinger** | Kraken (Buy/Sell/Send), Wise (én CTA), Revolut (balanse + handel) |
| **Paper/demo tydelig atskilt** | Bybit (demo egen bruker/domene), Klarpakke (paper balance + sessions) |
| **Dashboard med paneler** | TradingView (posisjoner, risiko, watchlist), Crypto.com (widgets) |
| **Onboarding og tillit** | Coinbase, Firi (BankID/Vipps), Wise (transparent pricing) |
| **Læring integrert** | Revolut (Stories), eToro (community/copy), Klarpakke (akademi, strategier) |
| **Mobile-first / tilpasning** | eToro (Discover), Binance (AI-tilpasning), Crypto.com (lokalisert navigasjon) |

---

## Anbefalinger for Klarpakke

1. **Behold og styrk** tydelig skille mellom lekepenger (paper) og live, og bruk design-tokens konsekvent (som i `design-assessment-2026.md`).
2. **Dashboard/paper-trading:** Tydelige paneler for tilgjengelig saldo, aktive sesjoner og siste handler (i tråd med TradingView/Crypto.com).
3. **Knapper og handlinger:** Én primær CTA per kontekst (f.eks. «Ny sesjon» / «Start første»), med samme stil som resten av appen (#0052FF / tokens).
4. **Designagent-lignende sjekk:** Bruk `design_system.py` med input som «crypto trading dashboard» og «paper trading» for anbefalinger; vurder en Cursor-regel eller CI-sjekk som refererer til denne filen og `design-assessment-2026.md`.

---

*Sist oppdatert: mars 2026. Kilder: offentlige nettsider, produktblogger og UX-case studies (Binance, Kraken, eToro, Coinbase, TradingView, Firi, Revolut, Bybit, Crypto.com, Wise).*
