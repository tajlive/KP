# OKX Broker-søknadspakke — Klarpakke

> Status: Forberedt for innsending. Dato: 2026-08-08.
> Mål: OKX Broker Program, **API Broker**-modell, godkjenning ~2 dager, onboarding etterpå.
> Bakgrunn: Kraken-affiliate fikk avslag (KOL-program, krever trafikk). OKX Broker er bygget for plattformer som Klarpakke.

---

## 1. Anbefalt broker-modell: API Broker (ikke OAuth Broker)

| | API Broker (VALGT) | OAuth Broker |
|---|---|---|
| Måte | Brukeren binder OKX API-nøkkel til Klarpakke | Brukeren autoriserer via OKX OAuth-side |
| Passer Klarpakke? | **Perfekt — speiler `user_kraken_keys`-arkitektur 1:1** | Krever OAuth-ombygging |
| Teknisk arbeid | Minimum — samme mønster som eksisterende Kraken-integrasjon | Ekstra (OAuth-flux, redirect-URI, token-lagring) |
| UX | Bruker oppretter API-nøkkel selv (som i dag med Kraken) | Brukeren slipper API-nøkkel, men må godkjenne i OKX-app/nettside |

**Begrunnelse:** Klarpakke har allerede produksjonsmodellen for API-key-binding (`user_kraken_keys`). API Broker gir rebate på alle fees fra brukerens ordrer via `brokerCode`-feltet (`tag`-parameter) — ingen ekstra UX-endring for brukeren.

---

## 2. Hvem kan søke (OKX offisielle kriterier — Klarpakke matcher minst 3)

> «As long as your business platform provides the below cryptocurrency services, you can apply…»
> — okx.com/help/introduction-of-rules-on-okx-brokers

| OKX-kategori | Klarpakke? |
|---|---|
| Trading aggregator platform | Delvis |
| **Trading strategy platform** | ✅ Ja — grid + autopilot |
| **Technical strategy provider** | ✅ Ja — AI-signaler (Pilot) |
| **Trading bot platform** | ✅ Ja — grid-roboter |
| Asset management and payment platform | Delvis |
| Social trading community | Delvis (på vei) |

**Søknaden skal framheve: «Trading strategy platform + Trading bot platform».**

---

## 3. Innsendingsprosess (offisiell, 5 steg)

1. **Opprett OKX-konto** — selskapskonto (juridisk enhet Klarpakke AS / det Tom har registrert), full KYC.
2. **Gå til** https://www.okx.com/en-us/broker (eller /broker/home) → «Apply to join».
3. **Velg API Broker**, fyll inn søknadsskjema (felt i §4).
4. **Vent ~2 dager** — OKX anmelder skjemaet; godkjent → e-post med `client_id`/`client_secret`.
5. **Onboarding:** OKX customer manager kontakter deg → signering av onboarding-kontrakt → teknisk tilgang via broker-API-settings → test-trading → T+1-kommisjoner.

---

## 4. Søknadsskjema — forslag til svar

### 4.1 Bedriftsinfo
| Felt | Svar |
|---|---|
| Selskapsnavn | Klarpakke AS (ev. juridisk navn) |
| Nettside | https://klarpakke.no |
| Juridisk enhet / land | Norge (EØS) — MiCA-gyldig via OKX EEA |
| Registreringsnummer | [Tom fyller inn — Org.nr.] |
| E-post | post@klarpakke.no (eneste brukerflate-adresse) |
| Kontaktperson | Tom Arne Jensen (founder) |
| LinkedIn | linkedin.com/in/tom-arne-jensen |

### 4.2 Plattformbeskrivelse (bruk dette i «Describe your platform»-feltet)
> Klarpakke er en norsk kryptohandelsplattform som lar nybegynnere kjøre automatiserte
> handelsstrategier — mekanisk grid (BTC/ETH/SOL mot USDC) og AI-drevne signaler —
> uten å måtte forstå børser eller API-er. Brukerne kobler sin egen børs-konto
> (API-nøkkel) og handler fra et enkelt norsk grensesnitt. 100 000 kr lekepenger
> (papirhandel) for trening før live. Plattformen er bygget med Next.js og kjører på
> Cloudflare Workers. Målgruppe: norske nybegynnere som i dag ikke tørr å starte med krypto.

### 4.3 Broker-modell
| Felt | Svar |
|---|---|
| Modell | **API Broker** (bind brukerens API-nøkkel med brokerCode) |
| Produkter som skal tilbys | Spot-handel (BTC/ETH/SOL/USDC) via strategi-robot |
| Volum-estimat år 1 | Konservativt: [Tom setter tall — f.eks. 50–200 brukere, 1–5M NOK omsetning] |
| Teknisk evne | Egen integrasjon mot OKX V5 REST API (order placement med `tag`/brokerCode) |

### 4.4 Rebate-struktur å be om
- **Start**: standard broker-ratio (OKX setter nivå basert på volum/broker-level).
- **Mål på sikt**: 40–50 % av netto trading-fees (OKX affiliate-program starter på 30 %, topp 50 %).
- **Klient-rebate**: OKX støtter `clientRebateRatio` (0–20 % tilbake til brukeren) — senere fase: la Klarpakke-brukere få 10–20 % av fees tilbake som konkurransefortrinn.

---

## 5. Hva OKX trenger fra Klarpakke ved onboarding

- [ ] Org.nr / selskapsdokumentasjon (Norge)
- [ ] OKX-konto fullført med KYC (juridisk enhet)
- [ ] Bekreftet e-post (post@klarpakke.no)
- [ ] Teknisk kontakt for API-settinger (Tom / hovedarkitekt)
- [ ] Plan for `brokerCode`-bruk: alle ordrer via `/api/v5/trade/order` med `tag: <brokerCode>`

---

## 6. Juridisk sjekkliste (før innsending)

- [ ] **Affiliate/broker-henvisning** er markedsføring — krever normalt ikke CASP-lisens (Finanstilsynet: henvisning OK, grensen går ved ordreformidling for brukerens regning).
- [ ] Klarpakke **skal ikke** legge markup på toppen av OKX-fees — da blir det investeringstjeneste. Rent rebate (OKX betaler Klarpakke) er trygt.
- [ ] Bekreft med norsk jurist at API Broker-modellen (brukerens egne nøkler + rebate) ikke trigger MiCA-CASP-krav.
- [ ] Personvern: `user_okx_keys` må krypteres som `user_kraken_keys` (samme standard).

---

## 7. Fallback hvis OKX også avslår

1. **Bybit EU affiliate** — 30–50 % rev-share, 100 000+ affiliates, lav terskel, Østerrike-lisens (MiCA). Søk via affiliates.bybit.com.
2. **Bitstamp affiliate** — eldre, mer restriktivt, men etablert EØS-spiller.
3. **Kraken-affiliate på nytt** når Klarpakke har brukervolum (de forhandler per partner; trafikk er nøkkelen).

---

## 8. Kilder

- OKX Broker Program docs: https://www.okx.com/docs-v5/broker_en
- OKX broker-regler (oppdatert 5. aug 2026): https://www.okx.com/help/introduction-of-rules-on-okx-brokers
- OKX Apply: https://www.okx.com/en-us/broker
- Kraken affiliate (avslått): https://www.kraken.com/affiliate
- Bybit fallback: https://affiliates.bybit.com
