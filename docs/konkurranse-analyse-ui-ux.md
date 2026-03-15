# Konkurranseanalyse: UI/UX og moderne uttrykk

Kort analyse av hva konkurrenter gjør vs. Klarpakke i dag, og konkrete forbedringsforslag.

---

## Hva konkurrentene gjør (typiske mønstre)

### Trading- og fintech-plattformer (TradingView, eToro, Binance, Revolut)

| Område | Konkurrentpraksis | Klarpakke i dag |
|--------|-------------------|------------------|
| **Visuell hierarki** | Tydelig «hero»-saldo/KPI øverst, deretter sekundær info. Store tall, små labels. | Saldo som liten undertekst under tittel; lite visuell vekt. |
| **Data-densitet** | Dashboards med kort/grid, mikrographs, sparklines, endring i % med farge. | Enkel liste med kort; ingen minigrafer eller sparklines. |
| **Farge og kontrast** | Mørk tema som standard i trading-UI; grønn/rød med god kontrast; accent-farger for CTA. | Lys slate-bakgrunn; enkle badges; lite «trading-følelse». |
| **Bruk av dybde** | Subtil skygge, glass (backdrop-blur), lagdelte kort. | Flat design, enkle borders, lite dybde. |
| **Micro-interactions** | Hover-states, små animasjoner ved statusendring, skeleton loaders. | Enkle hover:shadow; lite bevegelse/feedback. |
| **Empty states** | Illustrasjoner, én tydelig CTA, kort forklaring. | Ikon + tekst + knapp; funksjonelt men kjedelig. |
| **Mobil** | Dedikerte komponenter eller tilpassede views for små skjermer. | Samme liste på mobil; MobileSimulator finnes men opplevelsen er ikke «app-lik». |

### Læringsplattformer (Duolingo, Coursera, Binance Academy)

| Område | Konkurrentpraksis | Klarpakke i dag |
|--------|-------------------|------------------|
| **Fremdrift** | Synlige progress bars, nivåer, badges, streak. | Steg-indikator på onboarding; lite spillifisering på paper trading. |
| **Tillit** | Tydelige «lekepenger»-labels, disclaimer, «Dette er ikke reelle penger». | Banner med tekst; kun tekstmessig. |
| **Tone** | Lett, tydelig, ofte illustrasjoner. | Mer nøktern; få illustrasjoner. |

---

## Hvorfor det oppleves «simpelt» og ikke moderne

1. **Paper trading-siden**
   - Én kolonne med like kort: lite visuell variasjon og hierarki.
   - Saldo er liten undertekst i stedet for et tydelig «KPI-kort».
   - Ingen grafer/sparklines på listen (f.eks. PnL over tid).
   - Status er bare badge; ingen ikoner eller fargekoding som skiller seg tydelig ut.
   - Tom tilstand er minimal (ikon + tekst + knapp).

2. **Generelt uttrykk**
   - Mye flat UI (slate-bakgrunner, enkle borders).
   - Lite bruk av glassmorphism, gradienter eller dybde.
   - Få animasjoner og micro-interactions.
   - Typografi: standard vekter og størrelser; ingen sterke «display»-elementer på tall eller saldo.

3. **Konsistens med «trading»**
   - Trading-apper har ofte mørk modus, tydelig grønn/rød, og «terminal-aktig» følelse.
   - Klarpakke er nærmere en generell SaaS; mindre «trading-dashboard»-følelse.

---

## Anbefalte forbedringer (prioritert)

### Kortsikt (lav terskel)

- **Saldo som KPI-kort**
  - Eget kort øverst: stor font for beløp (f.eks. `text-3xl`), label «Tilgjengelig saldo» eller «Lekepenger».
  - Subtil bakgrunn (f.eks. `bg-gradient` eller `backdrop-blur`) for å skille fra resten.

- **Paper trading-liste**
  - Legg til liten PnL-% med farge (grønn/rød) og evt. liten sparkline eller trend-ikon.
  - Tydeligere status: ikon + badge (f.eks. krasjet = AlertTriangle + rød badge).
  - Hover: litt heving (`hover:-translate-y-0.5`) og skygge.

- **Banner «lekepenger»**
  - Behold tydelig disclaimer, men gjør den mer visuell: ikon, evt. liten illustrasjon eller annen bakgrunn så den ikke bare er en flat stripe.

- **Empty state**
  - Illustrasjon (eller bedre ikon-sammensetning) + én tydelig CTA + én setning som forklarer verdi.

### Mellomlang sikt

- **Mørk modus som standard på trading-deler**
  - Paper trading og dashboard: dark-first (slate-900/950, lyse tekster).
  - Behold lys modus som valg, men la «trading»-følelsen være mørk.

- **Dybde og lag**
  - Glassmorphism på header eller saldo-kort: `bg-white/10 backdrop-blur`, subtil border.
  - Kort med `shadow-lg` og evt. `hover:shadow-xl` for å skille lag.

- **Mikroanimasjoner**
  - Fade-in eller kort slide når sesjoner lastes.
  - Skeleton loaders i stedet for tom eller generisk spinner der det passer.

- **Typografi**
  - Saldo og store tall: tabular numbers, tydelig vekt (font-bold eller font-black), evt. egen display-font.
  - Tydelig skill mellom «label» (small, muted) og «verdi» (stor, sterk).

### Lang sikt

- **Mini-chart / sparkline per sesjon**
  - Vis PnL over tid som liten linje på hvert listekort (kan være forenklet til noen punkter).

- **Dedikert mobil-layout for paper trading**
  - Swipeable cards eller bottom sheet for å starte ny sesjon; større touch-targets og tydeligere CTA.

- **Lite spillifisering**
  - Badge eller liten fremdriftsindikator («Du har handlet X dager», «Første trade»).
  - Tydelig «Dette er lekepenger»-indikator som ikke bare er tekst.

---

## Konklusjon

Konkurrentene skiller seg med **tydelig visuell hierarki** (store tall, KPI-kort), **dyp og «trading»-følelse** (mørk tema, fargekoding, grafer), **dybde og polish** (skygger, glass, små animasjoner) og **tydelige empty states og CTAs**. Klarpakke er i dag mer **funksjonell og flat**; små justeringer (saldo som KPI, bedre liste-kort, hover, tydeligere status og disclaimer) vil gjøre det mer moderne uten full redesign. Deretter er mørk modus på trading-sider og bruk av dybde/glass naturlige neste steg.
