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

## Dybdeanalyse

Analysen nedenfor er basert på offentlig tilgjengelig informasjon: nettsider, app-butikkbeskrivelser, offisielle produktblogger og publiserte UX-case studies. Ingen brukerdata eller innlogging er brukt. Skjermbeskrivelser er typiske eller «som beskrevet i kilder».

### Del A – Per konkurrent (dybde)

Klarpakkes eksplisitte referanser er **Coinbase** og **Robinhood** (prinsipp 9); **Firi** for norsk kontekst; **Revolut** for mikrolæring og lav terskel. Kraken og Bybit inkluderes kort.

---

#### Coinbase

- **Første inntrykk / landing:** Enkel, ren hero; tydelig CTA (registrer/kjøp); tillit fremhevet (sikkerhet, 2FA). Lite komplekse grafer på hovedflaten – tone er tilgjengelig, ikke teknisk.
- **Onboarding:** E-post eller sosiale innlogging, e-postverifikasjon, passord, personopplysninger, SMS, ID-verifikasjon (offentlig ID), alder og statsborgerskap. KYC kan ta minutter til dager. Seedless wallets (nyere) reduserer friksjon ved å logge inn med kun e-post.
- **Nøkkelskjermer:** To lag – enkel kjøp/selg for nybegynnere (én handling per skjerm), Coinbase Pro for erfarne. Saldo og portefølje tydelig; én primær handling per kontekst.
- **Trust og compliance:** Sikkerhet og 2FA tydelig; regulatorisk informasjon tilgjengelig. Bruk av offisielle merkevarer der det er relevant. Aktiveringsutfordringer er dokumentert (mange brukere fullfører ikke første handel) – viser at tillit og tidlig «aha»-øyeblikk er avgjørende.
- **Mobil vs desktop:** Mobil og web tilgjengelig; konsistent opplevelse på tvers av plattformer (bl.a. React Native for mobil).
- **Styrker:** Enkel første handel, tydelig skille enkel/avansert, sterk merkevare og tillit. **Svakheter:** KYC-forsinkelse, kognitiv overbelastning (wallets, gas, nettverk) for noen; mange brukere blir inaktive.
- **Takeaway for Klarpakke:** Behold én enkel handlingssti for nybegynnere; introduser paper/demo tidlig for å redusere «første handel»-terskelen; unngå skjulte gebyrer og uklar kommunikasjon som undergraver tillit.

---

#### Robinhood

- **Første inntrykk / landing:** Tre tydelige CTAs (registrer/logg inn, swipe for info, prøv demo). Demo før registrering – «prøv før du kjøper» reduserer forpliktelse.
- **Onboarding:** Svært kort – rundt 16 klikk og 11 felt; én type informasjon per skjerm. Bankinformasjon utsettes. Proaktiv problemløsning (f.eks. «gratis handel» vs konkurrenters gebyrer, sikkerhet) adresseres underveis.
- **Nøkkelskjermer:** Dashboard med tilpassbare widgets (2024); tydelig portefølje og watchlist. Krypto: oppdatert visuell identitet og onboarding; wallet-metaforer (send/motta). Én primær handling per skjerm.
- **Trust og compliance:** Tydelig CTA-hierarki; demo tilbyr trygg første opplevelse uten personlige data. Gebyrtransparens brukes som tillitssignal.
- **Mobil vs desktop:** App-først; ny opplevelse med widgets og tilpassbar dashboard. Store, tydelige knapper og enkel navigasjon.
- **Styrker:** Minimal friksjon, demo før commit, én ting per skjerm, tydelig verdi (gratis handel). **Svakheter:** Begrenset krypto-uttrekk til eksterne lommebøker i noen markeder; læring kan være tynnere enn hos noen konkurrenter.
- **Takeaway for Klarpakke:** Demo/paper før eller parallelt med registrering; én tydelig CTA per skjerm; bruk «gratis» og transparente priser som tillitssignaler; vurder kort mikrolæring under onboarding.

---

#### Firi (norsk)

- **Første inntrykk / landing:** Enkel, tydelig; fokus på trygghet og rask navigasjon. «Kjøp krypto trygt og enkelt» – tilgjengelig for alle.
- **Onboarding:** Svært rask – typisk to minutter. Registrering via **Vipps** (kontoopplysninger fylles automatisk); deretter **BankID** for identitetsverifikasjon og kundekontroll (hvitvasking). Ingen manuell e-postverifikasjon nødvendig i Vipps-flyten.
- **Nøkkelskjermer:** «Invest» (enkel markedsordre) vs avansert web-handel. Portefølje og fordeling tydelig; rask tilgang til kjøp/salg.
- **Trust og compliance:** BankID som primær 2FA; Vipps for betaling og onboarding. Registrert hos Finanstilsynet som virtuell valuta-børshandler og depotbyder. Kald lagring, Fireblocks MPC, adskilte kundemidler – tydelig kommunisert (sikkerhetssider, brukervilkår). Offisielle logoer (Vipps, BankID) brukes.
- **Mobil vs desktop:** App er hovedkanal; enkel og touch-vennlig. Web for avansert handel.
- **Styrker:** Vipps/BankID gir rask og tillitsvekkende onboarding; tydelig regulatorisk stilling; få, tydelige modi (Invest vs avansert). **Svakheter:** Mindre fokus på eksplisitt «paper/demo» i kommunikasjonen – hovedsakelig ekte handel.
- **Takeaway for Klarpakke:** Bruk Vipps og BankID der det er mulig; fremhev regulatorisk status og sikkerhet (kald lagring, adskilte midler); bruk offisielle logoer for partnere; behold enkel vs avansert modus.

---

#### Revolut

- **Første inntrykk / landing:** Trading innebygd i hovedappen; balanse tydelig på forsiden. Ren, enkel navigasjon; app-only i flere markeder (f.eks. UK).
- **Onboarding:** Lav terskel – handel fra f.eks. £1. Registrering og verifikasjon som del av generell Revolut-flyt; trading er én av flere produkter (kort, betalinger, aksjer, krypto).
- **Nøkkelskjermer:** Balanse og portefølje fremhevet; én primær handling (kjøp/selg/konverter). Kort, Stories-aktig læring – brukere som tar mikroleksjoner handler mer. Integrert med resten av «super-app»-opplevelsen.
- **Trust og compliance:** Tydelig at krypto er custodial (kan ikke sende til eksterne lommebøker i samme grad). Gebyrer varierer med plan (Standard/Premium/Metal). App Store-rangering høy; tillit gjennom kjent merkevare og banking-funksjoner.
- **Mobil vs desktop:** 100 % mobil-først i mange regioner; ingen web-trading der. Touch-optimalisert, store knapper.
- **Styrker:** Lav terskel (£1), mikrolæring som øker konvertering, balanse og én CTA tydelig. **Svakheter:** Begrenset krypto-uttrekk; lite dyp læring sammenlignet med noen konkurrenter.
- **Takeaway for Klarpakke:** Synlig saldo og én primær handling per skjerm; mikrolæring (Stories-aktig) valgfritt men anbefalt; lav minimumsinvestering for første handel; mobil-først layout.

---

#### Kraken (kort dybde)

- **Onboarding og nøkkelskjermer:** Forenklet app med Buy / Sell / Send / Convert; kjøp i tre steg (Trade → Buy → velg krypto, beløp, betalingsmetode → bekreft). Samme logikk for Sell og Convert. Én portefølje-graf; ren terminologi.
- **Trust og mobil:** SOC 2, tydelig sikkerhetsinformasjon; mobil-app for 190+ land og 611+ krypto. Touch-vennlig.
- **Takeaway:** Tre-klikk-kjøp og Buy/Sell/Send-terminologi er direkte anvendbart for Klarpakke.

---

#### Bybit (kort dybde)

- **Paper/demo:** Demo trading med egen bruker-ID og eget API-domene; samme regler som live. Tydelig atskilt fra ekte konto – ingen overraskelser ved bytte.
- **Takeaway:** Klarpakke bør beholde tydelig skille mellom paper og live (farge, label, egen seksjon) og like regler i paper som i live der det er mulig.

---

### Del B – Tema på tvers

- **Onboarding og første handel:** **Lengde** varierer – Firi (Vipps/BankID) og Robinhood (demo + 16 klikk) er blant de raskeste; Coinbase har lengre KYC. **Paper/demo:** Robinhood tilbyr demo før registrering; Bybit har dedikert demo-konto; Coinbase har mindre eksplisitt «paper» i kommunikasjonen. **Språk:** Alle som er analysert sikter mot enkel språkbruk på hovedflaten; sjargong flyttes til avansert modus eller hjelp.
- **Trust-signaler og logoer:** **Plassering:** Footer (Firi, mange fintech), sikkerhetssider, og ved betaling/oppgradering. **Logoer:** Firi bruker offisielle Vipps- og BankID-logoer; Coinbase og Revolut bruker etablerte merkevarer. Generiske ikoner i stedet for partnere svekker tillit – bruk offisielle der det gjelder partnere og betaling.
- **Paper/demo vs live:** **Skille:** Bybit (egen konto/domene), Kraken (tydelige Buy/Sell-tagger), Klarpakke (paper balance + sessions). **Bytte:** Tydelig modusvelger eller egen seksjon; samme regler i paper som i live reduserer overraskelser.
- **Priser og betalingsmur:** **Presentasjon:** Planer med tydelig «mest populær», priser synlige (Wise-stil). **«Oppgrader for live»:** Tydelig lock-ikon eller CTA som forklarer at live krever oppgradering; unngå skjulte krav.
- **Mobil-opplevelse:** **Felles mønstre:** Bottom-navigasjon eller tydelig tab-bar; én kolonne på mobil; store touch-targets (min 44px); saldo og én primær handling øverst. Revolut og Robinhood er app-only eller app-først; Firi og Coinbase har både app og web med mobil-optimalisert app.

---

### Kilder og metode

Dybdeanalysen bygger på offentlige kilder: nettsider (coinbase.com, robinhood.com, firi.com, revolut.com, kraken.com, bybit.com), app-butikkbeskrivelser (App Store, Google Play), offisielle support- og produktblogger (Kraken, Coinbase, Robinhood), og publiserte UX- og aktiveringsanalyser (bl.a. Coinbase activation funnel, Robinhood onboarding). Ingen brukerdata eller innlogging er brukt. Beskrivelser er typiske eller sammendrag fra kildene.

---

## Anbefalinger ut fra produktprinsipper 2026

Se [docs/product-principles-2026.md](docs/product-principles-2026.md) for full kontekst. Kort kobling mellom prinsipper og konkurranseanalysen:

- **Nybegynnere (prinsipp 1):** Ta fra Coinbase/Robinhood: én enkel handlingssti, demo/paper tidlig, én CTA per skjerm. Ta fra Firi: enkel språkbruk og tydelige modi (enkelt vs avansert). Unngå kognitiv overbelastning (sjargong på hovedflaten).
- **75 % mobil (prinsipp 8):** Ta fra Revolut og Robinhood: mobil-først layout, store knapper, synlig saldo øverst. Ta fra Firi: touch-vennlig app og rask navigasjon. Bruk bottom-nav eller tydelig tab-struktur; én kolonne der det er naturlig.
- **Trust og originale logoer (prinsipp 5):** Ta fra Firi: BankID/Vipps og offisielle logoer; tydelig regulatorisk og sikkerhetsinformasjon. Ta fra Coinbase og Wise: tydelig sikkerhet (2FA, transparente priser). Bruk offisielle logoer for Binance, Vipps, BankID og betalingsleverandører – ikke generiske ikoner der tillit er viktig.
- **Betalingsmur (prinsipp 2):** Som andre: tydelig når noe krever oppgradering (lock-ikon, CTA med kort forklaring). Unngå skjulte krav; kommuniser «oppgrader for live» eksplisitt.
- **AI som hovedverdi (prinsipp 7):** Konkurrenter bruker AI mer til tilpasning og assistanse (f.eks. Binance AI UI). Klarpakke skiller seg ved at AI (Market Brief, strategiforklaring, auto-trading) er tydelig hovedverdi – synlig i dashboard, nav og landing, ikke gjemt under «Verktøy».

---

*Sist oppdatert: mars 2026. Kilder: offentlige nettsider, produktblogger og UX-case studies (Binance, Kraken, eToro, Coinbase, TradingView, Firi, Revolut, Bybit, Crypto.com, Wise). Dybdeanalyse: Coinbase, Robinhood, Firi, Revolut (full); Kraken, Bybit (kort).*
