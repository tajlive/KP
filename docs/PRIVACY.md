# PERSONVERNERKLÆRING - KLARPAKKE

**Firma:** Blyt AS  
**Organisasjonsnummer:** 929003292  
**Adresse:** Tempevegen 31, 7031 Trondheim  
**E-post:** kontakt@klarpakke.no  
**Sist oppdatert:** 31. januar 2026

---

## INNLEDNING

Blyt AS («vi», «oss») er opptatt av å beskytte ditt personvern. Denne personvernerklæringen forklarer hvordan vi samler inn, bruker, lagrer og beskytter dine personopplysninger når du bruker Klarpakke.no («Tjenesten»).

Vi er **dataansvarlig** for behandlingen av dine personopplysninger i henhold til GDPR (EU-forordning 2016/679) og norsk personopplysningslov.

---

## 1. HVILKE OPPLYSNINGER SAMLER VI INN?

### 1.1 Kontoinformasjon

| Opplysning | Formål | Lovlig grunnlag |
|------------|--------|-----------------|
| E-postadresse | Autentisering, kommunikasjon | Nødvendig for kontrakt |
| Passord (hash) | Sikker innlogging | Nødvendig for kontrakt |
| Brukernavn/Display name | Identifisering i community | Samtykke |
| Telefonnummer (valgfritt) | SMS-varsler (kun Pluss/VIP) | Samtykke |

### 1.2 Bruksdata

| Opplysning | Formål | Lagringstid |
|------------|--------|-------------|
| Trading-aktivitet (paper/live) | Tjenesteleveranse, analyse | 5 år |
| Quiz-resultater | Læringsfremgang, gating | 5 år |
| Leaderboard-poeng | Konkurranse, incentiv | 5 år |
| Innloggingshistorikk | Sikkerhet, svindelbeskyttelse | 2 år |
| Sidevisninger/kurs | Forbedring av tjenesten | 26 måneder |

### 1.3 Betalingsinformasjon

**VIKTIG:** Vi lagrer **IKKE** komplette kortopplysninger.

| Opplysning | Hvor lagret | Formål |
|------------|-------------|--------|
| Kortnummer (4 siste siffer) | Hos oss | Kundeservice |
| Fullt kortnummer | Stripe (PCI DSS) | Betalingsbehandling |
| Fakturaadresse | Stripe | Fakturering |
| Betalingshistorikk | Stripe + hos oss | Regnskap |

**Stripe:** Vår betalingsleverandør er Stripe Payments Europe, Ltd. (PCI DSS Level 1 sertifisert).

### 1.4 Tekniske data

- IP-adresse
- Nettlesertype og versjon
- Operativsystem
- Enhetstype (mobil/desktop)
- Tidssone og språk
- Referrer URL

---

## 2. HVORDAN BRUKER VI OPPLYSNINGENE?

### 2.1 Primære formål

| Formål | Forklaring |
|--------|------------|
| **Levere Tjenesten** | Autentisering, trading, quizer, leaderboard |
| **Forbedre Tjenesten** | Bruksanalyse, feilretting, ny funksjonalitet |
| **Kommunisere** | E-poster om konto, varsler, support |
| **Fakturering** | Behandle betalinger, sende fakturaer |
| **Sikkerhet** | Beskytte mot svindel, uautorisert tilgang |
| **Overholde lover** | Regnskapsplikt, skatterapportering |

### 2.2 Markedsføring

**Vi sender kun markedsføring hvis du har samtykket.**

Du kan når som helst:
- Trekke tilbake samtykke i innstillinger
- Klikke «avmeld» i e-poster
- Kontakte kontakt@klarpakke.no

**Vi selger ALDRI dine data til tredjepart for markedsføring.**

---

## 3. DELING AV OPPLYSNINGER

### 3.1 Vi deler med

| Mottaker | Hva deles | Formål |
|----------|-----------|--------|
| **Stripe** | Betalingsinfo | Betalingsbehandling |
| **Supabase** | Alle data (hosting) | Database og autentisering |
| **Vercel/Cloudflare** | Tekniske logger | Hosting og CDN |
| **Telegram** | Bruker-ID (hvis du kobler til) | Varsler |

### 3.2 Vi deler IKKE med

- ❌ Andre brukere (unntatt anonymisert leaderboard)
- ❌ Annonsører
- ❌ Data-brokere
- ❌ Tredjepart for profilering

### 3.3 Juridisk deling

Vi kan dele data hvis påkrevd av:
- Domstol eller rettslig kjennelse
- Politiet (ved mistanke om straffbar handling)
- Skattemyndigheter (ved lovpålagt rapportering)
- Finanstilsynet (hvis relevant)

---

## 4. LAGRING OG SIKKERHET

### 4.1 Hvor lagres data?

- **Primær lagring:** EU/Irland (Supabase)
- **Backup:** EU/Irland
- **CDN:** Global (Cloudflare)

**Ingen data lagres utenfor EØS uten tilstrekkelig beskyttelse.**

### 4.2 Sikkerhetstiltak

| Tiltak | Beskrivelse |
|--------|-------------|
| **Kryptering i transitt** | TLS 1.3 for all dataoverføring |
| **Kryptering i hvile** | AES-256 for database |
| **API-nøkler** | AES-GCM kryptering |
| **Passord** | bcrypt hashing |
| **2FA** | Tilgjengelig for brukere |
| **RLS** | Row Level Security i database |
| **Audit logging** | Logging av alle sensitive operasjoner |

### 4.3 Databruddsprosedyre

Ved databrudd vil vi:
1. Rapportere til Datatilsynet innen 72 timer
2. Informere berørte brukere så snart som mulig
3. Iverksette tiltak for å stoppe bruddet
4. Gjennomgå og forbedre sikkerhet

---

## 5. DINE RETTIGHETER (GDPR)

### 5.1 Rett til innsyn

Du har rett til å få vite:
- Hvilke data vi har om deg
- Hva de brukes til
- Hvem de deles med
- Hvor lenge de lagres

**Hvordan:** Send e-post til kontakt@klarpakke.no  
**Responstid:** 30 dager

### 5.2 Rett til retting

Du kan be om at feilaktige opplysninger rettes.

**Hvordan:**
- Endre selv i Settings
- Eller send e-post til kontakt@klarpakke.no

### 5.3 Rett til sletting ("Rett til å bli glemt")

Du kan be om at vi sletter dine data.

**Unntak:** Vi kan beholde data hvis:
- Lovpålagt (regnskap, skatt)
- Nødvendig for rettstvist
- Samtykke til forskning (anonymisert)

**Hvordan:**
1. Gå til Settings → Security → Delete Account
2. Eller send e-post til kontakt@klarpakke.no

**Konsekvenser:**
- Kontoen din slettes permanent
- All trading-historikk fjernes
- Du kan ikke gjenopprette data

### 5.4 Rett til dataportabilitet

Du kan be om å få dine data i maskinlesbart format.

**Format:** JSON  
**Hvordan:** Settings → Privacy → Export Data  
**Innhold:** Profil, trading-historikk, quiz-resultater, innstillinger

### 5.5 Rett til begrensning

Du kan be om at vi midlertidig slutter å bruke dine data.

**Hvordan:** kontakt@klarpakke.no

### 5.6 Rett til å protestere

Du kan protestere mot:
- Direkte markedsføring (alltid)
- Profilering (automatiserte beslutninger)

### 5.7 Rett til å trekke samtykke

Hvis behandling er basert på samtykke, kan du trekke dette tilbake når som helst.

**Påvirker ikke:** Behandling før tilbaketrekking

---

## 6. COOKIES OG SPORING

### 6.1 Hva bruker vi?

| Type | Navn | Formål | Varighet |
|------|------|--------|----------|
| **Nødvendig** | supabase-auth-token | Innlogging | Session |
| **Funksjonell** | kp-preferences | Brukerinnstillinger | 1 år |
| **Analytisk** | _ga (Google Analytics) | Bruksstatistikk | 26 måneder |

### 6.2 Ditt valg

Ved første besøk viser vi en cookie-banner hvor du kan:
- Akseptere alle cookies
- Bare akseptere nødvendige
- Konfigurere individuelt

**Endre valg:** Settings → Privacy → Cookies

---

## 7. BARN OG UNGE

Tjenesten er **ikke ment for barn under 18 år**.

Vi samler ikke bevisst inn data fra barn under 18. Hvis du tror et barn har registrert seg, kontakt oss umiddelbart på kontakt@klarpakke.no.

---

## 8. ENDRINGER I PERSONVERNERKLÆRINGEN

Vi kan oppdatere denne erklæringen ved:
- Nye lover eller reguleringer
- Nye tjenester eller funksjoner
- Endringer i databehandling

**Varsel:**
- E-post til registrert adresse ved vesentlige endringer
- 30 dagers varsel
- Fortsatt bruk = aksept

---

## 9. KONTAKTINFORMASJON

### Personvernansvarlig

**Navn:** Blyt AS  
**E-post:** kontakt@klarpakke.no  
**Adresse:** Tempevegen 31, 7031 Trondheim  
**Telefon:** [Kommer]

### Klager

Hvis du er misfornøyd med vår behandling:

1. Kontakt oss først: kontakt@klarpakke.no
2. Vi vil svare innen 30 dager
3. Hvis fortsatt misfornøyd:

**Datatilsynet**  
📍 Tollbugata 3, 0152 Oslo  
📧 postkasse@datatilsynet.no  
📞 22 39 69 00  
🌐 [datatilsynet.no](https://www.datatilsynet.no)

---

## 10. SAMMENDRAG

| Spørsmål | Svar |
|----------|------|
| **Hvem er dataansvarlig?** | Blyt AS (929003292) |
| **Hva er hovedformålet?** | Levere trading-opplæringstjenesten |
| **Hvor lenge lagres data?** | 5 år (trading), 2 år (logger) |
| **Selger dere data?** | Nei, aldri |
| **Hvor er data lagret?** | EU/Irland |
| **Er kryptering brukt?** | Ja, TLS 1.3 og AES-256 |
| **Kan jeg slette data?** | Ja, kontakt kontakt@klarpakke.no |
| **Er 2FA tilgjengelig?** | Ja, anbefales sterkt |

---

*© 2026 Blyt AS - Alle rettigheter reservert*  
*Denne personvernerklæringen ble sist oppdatert 31. januar 2026*
