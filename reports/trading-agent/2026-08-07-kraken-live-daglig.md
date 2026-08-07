# Kraken Live — daglig analyse 2026-08-07

## TL;DR

**Equity: 145,17 USDC** (start 153,44) → **−5,4 % totalt**. Tapet er nesten
utelukkende **umuliggjort gevinst (coin-ene er verdt mindre enn da de ble kjøpt)** —
realisert grid-gevinst er fortsatt **0,00 USDC**. Årsaken er IKKE at grid taper penger,
men at markedet har falt siden grid-et startet, OG at gårsdagens
OpenOrders-nesting-bug plasserte ett ghost-salg som spiste opp to faktiske SOL-kjøp
og brøt kjøp→salg-kjeden for tre grid-nivåer. Manager og state er reparert i dag;
to nivåer (SOL @72,80 / @73,69) venter på at prisen skal tilbake over kjøpsnivå
før de kan selges med pluss.

## Tall (live-verifisert mot Kraken API, ikke estimater)

### Konto-snapshot (05:05 UTC)

|            |                                                                    |
| ---------- | ------------------------------------------------------------------ |
| USDC total | 111,15 (8,55 ledig / ~102,6 låst i kjøpsordre)                     |
| XBT        | 0,00039217 (~25,19 USDC)                                           |
| ETH        | 0,00465678 (~8,83 USDC)                                            |
| SOL        | 0,10760654 (~7,81 USDC)                                            |
| **Equity** | **145,17 USDC** (start 153,44, drawdown 5,39 %, kill-terskel 15 %) |
| Åpne ordre | 12 (11 kjøp, 1 salg)                                               |

### Alle fills siden aktivering (6 stk, fra TradesHistory)

| Tid (UTC)   | Par     | Side     | Volum          | Pris      | Kost  | Fee   |
| ----------- | ------- | -------- | -------------- | --------- | ----- | ----- |
| 08-05 18:19 | XBTUSDC | sell     | 0,00034308     | 64 706,06 | 22,20 | 0,178 |
| 08-06 02:00 | SOLUSDC | buy      | 0,11289999     | 73,69     | 8,32  | 0,033 |
| 08-06 02:17 | ETHUSDC | buy      | 0,00467548     | 1 898,04  | 8,87  | 0,035 |
| 08-06 13:07 | XBTUSDC | buy      | 0,00016411     | 64 214,70 | 10,54 | 0,042 |
| 08-06 18:52 | SOLUSDC | buy      | 0,11428022     | 72,80     | 8,32  | 0,033 |
| 08-07 00:30 | SOLUSDC | **sell** | **0,11866496** | **72,58** | 8,61  | 0,069 |

Sum gebyrer: 0,39 USDC. Realisert grid-P&L i state: 0,00.

### Mønster-observasjoner

1. **4 kjøp, 1 grid-salg (XBT seed), 1 GHOST-salg (SOL 08-07 00:30).** Ghost-salget
   solgte 0,11866 SOL @ 72,58 — ~0,9 % under kost-basis (~73,24) → **realisert tap
   ≈ −0,10 USDC + 0,07 fee**. Rotårsak: OpenOrders-nesting-buggen (fikset i app-kode
   i går) fikk manageren til å tro at den ÅPNE kjøpsordren @ 70,11 var fylt →
   den la salg @ 71,51 som fyltes umiddelbart (pris var 72,58).
2. **Kjede-brudd på 3 nivåer:** de to SOL-kjøpene + ETH-kjøpet ble aldri fulgt opp
   med salgsordre fordi coin-ene var borte (spist av ghost-salget) → manageren
   logget `Insufficient funds` i 6+ timer uten å hente seg inn (state hadde allerede
   markert dem filled med… ingenting). Fikset i dag, se under.
3. **11 kjøp vs 1 salg åpent** er korrekt grid-oppførsel i et fallende marked:
   grid kjøper nedover, selger på vei opp. Prisene ligger nå midt i grid-rangen
   (SOL 72,61, grid 70,11–73,69; ETH 1 896, grid 1 821–1 898; XBT 64 213,
   grid 62 143–64 214 + salg 65 499).
4. **Regime:** 24h-endringer BTC −0,9 %, ETH −0,8 %, SOL −1,9 %, volatilitet ~2–3 %
   → **sideways** → grid er i sitt regime, ingen pause aktiv.
5. **Fees vs gevinst:** 0,39 USDC betalt i fees, 0 realisert. Spacing (1,0–1,2 %)
   er over 1,0 %-terskelen, så når salgene kommer er netto-margin ~48–57 % per
   syklus. Problemet er ikke økonomien per syklus, men at syklusene ikke har
   fullført (markedet falt rett etter kjøpene).

## Tiltak utført i dag (cron-økt)

1. **Manager-bug fikset** (`scripts/kraken-grid-manager.mjs`):
   - Salgsplassering som feiler setter nå `pendingSell` i stedet for å markere
     kjøpet som `filled` (evidens bevart, retry neste kjøring).
   - Fill-deteksjon sjekker om pendingSell-kjøp allerede har en åpen salgsordre
     (`refBuyTxid`) — da synkes state uten duplikatordre.
2. **Nonce-fiks:** manuell kjøring brukte ms-nonce → `EAPI:Invalid nonce` mot
   nøkkel med custom nonce-window. Alle klienter bruker nå `Date.now()*1000`.
3. **State-reparasjon forsøkt:** salgsordre for de 3 strandede fills kan ikke
   legges ennå — coin-ene er fysisk solgt av ghost-ordren. Strategi: lar de
   stå som `pendingSell`; når SOL > 72,80 og ETH > 1 898 vil re-kjøpsordrene
   (allerede ute) fylles, og manageren legger salg automatisk. Alternativ:
   market-salg nå låser inn ~0,3 USDC tap — IKKE gjort, tapet er mindre enn
   forventet grid-gevinst på de samme nivåene.
4. **Skill oppdatert** med begge bug-patterne (pendingSell + nonce-enhet).

## Anbefaling (neste 24–48t)

- **Ingen manuell intervensjon nå.** Grid er riktig posisjonert for sideways-marked;
  8,55 USDC ledig er under IDLE_THRESHOLD (25) så ingen nye nivåer legges før
  gevinst/frigjøring.
- **Overvåk:** når SOL krysser 73,69+ skal kjeden selv-helbrede (re-kjøp fylt →
  salg @ 75,16). Første ekte grid-gevinst vil da dukke opp i `realized_profit`.
- **Vurder (ikke hast):** ghost-salg-klassen av feil kan forebygges strukturelt
  ved at manageren verifiserer faktisk coin-beholdning mot forventet volum før
  salgsplassering (`Balance`-sjekk per fill). Anbefaler å legge det inn ved neste
  manager-endring — billig forsikring (én ekstra API-call per fill).
- **5-par-utvidelse (ADA/AVAX)** forblir pauset: equity 145 < 250-terskel. Korrekt
  oppførsel.

## Risiko

- Drawdown 5,4 % → trygg margin til 7 %-terskelen (progressiv halvering) og
  15 % (full kill). Ingen kill-risiko i nåværende marked.
- Største enkelt-risiko: ny bug-klasse i manager som plasserer ordre uten
  coin-dekning. Avbøtet av punkt 3 i anbefalingen over.
