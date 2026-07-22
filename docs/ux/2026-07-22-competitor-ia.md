# Competitor IA benchmark — 2026-07-22

Formål: gjøre klarpakke.no mindre rotete ved å kopiere informasjonsarkitektur-mønstre fra Coinbase, Binance, eToro og Firi. Mobil er primær flaten (~80% av trafikken).

## Benchmark

| Konkurrent | Mønster | Klarpakke-regel |
|---|---|---|
| Coinbase | Enkel buy/sell skilles fra Advanced Trade; Learn er egen flate og kontekstuell hjelp. | Ikke bland manuell handel, auto og kurs i samme primærnav. |
| Binance / Binance.US | Produktmeny skiller Buy & Sell, Convert (enkel) og Spot Trading (avansert); Academy er separat. | Én enkel handelsflate først; avanserte valg bak progressive disclosure. |
| eToro | Demo account speiler reell konto; CopyTrader er lineær: finn → vurder → kopier → velg beløp. | Lekepenger skal føles som samme produkt som live, tydelig merket. |
| Firi | Norsk tillit og enkel kjøp/selg i NOK, mobilførst. | Første CTA skal være enkel, norsk og trygg. |

## UX-krav (låst)

Progressive disclosure er prinsippet bak alle krav under: enkle valg først, avanserte valg bak ett klikk.

1. Gjeste-nav har maks 4 informasjonsvalg + login + CTA.
2. Innlogget primærnav har maks 5 valg.
3. Mobil har nøyaktig 4 bunnfaner: Hjem, Portefølje, Handel, Konto.
4. “Lekepenger” er standard og trygg start; “Live” er eksplisitt modusbytte.
5. Manuell handel har én canonical route: `/trade`.
6. Auto-trading har én canonical route: `/dashboard/auto-trade`.
7. JokerTrade er produkt/AI-flate, ikke generell hovednavigasjon for gjester.
8. Avanserte analyser/historikk/resultater ligger under `Mer`, ikke i primærnav.
9. Mobile-first: én hånd/t tommel-sone, 48px+ touch targets, safe-area, ingen horisontal scroll, én CTA i første viewport.

## Mål-IA

Gjest: Lær, Priser, Om oss, Logg inn, Start gratis.
Innlogget desktop: Hjem, Portefølje, Handel, Auto, Mer.
Mobil bunnnav: Hjem, Portefølje, Handel, Konto.
