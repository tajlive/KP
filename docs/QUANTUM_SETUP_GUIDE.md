# QUANTUM SETUP GUIDE - KLARPAKKE

Denne guiden automatiserer 95% av Webflow-oppsettet!

## HVA ER LAGET FOR DEG?

✅ `webflow/klarpakke-bundle.js` - ÉN fil med ALT (auth, login, signup, dashboard)
✅ `EMBEDDED_COMPLETE.txt` - Ferdig kode for alle sider
✅ Auto-detektering av sider - bundle vet hvilken side du er på

## STEG 1: LAST OPP BUNDLE (2 min)

1. Åpne Webflow Designer
2. Klikk **Assets** (bilde-ikon i venstre sidebar)
3. Klikk **Upload**
4. Velg fil: `webflow/klarpakke-bundle.js`
5. Vent til opplasting er ferdig
6. **Klikk på filen** i Assets-panelet
7. Kopier URL-en (ser ut som: `https://cdn.prod.website-files.com/.../klarpakke-bundle.js`)

## STEG 2: GLOBAL SITE SETTINGS (3 min)

1. Klikk **Webflow-logoen** (øverst venstre)
2. Velg **Site Settings**
3. Gå til **Custom Code**-fanen
4. I **Head Code**, lim inn:

```html
<script>
  window.KLARPAKKE_CONFIG = {
    SUPABASE_URL: 'https://swfyuwkptusceiouqlks.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk'
  };
</script>

<script src="DIN_BUNDLE_URL"></script>

<style>
  [data-login-error], [data-signup-error], [data-signup-success] {
    display: none; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
  }
  [data-login-error], [data-signup-error] { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  [data-signup-success] { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  .signal-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .btn-approve { background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; margin-right: 8px; }
  .btn-reject { background: #ef4444; color: white; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; }
</style>
```

5. Bytt ut `DIN_BUNDLE_URL` med URL-en du kopierte i Steg 1
6. Klikk **Save Changes**

## STEG 3: LEGG TIL DATA-ATTRIBUTTER (10 min)

### Login-side (/login):

| Element | Data-attributt |
|---------|---------------|
| Form | `data-login-form` |
| Email input | `data-login-email` |
| Password input | `data-login-password` |
| Submit button | `data-login-submit` |
| Error div | `data-login-error` |
| Forgot password link | `data-forgot-password` |

**Hvordan:** Klikk element → Trykk D → Custom Attributes → + → Name: `data-login-form` → Save

### Signup-side (/signup):

| Element | Data-attributt |
|---------|---------------|
| Form | `data-signup-form` |
| Email | `data-signup-email` |
| Password | `data-signup-password` |
| Confirm | `data-signup-password-confirm` |
| Terms checkbox | `data-signup-terms` |
| Submit | `data-signup-submit` |
| Error div | `data-signup-error` |
| Success div | `data-signup-success` |

### Home-side (/):

| Element | ID |
|---------|-----|
| Hero section | `hero-section` |
| H1 | `hero-heading` |
| Subheading | `hero-subheading` |
| CTA button | `hero-cta` |
| Features section | `features-section` |
| Feature 1 | `feature-1` |
| Feature 2 | `feature-2` |
| Feature 3 | `feature-3` |

**Hvordan:** Klikk element → Trykk D → ID-feltet øverst → skriv ID → Enter

### Dashboard-side (/app/dashboard):

| Element | ID eller Data-attributt |
|---------|------------------------|
| Main container | `dashboard-container` |
| Welcome H1 | `user-welcome` |
| Logout button | `logout-btn` |
| Stats container | `stats-container` |
| Signals section | `signals-section` |
| Signals list | `data-signals-list` |
| Loading indicator | `data-signals-loading` |
| Signal card (template) | CLASS: `signal-card` |

**VIKTIG:** Signal card skal ha **CLASS** `signal-card`, ikke ID!

### Settings-side (/app/settings):

| Element | ID |
|---------|-----|
| Container | `settings-container` |
| Profile section | `profile-section` |
| Email display | `user-email` |
| Edit button | `edit-profile-btn` |
| Preferences section | `preferences-section` |
| Email checkbox | `pref-email` |
| Push checkbox | `pref-push` |
| Save button | `preferences-save-btn` |
| Logout button | `logout-btn` |

## STEG 4: PUBLISER OG TEST (5 min)

1. Trykk **Ctrl+S** (lagre)
2. Klikk **Publish** (øverst til høyre)
3. Velg **Staging** først
4. Vent 30 sekunder

### Test Login:
1. Gå til `/login`
2. Åpne Console (F12)
3. Skriv inn test-e-post
4. Skriv inn passord
5. Klikk "Logg inn"
6. Du skal omdirigeres til Dashboard

### Test Signup:
1. Gå til `/signup`
2. Fyll inn ny e-post
3. Passord (minst 8 tegn)
4. Bekreft passord
5. Kryss av for vilkår
6. Klikk "Opprett konto"
7. Grønn suksessmelding skal vises

### Test Dashboard:
1. Logg inn
2. Du skal se liste med signaler
3. Klikk **APPROVE** på et signal
4. Status skal endre til "Godkjent ✅"

## FEILSØKING

### "Cannot read property of null"
→ Data-attributt mangler. Sjekk at alle elementer har riktig attributt.

### "supabase is not defined"
→ Bundle-URL er feil. Sjekk at Site Settings har riktig URL.

### Ingen signaler vises
→ Sjekk at signal-card har **CLASS** (ikke ID).

### 404 på /app/dashboard
→ Siden må ha slug `app-dashboard` eller være i mappe `/app/dashboard`.

## HVA GJØR BUNDLE-AUTOMATISERINGEN?

Bundle-filen:
- ✅ Laster Supabase SDK
- ✅ Initialiserer auth-systemet
- ✅ Vet hvilken side du er på (auto-detektering)
- ✅ Håndterer login automatisk
- ✅ Håndterer signup automatisk
- ✅ Håndterer dashboard med signaler
- ✅ Håndterer logout
- ✅ Oppdaterer UI basert på auth-state
- ✅ Auto-refresh av tokens

Du trenger **INGEN** ekstra Custom Code på enkeltsider!

## FERDIG! 🎉

Nå skal alt fungere. Test hver side grundig før du publiserer til produksjon.

Spørsmål? Sjekk Console (F12) for feilmeldinger!