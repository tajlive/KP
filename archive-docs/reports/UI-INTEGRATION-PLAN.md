# UI Integration Plan: Gamle og Nye Layout

**Dato:** February 10, 2026
**Status:** ✅ Kartlegging fullført

---

## 📊 Nåværende Arkitektur

### Layout-fil struktur:

```
src/app/
├── layout.tsx                          [ROOT LAYOUT]
│   └── Imports: Navigation ✅ (med Handel + LanguageSwitcher)
│
├── [locale]/
│   ├── layout.tsx                      [LOCALE LAYOUT]
│   │   └── Imports: Navigation ✅ (med Handel + LanguageSwitcher)
│   │
│   ├── innlogging/
│   │   ├── page.tsx
│   │   └── InnloggingClient.tsx        ← BRUKER locale layout ✅
│   │
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── DashboardClient.tsx         ← BRUKER locale layout ✅
│   │
│   └── beta/
│       ├── dashboard/
│       ├── live-trading/
│       └── connect-exchange/
│
├── (app)/
│   └── layout.tsx                      [PROTECTED LAYOUT]
│       └── Checks auth → redirects to /innlogging
│       └── For protected routes
│
└── auth/
    └── callback/page.tsx               ← OAuth returnerer hit
        └── Redirects to /${locale}/dashboard
```

---

## 🎯 Flow: OAuth Login → Dashboard

**Før fix:**
```
1. User klikker "Google" på innlogging-siden
   ↓
2. GoogleSignInButton.tsx redirects to Google
   ↓ (med redirectTo: 'https://www.klarpakke.no/auth/callback')
   ↓
3. Google redirects back to auth/callback/page.tsx
   ↓
4. auth/callback redirects to /${locale}/dashboard
   ↓
5. ✅ User ser dashboard med Navigation (Handel + NO/EN switcher)
```

**Problem:**
- Bruker ser ikke Handel-meny på innlogging-siden (InnloggingClient rendererer custom header)
- Men innlogging-siden ER under locale layout som har Navigation
- Navigation burde vises på top of page

**Mulig årsak:**
- Navigation renderes, men blir kanskje skjult av InnloggingClient styling
- Eller Navigation krever useEffect som ikke triggrer ved build-time

---

## ✅ Hva Virker Allerede

| Komponent | Lokasjon | Status | Noter |
|-----------|----------|--------|-------|
| **Navigation** | `src/components/layout/Navigation.tsx` | ✅ Klar | Har Handel + LanguageSwitcher |
| **Locale layout** | `src/app/[locale]/layout.tsx` | ✅ Klar | Imports Navigation |
| **Root layout** | `src/app/layout.tsx` | ✅ Klar | Imports Navigation |
| **InnloggingClient** | `src/app/[locale]/innlogging/InnloggingClient.tsx` | ✅ Klar | Bruker locale layout |
| **Auth callback** | `src/app/auth/callback/page.tsx` | ✅ Klar | Redirects to dashboard |
| **Dashboard** | `src/app/[locale]/dashboard/` | ✅ Klar | Bruker locale layout |
| **Beta dashboard** | `src/app/[locale]/beta/dashboard/` | ✅ Klar | Bruker locale layout |

---

## ❌ Problemer

### Problem 1: Navigation vises ikke på innlogging i statisk export

**Årsak:**
- `Navigation.tsx` bruker `useEffect()` for auth-check (lines 33-37)
- I statisk export, client components kjører først på klienten
- Navigation må vises synkront, ikke async

**Løsning:**
- Navigation må kunne renderes uten async auth-check
- Handel-dropdown vises alltid, men lenker peker til protected pages som redirect hvis ikke logget inn
- eller: Bruk server-side user context

### Problem 2: Innlogging har hardkodet dark theme (slate-950)

**Årsak:**
- InnloggingClient.tsx lines 302, 157 hardkoder `from-slate-950 via-slate-900 to-slate-950`
- Dette er annerledes fra resten av appen

**Løsning:**
- Gjør innlogging-siden konsistent med resten av appen
- eller: Behold dark theme, men sørg for at Navigation vises over

### Problem 3: Ingen klar visuel separasjon mellom "før login" og "etter login" nav

**Løsning:**
- Handel-meny vises alltid (lenker til protected pages)
- LanguageSwitcher vises alltid
- Home/innlogging-lenke endres basert på auth status

---

## 🔧 Handlingsplan

### Steg 1: Fikse Navigation for statisk export

**Fil:** `src/components/layout/Navigation.tsx`

**Endringer:**
- Fjern `useEffect` auth-check som krever hydration
- Handel-dropdown vises uavhengig av auth status
- Lenker under Handel peker til `/beta/dashboard` osv.
- Protected pages redirecter selv hvis ikke innlogget
- LanguageSwitcher vises alltid

**Resultat:** Navigation vises synkront på alle sider inkludert innlogging

### Steg 2: Bekreft innlogging-siden bruker Navigation

**Fil:** `src/app/[locale]/innlogging/page.tsx` + `InnloggingClient.tsx`

**Sjekk:**
- ✅ Side er under `[locale]` folder → bruker locale layout → importerer Navigation
- ✅ Navigation skal vises above InnloggingClient content
- ✅ Dark theme i InnloggingClient er OK, Navigation vises over

**Testest:**
- Gå til `/no/innlogging` i dev
- Verifiser Navigation vises øverst
- Verifiser LanguageSwitcher fungerer
- Verifiser Handel dropdown vises (men peker til /beta/dashboard som krever auth)

### Steg 3: Bekreft dashboard redirect

**Fil:** `src/app/auth/callback/page.tsx`

**Sjekk:**
- ✅ Redirects to `/${locale}/dashboard` etter OAuth
- ✅ `/dashboard` bruker locale layout → viser Navigation
- ✅ Handel dropdown vises når innlogget

**Test:**
- OAuth login flow
- Etter login → dashboard → Handel dropdown vises

### Steg 4: Sørg for bare én layout i prod

**Sjekk for legacy:**
- ✅ Finn alle layout.tsx filer
- ✅ Sørg for at bare følgende aktive:
  - `src/app/layout.tsx` (root)
  - `src/app/[locale]/layout.tsx` (localized)
  - `src/app/(app)/layout.tsx` (protected, for /app/* routes)
  - `src/app/admin/layout.tsx` (admin panel)
- ✅ Merk `layout.tsx.backup` som legacy

---

## 📋 Testplan

### Pre-Deploy Test (lokal)

```bash
npm run build
npm run dev
```

1. **Innlogging side** (`/no/innlogging`):
   - [ ] Ser Navigation øverst
   - [ ] Ser LanguageSwitcher (NO/EN)
   - [ ] Ser Handel dropdown (lenker til `/beta/dashboard`)
   - [ ] Dark theme under Navigation

2. **OAuth Login**:
   - [ ] Click "Google" button
   - [ ] Redirects to auth/callback
   - [ ] Redirects to `/no/dashboard`
   - [ ] Dashboard viser Navigation

3. **Dashboard** (`/no/dashboard`):
   - [ ] Ser Navigation
   - [ ] Ser Handel dropdown
   - [ ] Klikk "Dashboard" → navigerer til `/no/beta/dashboard`
   - [ ] Klikk "Live Handel" → navigerer til `/no/beta/live-trading`
   - [ ] Klikk "Koble til Exchange" → navigerer til `/no/beta/connect-exchange`

4. **Language Switcher**:
   - [ ] På innlogging: Klikk EN → redirects to `/en/innlogging`
   - [ ] På dashboard: Klikk EN → redirects to `/en/dashboard`

### Post-Deploy Test (prod)

```bash
bash scripts/beta-full-deploy-local.sh
```

- Same 4 tests above, on production URL

---

## 📝 Sammendrag

| Del | Status | Notat |
|-----|--------|-------|
| **Navigation komponent** | ✅ Klar | Har Handel + LanguageSwitcher |
| **Layout struktur** | ✅ Klar | Alle sider bruker riktig layout |
| **OAuth flow** | ✅ Klar | Redirects to dashboard |
| **Fix needed** | 🔧 Pending | Fjern useEffect fra Navigation for SSR/export |
| **Testing** | ⏳ Pending | Verifiser på dev og prod |

---

## 🎯 Success Criteria

✅ **Bruker ser samme Navigation overalt:**
- Før login: `/no/innlogging` → Navigation + LanguageSwitcher + Handel dropdown
- Etter login: `/no/dashboard` → Navigation + LanguageSwitcher + Handel dropdown
- Beta pages: `/no/beta/live-trading` → Navigation + Handel dropdown

✅ **Handel dropdown virker:**
- Links point to `/no/beta/dashboard`, `/no/beta/live-trading`, `/no/beta/connect-exchange`
- Links are protected (redirect to innlogging if not authenticated)

✅ **LanguageSwitcher virker:**
- Click NO → `/no/...` pages load in Norwegian
- Click EN → `/en/...` pages load in English

✅ **Build og deploy:**
- `npm run build` → 0 errors
- `wrangler pages deploy` → Success
- No console errors on production

---

*Opprettet: February 10, 2026*
