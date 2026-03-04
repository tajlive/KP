# 🎯 HVA GJØR JEG FØRST? - Prioritert Guide

**Realiteten:** Du kan ikke gjøre ALT på én gang. Her er rekkefølgen som gir raskest resultat.

---

## ⚡ KRITISK STI (Gjør dette FØRST - 30 min)

Dette er minimum for å få noe som faktisk fungerer. Alt annet er bonus.

### 🔴 NIVÅ 1: "Det MÅ Funke" (20 min)

| Prioritet | Oppgave | Tid | Hvorfor kritisk? |
|-----------|---------|-----|------------------|
| **1** | Last opp bundle.js til Webflow | 3 min | Uten dette funker ingenting |
| **2** | Site Settings Custom Code | 3 min | Bundle må lastes inn |
| **3** | Login-side: data-attributter | 7 min | Brukere må kunne logge inn |
| **4** | Signup-side: data-attributter | 7 min | Brukere må kunne registrere seg |

**Etter dette:** Du har en fungerende auth-flyt! 🎉

---

### 🟡 NIVÅ 2: "Det Bør Funke" (+15 min)

| Prioritet | Oppgave | Tid | Hvorfor viktig? |
|-----------|---------|-----|-----------------|
| **5** | Dashboard-side: IDs | 10 min | Hovedfunksjonaliteten |
| **6** | Dashboard: signal-card template | 5 min | Viser faktiske data |

**Etter dette:** Brukere kan se og godkjenne signaler! 📊

---

### 🟢 NIVÅ 3: "Det Er Fint Å Ha" (+15 min)

| Prioritet | Oppgave | Tid | Hvorfor fint? |
|-----------|---------|-----|---------------|
| **7** | Home-side: IDs | 5 min | Landing page ser proff ut |
| **8** | Settings-side | 5 min | Brukere kan endre innstillinger |
| **9** | Teste alt grundig | 5 min | Fanger bugs før brukerne |

**Etter dette:** MVP er 100% ferdig! ✅

---

## 🚀 DETALJERTE STEG (Følg dette nøyaktig)

### STEG 1: Bundle-opplasting (3 min) ⏱️

**Hvorfor først:** Alt annet avhenger av denne filen.

```
Webflow Designer
    ↓
Assets (venstre sidebar, bilde-ikon)
    ↓
Upload (lilla knapp)
    ↓
Velg: webflow/klarpakke-bundle.js
    ↓
Klikk på filen → Kopier URL
    ↓
LAGRE URLEN ET STED (Notepad, etc.)
```

**✅ Sjekk:** Du har en URL som ser ut som:
`https://cdn.prod.website-files.com/xxxx/klarpakke-bundle.js`

---

### STEG 2: Site Settings (3 min) ⏱️

**Hvorfor først:** Denne koden lastes på ALLE sider.

```
Webflow-logo (øverst venstre)
    ↓
Site Settings
    ↓
Custom Code-fanen
    ↓
Head Code-feltet
    ↓
Lim inn:
```

```html
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk'
  };
</script>

<script src="DIN_URL_HER"></script>
```

```
Bytt ut DIN_URL_HER med URL fra steg 1
    ↓
Save Changes
```

**✅ Sjekk:** Grønn "Changes saved" melding.

---

### STEG 3: Login-side (7 min) ⏱️

**Hvorfor først:** Brukere må kunne logge inn for å teste dashboard.

**Kun disse 4 attributtene (ignore resten for nå):**

| Element | Data-attributt |
|---------|---------------|
| Form | `data-login-form` |
| Email input | `data-login-email` |
| Password input | `data-login-password` |
| Submit button | `data-login-submit` |

**Hvordan:**
```
Klikk element → Trykk D → Custom Attributes → +
    ↓
Name: data-login-form
Value: (tom)
    ↓
Save
    ↓
Gjenta for alle 4 elementer
```

**✅ Sjekk:** Alle 4 elementer har attributter.

---

### STEG 4: Signup-side (7 min) ⏱️

**Hvorfor først:** Brukere må kunne registrere seg.

**Kun disse 4 attributtene (ignore resten for nå):**

| Element | Data-attributt |
|---------|---------------|
| Form | `data-signup-form` |
| Email | `data-signup-email` |
| Password | `data-signup-password` |
| Submit | `data-signup-submit` |

**Hvordan:** Samme som login.

**✅ Sjekk:** Alle 4 elementer har attributter.

---

### 🎉 TEST NÅ! (5 min) ⏱️

**Dette er viktig:** Test før du gjør mer. Hvis dette funker, er du på rett vei.

```
Ctrl+S (lagre alt)
    ↓
Publish (øverst høyre)
    ↓
Velg staging
    ↓
Vent 30 sek
    ↓
Gå til: https://din-side.webflow.io/login
    ↓
Test login med test@example.com / testpass123
```

**✅ Suksess:** Du blir omdirigert (selv om dashboard er tomt).

**❌ Feil:** Sjekk Console (F12) for røde feilmeldinger.

---

### STEG 5: Dashboard (15 min) ⏱️

**Kun disse elementene:**

| Element | Type | Navn |
|---------|------|------|
| Main wrapper | ID | `dashboard-container` |
| Welcome H1 | ID | `user-welcome` |
| Logout button | ID | `logout-btn` |
| Signals list | Data-attributt | `data-signals-list` |
| Signal card | **CLASS** | `signal-card` |

**VIKTIG om signal-card:**
```html
<!-- RIKTIG (CLASS): -->
<div class="signal-card">

<!-- GALT (ID): -->
<div id="signal-card">
```

---

## 🛑 STOPP HER HVIS...

**Du har nå en FUNGERENDE MVP etter 35 minutter.**

Hvis du:
- ✅ Kan logge inn
- ✅ Kan registrere deg
- ✅ Ser signaler på dashboard
- ✅ Kan klikke APPROVE

...så er du ferdig med det kritiske! Resten kan vente.

---

## 🔄 HVIS DU VIL FORTSETTE (+20 min)

Da kan du gjøre:
- Home-side IDs (5 min)
- Settings-side (5 min)
- Error pages (10 min)
- Polish og testing (10 min)

Men dette er **ikke kritisk** for at tjenesten skal fungere.

---

## ⚠️ VANLIGE FEIL (Unngå disse!)

### Feil 1: Gjøre alt samtidig
❌ **Galt:** Prøve å sette opp alle sider på én gang
✅ **Riktig:** Gjør login først, test, deretter neste

### Feil 2: Glemme å teste underveis
❌ **Galt:** Sette opp 10 ting, så teste
✅ **Riktig:** Test etter hver side

### Feil 3: Rote med data-attributter vs IDs
❌ **Galt:** Bruke ID der det skal være data-attributt
✅ **Riktig:** Følg tabellen nøyaktig

### Feil 4: Bruke ID på signal-card
❌ **Galt:** `<div id="signal-card">`
✅ **Riktig:** `<div class="signal-card">`

---

## 📊 VISUELL OVERSIKT

```
TIDSLINJE (35 min for fungerende MVP)
═══════════════════════════════════════════════════════════

Min 0-3:    Bundle upload ████████░░░░░░░░░░░░ 23%
Min 3-6:    Site Settings ████████████████░░░░ 46%
Min 6-13:   Login side    ████████████████████ 69%
Min 13-20:  Signup side   ████████████████████████ 92%
Min 20-35:  Dashboard     ████████████████████████████ 100%
            + testing

DU HAR NÅ EN FUNGERENDE MVP! 🎉
═══════════════════════════════════════════════════════════
```

---

## 🎯 DITT VALG NÅ:

**A)** Følg denne guiden nøyaktig (35 min → fungerende MVP)

**B)** Gjør alt manuelt uten prioritet (2-3 timer → potensielt rot)

**C)** Bruk Python-scriptet for å generere rapport først

---

**Hva velger du?** 🚀