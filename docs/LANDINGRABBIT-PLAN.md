# 🚀 LandingRabbit + Webflow Plan for Klarpakke

## Hva er LandingRabbit?
- SaaS verktøy for å planlegge landing pages
- Google Docs-liknende editor
- Importerer direkte til Webflow
- AI-drevet innholdsforbedring

## Fordeler for Klarpakke:
✅ Raskere enn manuell design
✅ AI-generert innhold basert på målgruppe
✅ Direkte import til Webflow
✅ On-brand styling fra Webflow-siten

---

## 📋 Steg-for-Steg Plan

### Steg 1: Sett opp LandingRabbit
1. Gå til https://landingrabbit.com
2. Registrer konto (kan bruke Webflow login)
3. Koble til Webflow site (Klarpakke)

### Steg 2: Prioriter Sider å Lage

**Gruppe 1 - MVP (4 sider):**
| Side | Type | Formål |
|------|------|--------|
| Signup | Auth | Konvertering av nye brukere |
| Login | Auth | Eksisterende brukere |
| Dashboard | App | Hovedfunksjon |
| Settings | App | Brukerpreferanser |

**Gruppe 2 - Auth/Legal (5 sider):**
| Side | Type | Formål |
|------|------|--------|
| Reset Password | Auth | Passordgjenoppretting |
| Verify Email | Auth | Email bekreftelse |
| Terms | Legal | Juridisk |
| Privacy | Legal | GDPR/Sikkerhet |
| Help | Legal | Support |

**Gruppe 3 - App Features (4 sider):**
| Side | Type | Formål |
|------|------|--------|
| Kalkulator | Feature | Verktøy |
| History | Feature | Trading historikk |
| Profile | Feature | Brukerprofil |
| About | Marketing | Om oss |

**Gruppe 4 - Error Pages (3 sider):**
| Side | Type | Formål |
|------|------|--------|
| 404 | Error | Ikke funnet |
| 403 | Error | Ingen tilgang |
| 500 | Error | Serverfeil |

### Steg 3: Lag Sider i LandingRabbit

For hver side:
1. **Velg Template:** LandingRabbit har SaaS-templates
2. **Skriv innhold:** Fokus på:
   - Tittel og undertittel
   - Hovedfordeler (3-5 punkter)
   - CTA (Call-to-Action)
   - Tekniske detaljer for DOM-ankere
3. **AI-forbedring:** Bruk LandingRabbit's AI til å forbedre copy
4. **Preview:** Se live preview med Klarpakke-styling

### Steg 4: Importer til Webflow

**LandingRabbit → Webflow:**
1. Klikk "Publish to Webflow" i LandingRabbit
2. Kopier URL
3. I Webflow: Paste URL → Import
4. Verifiser at alle DOM-ankere er på plass
5. Legg til HTML Embeds

### Steg 5: Legg til DOM-Ankere

Etter import, legg til i HTML Embed:

**Signup eksempel:**
```html
<div data-klarpakke-page="/signup" data-kp-root="signup">
  <div id="klarpakke-signup-root" data-kp-root="signup"></div>
  <form id="signup-form"></form>
  <input id="signup-email-input" type="email" name="email"></input>
  <input id="signup-password-input" type="password" name="password"></input>
  <input id="signup-confirm-password-input" type="password" name="confirm-password"></input>
  <button id="signup-button" type="submit"></button>
  <div id="signup-error" style="display:none"></div>
</div>
```

---

## 🎯 Content Strategi per Side

### Signup (/signup)
**Mål:** Konverter besøkende til brukere
**Headline:** "Start med trygg krypto-trading i dag"
**Subheadline:** "Få profesjonelle trading-signaler med innebygd risikostyring"
**CTA:** "Opprett gratis konto"
**Features:**
- Paper trading for øving
- Eksklusive trading-signaler
- Risikohåndtering med Trygg Modus
- Real-time varsler

### Login (/login)
**Mål:** Enkel innlogging
**Headline:** "Velkommen tilbake"
**CTA:** "Logg inn"
**Ekstra:** "Glemt passord?" link

### Dashboard (/app/dashboard)
**Mål:** Vise trading-signaler
**Headline:** "Dine Trading Signaler"
**Sections:**
- Signal-feed med filtre
- Paper trading badge
- Porteføljestatus
- Varsler

### Terms (/terms)
**Mål:** Juridisk beskyttelse
**Seksjoner:**
- Vilkår for bruk
- Ansvarsfraskrivelse
- Opphavsrett
- Kontakt

---

## 📊 Tidsanslag

| Gruppe | Sider | Tid per side | Totalt |
|--------|-------|--------------|--------|
| 1 - MVP | 4 | 15 min | 1 time |
| 2 - Auth/Legal | 5 | 10 min | 50 min |
| 3 - Features | 4 | 15 min | 1 time |
| 4 - Error | 3 | 10 min | 30 min |
| **TOTAL** | **16** | - | **~4 timer** |

(Forbedret fra 8-10 timer manuelt)

---

## ⚡ Hva skal vi gjøre NÅ?

Valg:
1. **Start med LandingRabbit** - Jeg guider deg gjennom første side
2. **Fortsett med Designer Extension** - Hvis du foretrekker det
3. **Gjør begge deler** - LandingRabbit for markedsføringssider, Designer for app-sider

Hva velger du?
