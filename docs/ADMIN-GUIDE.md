# Admin Guide

> **Versjon:** 1.0  
> **For:** Administratorer av Klarpakke Universitet

## Innholdsfortegnelse

1. [Tilgang og Autentisering](#tilgang-og-autentisering)
2. [Dashboard Oversikt](#dashboard-oversikt)
3. [Brukeradministrasjon](#brukeradministrasjon)
4. [TAJ Robot](#taj-robot)
5. [Monetisering](#monetisering)
6. [Systemadministrasjon](#systemadministrasjon)
7. [Sikkerhet](#sikkerhet)
8. [Feilsøking](#feilsøking)

---

## Tilgang og Autentisering

### Første gangs oppsett

For å gi en bruker admin-tilgang:

```sql
-- I Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'taj@klarpakke.no';
```

### Logge inn

1. Gå til `/admin/login`
2. Skriv inn din e-post og passord
3. Du blir sendt til dashboardet hvis autentiseringen er vellykket

### Sikkerhetskrav

- Sterkt passord (minst 12 tegn)
- 2FA anbefales (bruker Supabase Auth)
- Ikke del admin-credentials
- Logg alltid ut når du er ferdig

---

## Dashboard Oversikt

### Nøkkeltall

Dashboard viser fire viktige metrikker:

1. **Totalt antall brukere** - Alle registrerte brukere
2. **Aktive abonnement** - Betalende kunder
3. **Trades siste 7 dager** - Aktivitet i simulator
4. **Beta-søknader** - Venter på godkjenning

### Nylig Aktivitet

Siste 10 hendelser vises automatisk:
- Nye registreringer
- Beta-søknader
- Nye abonnement
- Viktige trades

### Server Status

Sjekker:
- ✅ Database (Supabase connection)
- ✅ API (Next.js server)
- ✅ Cloudflare Pages (deploy status)

---

## Brukeradministrasjon

### Søke og filtrere

- **Søk:** Navn, e-post eller bruker-ID
- **Filter:** Rolle (admin, analyst, trader, student)
- **Sortering:** Klikk på kolonneoverskrifter

### Endre rolle

1. Finn brukeren i tabellen
2. Klikk på rolle-dropdown
3. Velg ny rolle
4. Bekreft i dialogen

**Roller:**
- **Administrator** - Full tilgang til alt
- **Analytiker** - Kan se data, ikke endre
- **Trader** - Beta-funksjoner, ikke admin
- **Student** - Standard bruker

### Gi beta-tilgang

1. Gå til "Studenter"
2. Finn brukeren
3. Klikk checkbox for "Beta"
4. Eller bruk bulk-action for flere brukere

### Suspendere bruker

⚠️ **Brukeren kan ikke logge inn mens suspendert**

1. Klikk suspend-ikonet
2. Bekreft i dialogen
3. Brukeren beholder data, men mister tilgang

### Slette bruker

⚠️ **PERMANENT - Kan ikke angres!**

1. Krever dobbelt-bekreftelse
2. Alle data slettes
3. Anbefaling: Suspender først, slett etter 30 dager

---

## TAJ Robot

### Starte Roboten

1. Gå til Admin → TAJ Robot
2. Velg strategi:
   - **Momentum** - Følger trender
   - **Mean Reversion** - Handler mot trenden
   - **Grid Bot** - Kjøper og selger i range
   - **Custom** - Egen JSON-konfigurasjon
3. Sett risiko-parametere
4. Velg handelspar (f.eks. BTC/USDT, ETH/USDT)
5. Klikk "Start robot"

### Stoppe Roboten

**Pause:** Beholder åpne posisjoner, stopper nye trades
**Stopp:** Samme som pause, men må bekreftes

### Faresonen: Force Lukk

⚠️ **ADVARSEL: Dette selger ALLE posisjoner umiddelbart**

Bruk kun i nødstilfeller:
- Markedet krasjer
- Roboten oppfører seg uventet
- Du vil ha full kontroll

### Anbefalte Innstillinger

**Konservativ (anbefalt for nybegynnere):**
- Risikonivå: Lav
- Maks posisjon: 5%
- Stop-loss: 2%
- Take-profit: 4%

**Balansert:**
- Risikonivå: Medium
- Maks posisjon: 10%
- Stop-loss: 3%
- Take-profit: 6%

**Aggressiv:**
- Risikonivå: Høy
- Maks posisjon: 20%
- Stop-loss: 5%
- Take-profit: 10%

### Logg

Siste 50 handler vises med:
- Symbol og side (kjøp/salg)
- Pris og tid
- P&L (profit/loss)

---

## Monetisering

### Stripe Integrasjon

Dashboard-lenke går direkte til Stripe Dashboard.

### Abonnement Oversikt

- **MRR** - Monthly Recurring Revenue
- **Churn** - Antall kanselleringer
- **Trial** - Brukere i prøveperioden

### Promo-koder

Opprett nye koder:
1. Gå til Monetisering
2. Klikk "Ny promo-kode"
3. Angi:
   - Kode (f.eks. "VELKOMMEN50")
   - Rabatt (prosent eller fast beløp)
   - Gyldighetsperiode
   - Maks antall bruk

### Refusjoner

Håndteres i Stripe Dashboard:
1. Finn kunden
2. Velg betaling
3. Klikk "Refund"

---

## Systemadministrasjon

### Health Check

Automatisk sjekk av:
- Database connection
- API respons
- Cloudflare status

Klikk "Oppfrisk status" for å kjøre manuell sjekk.

### Database Status

- **Tabellstørrelser** - Største tabeller
- **Antall rader** - Per tabell
- **Slow queries** - Spørringer > 1 sekund

### Migrasjoner

**Se status:**
- Liste over alle migrasjoner
- Applied / Pending status
- Timestamp

**Kjøre pending:**
1. Klikk "Run pending migrations"
2. Bekreft i dialogen
3. Vent på fullføring

**Rollback:**
⚠️ **Kun i nødstilfeller**
1. Klikk "Rollback last migration"
2. Bekreft med full rollback-begrunnelse
3. Sjekk at alt fungerer etterpå

### Logger

Viser siste 100 errors:
- Filter på nivå (error, warning, info)
- Søk i meldinger
- Stack traces (hvis tilgjengelig)

---

## Sikkerhet

### RLS Policies

Test automatisk:
1. Gå til Sikkerhet
2. Klikk "Test RLS policies"
3. Se resultat:
   - ✅ Alle policies fungerer
   - ❌ Noen policies feiler

### Audit Log

Spor alle handlinger:
- Hvem gjorde hva
- Når det skjedde
- Hvilken IP-adresse

### Roller og Permissions

**Nåværende roller:**
- admin
- analyst
- trader
- student

**Permissions per rolle:**
| Handling | admin | analyst | trader | student |
|----------|-------|---------|--------|---------|
| Se dashboard | ✅ | ✅ | ✅ | ✅ |
| Endre brukere | ✅ | ❌ | ❌ | ❌ |
| Se analytics | ✅ | ✅ | ❌ | ❌ |
| Beta-funksjoner | ✅ | ✅ | ✅ | ❌ |
| Administrere robot | ✅ | ❌ | ❌ | ❌ |

---

## Feilsøking

### Kan ikke logge inn

1. Sjekk at du har admin-rolle i databasen
2. Sjekk at e-post er bekreftet
3. Prøk "Glemt passord"
4. Sjekk browser console for errors

### Migrasjoner feiler

1. Kjør `bash scripts/test-migrations.sh` lokalt
2. Sjekk Supabase logs
3. Reparer: `supabase migration repair --status reverted <timestamp>`
4. Push på nytt: `supabase db push`

### Roboten responderer ikke

1. Sjekk status i TAJ Robot-dashboard
2. Se i logs etter errors
3. Prøv "Force lukk" hvis nødvendig
4. Start på nytt med konservative innstillinger

### Brukere kan ikke se beta-funksjoner

1. Sjekk at brukeren har `beta_approved = true`
2. Sjekk at RLS policies er korrekte
3. Be brukeren logge ut og inn igjen

---

## Kontakt og Support

**Teknisk support:** support@klarpakke.no  
**Admin-spørsmål:** taj@klarpakke.no

**Nyttige lenker:**
- [Supabase Dashboard](https://app.supabase.com)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Cloudflare Pages](https://dash.cloudflare.com)
- [GitHub Repository](https://github.com/tombomann/klarpakke)

---

**Husk:** Med stor makt kommer stort ansvar. Admin-tilgang gir deg mulighet til å påvirke brukernes opplevelse. Bruk denne makten varsomt og alltid til brukernes beste.
