# Konkurranseposisjon og brukerresultat (2026)

## Mål (produkt)

Brukere vil **maksimere avkastning på kortest mulig tid**. Det er et reelt ønske, men som plattform må vi kombinere det med **risiko**, **etterlevelse** og **læring** — ellers undergraves tillit og bærekraft.

## Anbefalinger for å ligge foran

1. **Én sannhet i UI (paper = live i presentasjon)**  
   Samme layout, samme valutaformat (NOK), samme grafer og KPI-er. Brukeren bygger muskelminne i øving som overføres til live uten «annet språk» i grensesnittet. (Implementert i dashboard-hovedkort + handelsdesk-header + modus-badges.)

2. **Hastighet til første «aha»**  
   Færre steg til første strategi/paper-økt, tydelig «neste beste handling» på dashboard. Konkurrenter vinner ofte på **time-to-value**, ikke på flest indikatorer.

3. **Tidsfiltre og forklaring**  
   Kumulativ P&L uten periode-kontekst kan misforstås. Anbefaling: forhåndsvalg **7d / 30d / YTD / All** med kort hjelpetekst (hva som inngår i tallene).

4. **Edge på dataflyt**  
   Stabile priser (cron), forutsigbar oppdateringsfrekvens i UI, og lav latens på handler-lister. Profesjonelle aktører selger **pålitelighet** like mye som «signal».

5. **Journal + skatt**  
   Når brukere tjener (eller taper), trenger de **sporbarhet**: eksporterbar historikk, kobling til skatterapport — reduserer friksjon og øker lojalitet.

6. **Risiko som produktfunksjon**  
   Positionsstørrelse, max tap per dag, tvungen bekreftelse før live — konkurransen beveger seg mot **kontrollerte** opplevelser, ikke bare «høyere giring».

7. **Åpenhet om begrensninger**  
   Ingen løfter om garantert avkastning. Klar kommunikasjon: tidligere resultat er ikke garanti. Det skiller seriøse aktører fra resten og reduserer juridisk/reputasjonsrisiko.

## Hva vi ikke bør gjøre

- Love «mest penger på kortest tid» som **garanti** i marketing.
- Gjøre live-visuelt «skummelt grønt» og paper «leketøy-blått» — svekker overføringsverdi (vi harmoniserer derfor uttrykket).
- Skjule at live er ekte risiko — **advarsel i live-modus** beholdes selv om tallflaten er lik.

## Vedlikehold

- Ved nye trading-sider: sjekk at **NOK-formatering**, **kortlayout** og **modus-badges** følger samme mønster som `PortfolioDashboard` og `UnifiedTradingDashboard`.
- Oppdater dette dokumentet når dere lanserer nye differentiatorer (f.eks. copy-trading, marketplace-strategier).
