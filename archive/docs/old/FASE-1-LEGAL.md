# FASE 1: LEGAL & COMPLIANCE

**Estimert tid:** 4 timer  
**Mål:** Juridisk compliant nettside med alle nødvendige dokumenter

---

## Task 1.1: Deploy Legal Documentation

### Verifiser at alle docs er oppdatert

Filene skal allerede være oppdatert med `kontakt@klarpakke.no`. Verifiser:

```bash
cd /Users/taj/klarpakke

# Sjekk at følgende filer eksisterer og har riktig email
grep -l "kontakt@klarpakke.no" docs/LEGAL.md docs/TERMS.md docs/DISCLAIMERS.md docs/PRIVACY.md docs/COOKIES.md
```

### Innholdsjekk

**LEGAL.md skal inneholde:**
- ✅ Blyt AS org.nr. 929003292
- ✅ Adresse: Tempevegen 31, 7031 Trondheim
- ✅ Alle kontakt-emails: kontakt@klarpakke.no
- ✅ Disclaimer om at vi IKKE er investeringsrådgiver
- ✅ GDPR-rettigheter
- ✅ Angrerett (14 dager)

**TERMS.md skal inneholde:**
- ✅ Brukervilkår (16 seksjoner)
- ✅ Pricing tiers (0/500/1000/1500 kr)
- ✅ Ansvarsbegrensning
- ✅ Oppsigelsesvilkår

**DISCLAIMERS.md skal inneholde:**
- ✅ Høy risiko-advarsler
- ✅ Paper vs Live trading forklaring
- ✅ Leverage-risiko
- ✅ Ingen garantier

**PRIVACY.md skal inneholde:**
- ✅ GDPR compliance
- ✅ Dine rettigheter (innsyn, sletting, portabilitet)
- ✅ Cookies forklaring
- ✅ Databehandlingsavtaler

**COOKIES.md skal inneholde:**
- ✅ Hvilke cookies vi bruker
- ✅ Hvordan administrere cookies
- ✅ Tredjepartscookies

---

## Task 1.2: Webflow Legal Pages

### Opprett følgende sider i Webflow

For hver side:
1. Gå til Webflow → Pages → Create New Page
2. Sett Page Settings (title, description, slug)
3. Legg til innhold fra markdown-fil
4. Legg til DOM-ankere
5. Publish

#### /legal (Om Oss + Juridisk Info)

**Page Settings:**
- Title: `Om Oss & Juridisk Info - Klarpakke`
- Slug: `legal`
- Description: `Informasjon om Blyt AS, org.nr. 929003292`

**DOM Structure:**
```html
<div id="klarpakke-legal-root" data-kp-root="legal">
  <h1>Om Klarpakke</h1>
  <section data-company-info>
    <h2>Blyt AS</h2>
    <p>Org.nr: 929003292</p>
    <p>Tempevegen 31, 7031 Trondheim</p>
    <p>kontakt@klarpakke.no</p>
    <a href="https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=929003292">Verifiser i Brønnøysund</a>
  </section>
  
  <section data-disclaimer-short>
    <p>⚠️ Klarpakke er et opplæringsfirma. Vi gir IKKE investeringsrådgivning.</p>
  </section>
</div>
```

#### /terms (Bruksvilkår)

**Page Settings:**
- Title: `Bruksvilkår - Klarpakke`
- Slug: `terms`
- Description: `Vilkår for bruk av Klarpakke-tjenesten`

**Innhold:** Kopier fra TERMS.md

**Viktige seksjoner å fremheve:**
- Abonnementspriser (0/500/1000/1500 kr)
- Angrerett (14 dager)
- Oppsigelse

#### /privacy (Personvern)

**Page Settings:**
- Title: `Personvernerklæring - Klarpakke`
- Slug: `privacy`
- Description: `GDPR-compliant personvernpolicy for Klarpakke`

**Innhold:** Kopier fra PRIVACY.md

**Viktig:** Legg til Cookie Settings-knapp:
```html
<button data-open-cookie-settings>Endre Cookie-innstillinger</button>
```

#### /disclaimers (Risiko & Disclaimers)

**Page Settings:**
- Title: `Risiko & Disclaimers - Klarpakke`
- Slug: `disclaimers`
- Description: `Viktig informasjon om trading-risiko`

**Innhold:** Kopier fra DISCLAIMERS.md

**Viktige advarsler å fremheve:**
- Trading er høyrisiko
- Du kan tape alle pengene
- Tidligere resultater ≠ fremtidige resultater
- Start med paper trading

#### /cookies (Cookie Policy)

**Page Settings:**
- Title: `Cookie Policy - Klarpakke`
- Slug: `cookies`
- Description: `Informasjon om cookies og sporing`

**Innhold:** Kopier fra COOKIES.md

---

## Task 1.3: Cookie Consent Banner

### Implementer Cookiebot eller OneTrust

**Alternativ A: Cookiebot (gratis opp til 100k pageviews)**

1. Gå til [cookiebot.com](https://www.cookiebot.com)
2. Registrer konto
3. Legg til domene: klarpakke.no
4. Kopier script:

```html
<!-- Legg til i Webflow Project Settings → Custom Code → Head Code -->
<script id="Cookiebot" src="https://consent.cookiebot.com/uc.js" data-cbid="YOUR-CBID" data-blockingmode="auto" type="text/javascript"></script>
```

**Alternativ B: Custom Cookie Banner (inkludert)**

Bruk koden fra `web/compliance-footer.html` som inkluderer en enkel cookie banner:

```html
<div id="cookie-consent" style="display: none; position: fixed; bottom: 0;...">
  <p>Vi bruker cookies for å forbedre opplevelsen din. <a href="/cookies">Les mer</a></p>
  <button onclick="acceptCookies('necessary')">Kun nødvendige</button>
  <button onclick="acceptCookies('all')">Aksepter alle</button>
</div>
```

### Konfigurer for GDPR

**Nødvendig:**
- Bruker må kunne avslå analytiske cookies
- Samtykke må logges
- Bruker må kunne endre samtykke senere

**Kategorier:**
1. Nødvendige (alltid på)
2. Funksjonelle (valgfritt)
3. Analytiske (valgfritt)
4. Markedsføring (valgfritt - ikke i bruk ennå)

---

## Task 1.4: Compliance Footer

### Kopier HTML til Webflow

Fra `web/compliance-footer.html`:

1. Gå til Webflow → Project Settings → Custom Code → Footer Code
2. Lim inn HTML-koden
3. Verifiser at:
   - Blyt AS org.nr. 929003292 vises
   - Tempevegen 31, 7031 Trondheim vises
   - kontakt@klarpakke.no er linket
   - Disclaimer-baren er synlig
   - Cookie-innstillinger er tilgjengelig

### Test Footer

```bash
# Sjekk at footer laster på alle sider
curl -s https://klarpakke.no | grep -i "Blyt AS"
curl -s https://klarpakke.no/legal | grep -i "929003292"
curl -s https://klarpakke.no/terms | grep -i "kontakt@klarpakke.no"
```

---

## Task 1.5: GDPR Compliance Check

### Sjekkliste

- [ ] Privacy policy tilgjengelig på /privacy
- [ ] Cookie policy tilgjengelig på /cookies
- [ ] Cookie banner vises for nye brukere
- [ ] Bruker kan avslå analytiske cookies
- [ ] Bruker kan trekke tilbake samtykke
- [ ] "Rett til å bli glemt" implementert (konto-sletting)
- [ ] Datasporing logget (audit trail)
- [ ] Databehandlingsavtaler på plass (med Supabase, Stripe, etc.)

### Test GDPR-funksjoner

1. **Test cookie banner:**
   - Åpne klarpakke.no i inkognito
   - Verifiser at banner vises
   - Klikk "Kun nødvendige"
   - Verifiser at analytics ikke laster

2. **Test konto-sletting:**
   - Logg inn
   - Gå til Settings → Security → Delete Account
   - Verifiser at konto slettes
   - Verifiser at data fjernes fra database

3. **Test data-eksport:**
   - Gå til Settings → Privacy → Export Data
   - Verifiser at JSON-fil lastes ned
   - Verifiser at all personlig data inkluderes

---

## VERIFIKASJON

### Før du går videre

```bash
# Test alle legal sider
curl -s https://klarpakke.no/legal | grep -i "Blyt AS" && echo "✅ Legal OK"
curl -s https://klarpakke.no/terms | grep -i "brukervilkår\|terms" && echo "✅ Terms OK"
curl -s https://klarpakke.no/privacy | grep -i "personvern\|privacy" && echo "✅ Privacy OK"
curl -s https://klarpakke.no/disclaimers | grep -i "risiko\|disclaimer" && echo "✅ Disclaimers OK"
curl -s https://klarpakke.no/cookies | grep -i "cookie" && echo "✅ Cookies OK"

# Test cookie banner
curl -s https://klarpakke.no | grep -i "cookie-consent" && echo "✅ Cookie banner OK"

# Test footer
curl -s https://klarpakke.no | grep -i "929003292" && echo "✅ Footer orgnr OK"
```

---

## LEVERANSE

Etter FASE 1 skal du ha:

- [ ] 5 legal sider publisert på Webflow
- [ ] Cookie consent banner fungerende
- [ ] Compliance footer på alle sider
- [ ] Alle docs oppdatert med kontakt@klarpakke.no
- [ ] GDPR compliance verifisert

---

## NESTE STEG

Gå til **FASE 2: Auth & Onboarding** → `docs/FASE-2-AUTH.md`

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
