# Handelsanalyse — Slik forstår du resultatene dine

> **For hvem:** Alle Klarpakke-brukere som bruker auto-trading eller paper trading.  
> **Mål:** Hjelpe deg å forstå *hvorfor* resultatene dine er som de er, og *hva du kan gjøre* for å forbedre dem.

---

## Oversikt over 7 analyseområder

Vi analyserer kontinuerlig alle handler du gjør gjennom Klarpakke. Systemet sjekker 7 områder som påvirker din avkastning. Tenk på det som en "helsesjekk" for tradingen din.

| # | Analyse | Hva sjekker den? | Hvorfor bryr du deg? |
|---|---------|------------------|----------------------|
| 1 | **Transaksjonskostnader (TCA)** | Spread, slippage, gebyrer | Usynlige kostnader spiser avkastning |
| 2 | **Backtest vs Live** | Avvik mellom simulering og virkelighet | Sjekker om strategien fungerer i praksis |
| 3 | **Fyllingsgrad** | Om ordren ble helt fylt | Delvise fyllinger koster deg penger |
| 4 | **Signalforfall** | Hvor raskt du handler | Signaler blir dårligere med tiden |
| 5 | **Ugunstig seleksjon** | Om du handler "feil vei" | Kan tyde på at andre vet noe du ikke vet |
| 6 | **Gevinst/tap-oppsplitting** | Hvor kommer pengene fra | Forstå hva som er dyktighet vs flaks |
| 7 | **Markedspåvirkning** | Om dine handler beveger markedet | Store handler kan påvirke prisen |

---

## 1. Transaksjonskostnader (TCA)

### Hva er det?
Hver gang du handler, betaler du små kostnader du kanskje ikke legger merke til:

- **Spread:** Forskjellen mellom kjøps- og salgspris. Børsen tjener på dette.
- **Slippage:** Du ønsket å kjøpe til 650 000, men fikk 650 130. Forskjellen er slippage.
- **Gebyrer:** Børsen tar en liten prosent av hver handel.
- **Latency:** Tid brukt fra boten ser et signal til handelen er utført.

### Eksempel
Du handler for 10 000 kr. Spread er 0.1%, slippage 0.05%, og gebyr 0.1%. Totalt: **25 kr** (0.25%) i usynlige kostnader. På 100 handler = 2 500 kr.

### Hva kan du gjøre?
- **Mindre handler** = mindre slippage
- **Sjekk latency:** Rask internett = bedre priser
- **Bytt børs** hvis gebyrene er for høye

---

## 2. Backtest vs Live Gap

### Hva er det?
Backtesting simulerer "hva om jeg hadde handlet de siste 6 månedene?" Live er det du faktisk oppnår. Gapet er forskjellen.

### Hvorfor avviker de?
| Årsak | Forklaring |
|-------|------------|
| Slippage | Simuleringen forutsetter perfekte priser |
| Gebyrer | Noen børser har høyere gebyrer enn forventet |
| Latency | Boten handler ikke umiddelbart |
| Markedsendringer | Markedet kan endre seg etter backtest-perioden |

### Når bør du bekymre deg?
Hvis live-resultatene er **mer enn 20% dårligere** enn backtest. Da kan strategien trenge justering.

### Hva kan du gjøre?
- Juster strategiparametre basert på live-data
- Test nye strategier med paper trading først
- Kontakt support hvis avviket er stort

---

## 3. Fyllingsgrad

### Hva er det?
Når du legger inn en ordre, håper du den fylles 100%. Noen ganger fylles den bare delvis.

### Hvorfor skjer det?
- **Urolig marked:** Prisen hopper raskt unna
- **Dårlig likviditet:** Ikke nok kjøpere/selgere til din størrelse
- **Nettverksproblemer:** Treg tilkobling

### Hva kan du gjøre?
- **Reduser posisjonsstørrelse**
- **Bytt til et mer likvid par** (f.eks. BTC/USDT istedenfor en obskur altcoin)
- **Sjekk nettverksforbindelsen**

---

## 4. Signalforfall (Decay)

### Hva er det?
Et trading-signal er som et tilbud i butikken — mest verdt rett etter det kommer. Etter 2 sekunder kan "tilbudet" være borte.

### Timing-buckets
| Tidsvindu | Status | Nøyaktighet |
|-----------|--------|-------------|
| Under 100ms | 🟢 Perfekt | Høyest |
| 100ms – 2s | 🟡 God | Høy |
| Over 2s | 🔴 Treg | Kan være lav |

### Hva kan du gjøre?
- **Sjekk internettforbindelsen** — bruk kabel, ikke WiFi
- **Velg riktig børs-server** — nærmere = raskere
- **Unngå å handle i rushtid** — servere kan være trege

---

## 5. Ugunstig Seleksjon

### Hva er det?
Du handler "feil vei":
- Du **kjøper** → prisen faller rett etterpå
- Du **selger** → prisen stiger rett etterpå

### Hvorfor skjer det?
Det kalles "toxic flow" — du handler på samme tid som noen med bedre informasjon. De selger til deg rett før dårlige nyheter kommer.

### Når bør du bekymre deg?
Hvis **mer enn 55%** av handler går feil vei.

### Hva kan du gjøre?
- **Se etter mønstre:** Skjer det alltid samme tid på døgnet?
- **Endre strategi:** Kanskje du handler for ofte?
- **Bruk limit-ordre** istedenfor market-ordre

---

## 6. Gevinst/Tap-oppsplitting (P&L Attribution)

### Hva er det?
Vi deler opp *hvorfor* du tjente eller tapte penger:

| Komponent | Hva betyr det? | Godt eller dårlig? |
|-----------|---------------|-------------------|
| **Alpha** | Din dyktighet — smarte valg | ✅ Høy = du er god |
| **Beta** | Markedet steg — du var med | ⚪ Nøytral |
| **Valuta** | USDT/NOK-kursendringer | ⚪ Nøytral |
| **Eksekvering** | Gebyrer + slippage | ❌ Negativ = kostnad |

### Eksempel
Du tjente 1 000 kr. Oppsplittingen viser:
- Alpha: +600 kr (du gjorde smarte valg)
- Beta: +500 kr (markedet steg)
- Valuta: -50 kr (NOK svekket seg)
- Eksekvering: -50 kr (gebyrer)

Du kan være fornøyd — 60% kom fra din egen dyktighet!

---

## 7. Markedspåvirkning

### Hva er det?
Hvis du handler for svært store beløp, kan *du selv* påvirke prisen. Det kalles "market impact".

### Nivåer
| Nivå | Påvirkningsratio | Hva betyr det? |
|------|-----------------|---------------|
| 🟢 Lav | Under 0.01% | Ingen problem |
| 🟡 Middels | 0.01% – 0.1% | Merkbar, men OK |
| 🔴 Høy | Over 0.1% | Du beveger markedet |

### Hva kan du gjøre?
- **Del opp store handler** i mindre biter (TWAP)
- **Reduser posisjonsstørrelse**
- **Velge mer likvide par**

---

## Vanlige spørsmål (FAQ)

### Q: Jeg fikk en alert — hva gjør jeg?
**A:** Les alert-beskjeden. Den forteller deg *hva* som er galt og *hvilken analyse* det gjelder. Deretter:
1. Klikk på det aktuelle kortet i dashboardet
2. Les forklaringen
3. Følg forslagene under "Hva kan du gjøre?"

### Q: Hvor ofte oppdateres analysene?
**A:** Hver 6. time (4 ganger daglig). Markedspåvirkning sjekkes ukentlig.

### Q: Må jeg gjøre noe aktivt?
**A:** Nei! Systemet overvåker automatisk. Du får bare beskjed hvis noe trenger oppmerksomhet.

### Q: Hva betyr "basis points"?
**A:** 1 basis point = 0.01%. 20 bps = 0.2%. Det er en finmål for små kostnader.

### Q: Hvorfor er backtest-resultatene bedre enn live?
**A:** Backtester forutsetter perfekte forhold: ingen slippage, ingen gebyrer, umiddelbar eksekvering. Live har alle disse kostnadene.

### Q: Kan jeg slå av alerts?
**A:** Nei — de er der for å beskytte deg. Men du kan justere varselkanaler i innstillinger.

---

## Oppsummering

| Problem | Sjekk | Løsning |
|---------|-------|---------|
| Resultatene er dårligere enn forventet | Backtest Gap | Juster strategi, reduser størrelse |
| Mye slippage | TCA | Raskere nett, mindre handler |
| Ordrer fylles delvis | Fill Rate | Mindre handler, bedre par |
| Treg eksekvering | Signal Decay | Kabel, rask børs |
| Handler går feil vei | Adverse Selection | Endre timing/strategi |
| Høye kostnader | P&L Attribution | Bytt børs, reduser størrelse |
| Store posisjoner | Market Impact | Del opp, mindre størrelse |

---

**Har du spørsmål?** Kontakt oss på support@klarpakke.no eller i chatten.
