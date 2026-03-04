# 🆕 New Pages Setup Guide

Guide for creating additional pages in Webflow Designer.

---

## 📋 Table of Contents

- [Password Reset](#password-reset)
- [Email Verification](#email-verification)
- [Error Pages](#error-pages)
- [Terms & Privacy](#terms--privacy)
- [Trading History](#trading-history)
- [User Profile](#user-profile)
- [Help/Support](#helpsupport)

---

## 🔐 Password Reset

### Create Page

1. **Add New Page**
   - Name: `Tilbakestill Passord`
   - Slug: `reset-password`
   - Title: `Klarpakke - Tilbakestill Passord`
   - Description: `Tilbakestill passordet ditt`

### Page Structure

```
Body
├── Nav (reuse from Home)
│
├── Reset Container (id: "reset-container")
│   │
│   ├── Request Form Section (data-reset-request-form)
│   │   ├── Heading: "Glemt passord?"
│   │   ├── Text: "Skriv inn e-postadressen din..."
│   │   ├── Email Input (data-reset-email)
│   │   ├── Submit Button (data-reset-submit)
│   │   ├── Error Message (data-reset-error) [hidden]
│   │   └── Success Message (data-reset-success) [hidden]
│   │
│   └── Update Form Section (data-password-update-form) [hidden]
│       ├── Heading: "Nytt passord"
│       ├── Text: "Opprett et nytt passord..."
│       ├── New Password Input (data-new-password)
│       ├── Confirm Password Input (data-confirm-password)
│       ├── Submit Button (data-password-update-submit)
│       ├── Error Message (data-password-update-error) [hidden]
│       └── Success Message (data-password-update-success) [hidden]
│
└── Footer (reuse from Home)
```

### Required Data Attributes

| Element | Attribute | Type |
|---------|-----------|------|
| Request form | `data-reset-request-form` | Form |
| Email input | `data-reset-email` | Input (email) |
| Submit button | `data-reset-submit` | Button |
| Error message | `data-reset-error` | Div (hidden) |
| Success message | `data-reset-success` | Div (hidden) |
| Update form | `data-password-update-form` | Form (hidden) |
| New password | `data-new-password` | Input (password) |
| Confirm password | `data-confirm-password` | Input (password) |
| Update button | `data-password-update-submit` | Button |
| Update error | `data-password-update-error` | Div (hidden) |
| Update success | `data-password-update-success` | Div (hidden) |

### Custom Code (Footer)

```html
<script>
  if (window.location.pathname === '/reset-password') {
    const script = document.createElement('script');
    script.src = 'YOUR_PASSWORD_RESET_JS_URL';
    document.body.appendChild(script);
  }
</script>
```

### Content Suggestions

**Request Form:**
- Heading: "Glemt passord?"
- Text: "Skriv inn e-postadressen din, så sender vi deg en link for å tilbakestille passordet."
- Button: "Send tilbakestillings-link"

**Update Form:**
- Heading: "Opprett nytt passord"
- Text: "Velg et sterkt passord med minst 8 tegn."
- Button: "Oppdater passord"

---

## ✉️ Email Verification

### Create Page

1. **Add New Page**
   - Name: `Bekreft E-post`
   - Slug: `verify-email`
   - Title: `Klarpakke - Bekreft E-post`
   - Description: `Bekreft e-postadressen din`

### Page Structure

```
Body
├── Nav (reuse from Home)
│
├── Verification Container (id: "verify-container")
│   ├── Icon (checkmark or email icon)
│   ├── Heading: "Sjekk innboksen din"
│   ├── Text: "Vi har sendt en bekreftelseslenke til [email]"
│   ├── Verification Status (id: "verify-status")
│   ├── Resend Button (id: "resend-verification")
│   └── Continue Button (id: "continue-to-dashboard") [hidden]
│
└── Footer (reuse from Home)
```

### Required IDs

| Element | ID | Purpose |
|---------|-----|---------|
| Container | `verify-container` | Wrapper |
| Email display | `verify-email-display` | Show user email |
| Status message | `verify-status` | Verification result |
| Resend button | `resend-verification` | Resend email |
| Continue button | `continue-to-dashboard` | After verification |

### Content

**Before Verification:**
```
Sjekk innboksen din

Vi har sendt en bekreftelseslenke til din e-post.
Klikk på lenken for å aktivere kontoen din.

Ikke mottatt? [Send på nytt]
```

**After Verification:**
```
✅ E-post bekreftet!

Din konto er nå aktivert og klar til bruk.

[Fortsett til Dashboard]
```

---

## 🚫 Error Pages

### 404 - Not Found

**Create Page:**
- Name: `404 - Ikke Funnet`
- Slug: `404`
- Title: `404 - Side ikke funnet`

**Structure:**
```
Body
├── Nav (simplified, no auth)
│
├── Error Container (id: "error-404")
│   ├── Error Code: "404"
│   ├── Heading: "Oops! Side ikke funnet"
│   ├── Text: "Siden du leter etter eksisterer ikke..."
│   ├── Search Box (optional)
│   └── Buttons
│       ├── Go Home → /
│       └── Contact Support → /help
│
└── Footer
```

**Content:**
```
404

Oops! Side ikke funnet

Siden du leter etter eksisterer ikke eller har blitt flyttet.

[Tilbake til forsiden] [Kontakt support]
```

### 403 - Forbidden

**Create Page:**
- Name: `403 - Ingen Tilgang`
- Slug: `403`
- Title: `403 - Ingen tilgang`

**Structure:**
```
Body
├── Nav (simplified)
│
├── Error Container (id: "error-403")
│   ├── Error Code: "403"
│   ├── Heading: "Ingen tilgang"
│   ├── Text: "Du har ikke tillatelse til å se denne siden..."
│   └── Buttons
│       ├── Login → /login
│       └── Go Home → /
│
└── Footer
```

**Content:**
```
403

Ingen tilgang

Du har ikke tillatelse til å se denne siden.
Logg inn eller kontakt support hvis du tror dette er en feil.

[Logg inn] [Tilbake til forsiden]
```

### 500 - Server Error

**Create Page:**
- Name: `500 - Server Feil`
- Slug: `500`
- Title: `500 - Noe gikk galt`

**Structure:**
```
Body
├── Nav (simplified)
│
├── Error Container (id: "error-500")
│   ├── Error Code: "500"
│   ├── Heading: "Noe gikk galt"
│   ├── Text: "En serverfeil oppstod..."
│   └── Buttons
│       ├── Try Again → reload
│       └── Contact Support → /help
│
└── Footer
```

**Content:**
```
500

Noe gikk galt

En serverfeil oppstod. Vi jobber med å fikse problemet.
Vennligst prøv igjen senere.

[Prøv igjen] [Kontakt support]
```

---

## 📜 Terms & Privacy

### Terms of Service

**Create Page:**
- Name: `Vilkår`
- Slug: `terms`
- Title: `Klarpakke - Vilkår for bruk`

**Structure:**
```
Body
├── Nav (reuse from Home)
│
├── Terms Container (id: "terms-container")
│   ├── Heading: "Vilkår for bruk"
│   ├── Last Updated: [Date]
│   │
│   ├── Section 1: Aksept av vilkår
│   ├── Section 2: Tjenestebeskrivelse
│   ├── Section 3: Brukerkontoer
│   ├── Section 4: Bruksrettigheter
│   ├── Section 5: Betalingsvilkår
│   ├── Section 6: Ansvarsbegrensning
│   ├── Section 7: Personvern
│   ├── Section 8: Endringer av vilkår
│   └── Section 9: Kontaktinformasjon
│
└── Footer (reuse from Home)
```

**Content Template:**

```markdown
# Vilkår for bruk

**Sist oppdatert:** 29. januar 2026

## 1. Aksept av vilkår

Ved å registrere deg og bruke Klarpakke ("Tjenesten"), godtar du disse vilkårene.

## 2. Tjenestebeskrivelse

Klarpakke tilbyr trading-signaler og analyse for kryptovaluta. Signaler er kun veiledende og utgjør ikke finansiell rådgivning.

## 3. Brukerkontoer

- Du må være 18+ år
- Ett konto per person
- Du er ansvarlig for kontosikkerhet
- Ikke del påloggingsinformasjon

## 4. Bruksrettigheter

- Personlig, ikke-kommersiell bruk
- Ikke redistribuer signaler
- Ikke bruk bots eller automatiserte systemer

## 5. Betalingsvilkår

- Abonnement faktureres månedlig
- Kan kanselleres når som helst
- Ingen refusjon for delvise måneder

## 6. Ansvarsbegrensning

- Signaler er ikke garantert nøyaktige
- Trading medfører risiko
- Vi er ikke ansvarlige for tap
- Invester kun hva du har råd til å tape

## 7. Personvern

Se vår [Personvernerklæring](/privacy) for detaljer.

## 8. Endringer av vilkår

Vi kan oppdatere vilkårene. Varsler sendes på e-post.

## 9. Kontaktinformasjon

E-post: kontakt@klarpakke.no
Adresse: [Din adresse]
```

### Privacy Policy

**Create Page:**
- Name: `Personvern`
- Slug: `privacy`
- Title: `Klarpakke - Personvernerklæring`

**Structure:**
```
Body
├── Nav (reuse from Home)
│
├── Privacy Container (id: "privacy-container")
│   ├── Heading: "Personvernerklæring"
│   ├── Last Updated: [Date]
│   │
│   ├── Section 1: Innledning
│   ├── Section 2: Data vi samler inn
│   ├── Section 3: Hvordan vi bruker data
│   ├── Section 4: Datadeling
│   ├── Section 5: Cookies
│   ├── Section 6: Dine rettigheter (GDPR)
│   ├── Section 7: Datasikkerhet
│   └── Section 8: Kontakt oss
│
└── Footer (reuse from Home)
```

**Content Template:**

```markdown
# Personvernerklæring

**Sist oppdatert:** 29. januar 2026

## 1. Innledning

Klarpakke ("vi", "oss") respekterer ditt personvern og er forpliktet til å beskytte personopplysningene dine.

## 2. Data vi samler inn

### Kontodata
- E-postadresse
- Passord (kryptert)
- Navn (valgfritt)

### Bruksdata
- IP-adresse
- Nettlesertype
- Sidevisninger
- Klikk på signaler

### Trading-data
- Signaler du har sett
- Preferanser
- Ytelsesstatistikk

## 3. Hvordan vi bruker data

- Levere tjenesten
- Forbedre brukeropplevelsen
- Send varsler og oppdateringer
- Forebygge svindel og misbruk

## 4. Datadeling

Vi deler IKKE data med tredjeparter, bortsett fra:
- Tjenester vi bruker (Supabase, Webflow)
- Ved lovpålegg

## 5. Cookies

Vi bruker cookies for:
- Holde deg innlogget
- Analysere bruk
- Forbedre tjenesten

Du kan deaktivere cookies i nettleseren.

## 6. Dine rettigheter (GDPR)

Du har rett til:
- **Innsyn:** Se hvilke data vi har om deg
- **Retting:** Korrigere feil data
- **Sletting:** Få slettet kontoen din
- **Begrensning:** Begrense behandling
- **Dataportabilitet:** Få kopi av data
- **Protestere:** Motsette deg behandling

Kontakt oss: kontakt@klarpakke.no

## 7. Datasikkerhet

- SSL/TLS-kryptering
- Passord hashet med bcrypt
- Supabase Row Level Security
- Regelmessige sikkerhetskopier

## 8. Kontakt oss

Spørsmål om personvern?
E-post: kontakt@klarpakke.no
