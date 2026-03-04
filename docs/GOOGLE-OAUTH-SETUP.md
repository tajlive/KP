# Google OAuth Branding Setup

## Problem

Google OAuth viser feil navn/branding ved innlogging.

## Løsning

### 1. Åpne Google Cloud Console

Gå til: https://console.cloud.google.com/

### 2. Velg Riktig Prosjekt

- Klikk på prosjektvelgeren øverst
- Velg prosjektet som er koblet til Klarpakke

### 3. Konfigurer OAuth Consent Screen

#### Steg 1: Gå til OAuth Consent Screen

```
Navigation: APIs & Services → OAuth consent screen
URL: https://console.cloud.google.com/apis/credentials/consent
```

#### Steg 2: Rediger App-informasjon

**Obligatoriske felter:**

| Felt                              | Verdi                                        |
| --------------------------------- | -------------------------------------------- |
| **App name**                      | `Klarpakke Universitet`                      |
| **User support email**            | `support@klarpakke.no` eller din admin-epost |
| **App logo**                      | Last opp Klarpakke-logo (512×512 px PNG/JPG) |
| **Application home page**         | `https://www.klarpakke.no`                   |
| **Application privacy policy**    | `https://www.klarpakke.no/no/personvern`     |
| **Application terms of service**  | `https://www.klarpakke.no/no/vilkar`         |
| **Authorized domains**            | `klarpakke.no`                               |
| **Developer contact information** | Din admin-epost                              |

#### Steg 3: Scopes (Tillatelser)

Legg til disse scopene:

- `userinfo.email` - For å hente brukerens e-post
- `userinfo.profile` - For å hente brukerens navn og profilbilde
- `openid` - For å identifisere brukeren

#### Steg 4: Test Users (hvis i Testing mode)

Hvis appen fortsatt er i "Testing" mode:

1. Legg til test-brukere under "Test users"
2. Eller publiser appen til produksjon ved å klikke "PUBLISH APP"

**Viktig:** Apps i Testing mode er begrenset til 100 brukere!

### 4. Verifiser OAuth Client

#### Steg 1: Gå til Credentials

```
Navigation: APIs & Services → Credentials
URL: https://console.cloud.google.com/apis/credentials
```

#### Steg 2: Finn OAuth 2.0 Client ID

Finn din eksisterende OAuth client eller opprett ny:

- Klikk "CREATE CREDENTIALS" → "OAuth client ID"
- Application type: **Web application**
- Name: `Klarpakke Production`

#### Steg 3: Autoriserte Redirect URIs

Legg til disse URIene:

**Produksjon:**

```
https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/callback
```

**Lokal utvikling:**

```
http://localhost:54321/auth/v1/callback
http://localhost:3000/auth/callback
```

#### Steg 4: Kopier Credentials

1. Kopier **Client ID**
2. Kopier **Client Secret**
3. Gå til Supabase Dashboard

### 5. Konfigurer i Supabase

#### Steg 1: Åpne Supabase Dashboard

```
URL: https://supabase.com/dashboard/project/vuxbjlykgmzskxbclquf
```

#### Steg 2: Aktiver Google Provider

```
Navigation: Authentication → Providers → Google
```

#### Steg 3: Legg inn Credentials

| Felt                          | Verdi                            |
| ----------------------------- | -------------------------------- |
| **Enable Google provider**    | ✅ ON                            |
| **Client ID (for OAuth)**     | [Paste fra Google Cloud Console] |
| **Client Secret (for OAuth)** | [Paste fra Google Cloud Console] |
| **Authorized Client IDs**     | [La stå tom]                     |

Klikk "Save"

### 6. Test Login

#### Lokal Testing:

```bash
npm run dev
# Gå til http://localhost:3000/no/innlogging
# Klikk "Logg inn med Google"
```

#### Produksjon:

```
Gå til https://www.klarpakke.no/no/innlogging
Klikk "Logg inn med Google"
```

**Forventet resultat:**

- ✅ Google consent screen viser "Klarpakke Universitet"
- ✅ Logo vises (hvis lastet opp)
- ✅ Support-epost vises
- ✅ Brukeren blir redirected tilbake til Klarpakke etter innlogging

---

## Vanlige Problemer

### Problem: "App is in Testing mode"

**Symptom:** Kun test-brukere kan logge inn

**Løsning:**

1. Gå til OAuth consent screen
2. Klikk "PUBLISH APP"
3. Google kan be om verifisering hvis du bruker sensitive scopes

### Problem: "redirect_uri_mismatch"

**Symptom:** Feilmelding ved innlogging

**Løsning:**

1. Sjekk at redirect URI i Google Cloud Console matcher eksakt:
   ```
   https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/callback
   ```
2. Ingen mellomrom før/etter URL
3. Må være https:// (ikke http://)

### Problem: Feil app-navn vises

**Symptom:** Gammelt navn eller feil branding

**Løsning:**

1. Oppdater "App name" i OAuth consent screen
2. Vent 5-10 minutter på cache refresh
3. Test i inkognitomodus

### Problem: "Access blocked: This app's request is invalid"

**Symptom:** Google blokkerer innlogging

**Løsning:**

1. Sjekk at alle obligatoriske felter er fylt ut i OAuth consent screen
2. Verifiser at authorized domains er korrekt (`klarpakke.no`)
3. Sjekk at privacy policy og terms of service URLer er gyldige

---

## Checklist for Produksjon

- [ ] App name = "Klarpakke Universitet"
- [ ] Logo lastet opp (512×512 px)
- [ ] Support email satt
- [ ] Privacy policy URL: `https://www.klarpakke.no/no/personvern`
- [ ] Terms of service URL: `https://www.klarpakke.no/no/vilkar`
- [ ] Authorized domain: `klarpakke.no`
- [ ] Scopes: openid, email, profile
- [ ] Redirect URI i Google: `https://vuxbjlykgmzskxbclquf.supabase.co/auth/v1/callback`
- [ ] Client ID og Secret kopiert til Supabase
- [ ] App published (ikke i Testing mode)
- [ ] Test login fungerer

---

## Neste Steg

Etter at dette er konfigurert:

1. Test innlogging i produksjon.
2. Sjekk at brukerdata lagres korrekt i Supabase `profiles`-tabell.
3. Verifiser at profilen populeres automatisk av den konsoliderte `handle_new_user()`-triggeren (Sjekk `google_id`, `full_name`, `avatar_url`, og `provider = 'google'`).
4. Verifiser at `locale` blir satt til 'no' som standard (eller 'en' hvis spesifisert).

---

**Status:** ✅ Databasen er klar (via migrasjon 20260215000008). Konfigurasjon i Google Cloud må verifiseres.
