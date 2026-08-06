# Persona-basert QA — Test med ekte brukerprofiler

## Når

Når du skal teste Klarpakke fra en spesifikk brukergruppes perspektiv (eldre, nybegynnere, ikke-tekniske, kun mobil).

## Metodikk

### 1. Definer persona

| Felt | Eksempel |
|------|----------|
| Navn | Gudrun Myhre |
| Alder | 80 |
| Erfaring | Ingen krypto, ingen PC, kun mobil |
| Språk | Norsk |
| Forventning | Enkel, trygg, forståelig |

### 2. Opprett testbruker i Supabase Auth

```bash
SR_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | head -1 | cut -d= -f2-)
curl -X POST "https://pskhryjzkobytnfwucrb.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SR_KEY" \
  -H "Authorization: Bearer $SR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"persona@klarpakke.no","password":"EnkeltPassord!","email_confirm":true,
       "user_metadata":{"full_name":"Persona Navn","age":80,"experience":"none","device":"mobile"}}'
```

### 3. Sett opp DB-rader

```sql
-- user_profiles (id MÅ matche auth.users.id!)
INSERT INTO user_profiles (id, user_id, display_name, trading_experience, font_size_preference, high_contrast_mode, ...)
VALUES ('<auth-id>', '<auth-id>', 'Persona Navn', 'beginner', 'large', true, ...);

-- paper_accounts (100k start)
INSERT INTO paper_accounts (user_id, current_balance, initial_balance, ...)
VALUES ('<auth-id>', 100000, 100000, ...);
```

**Fallgruver:**
- `user_profiles.id` må matche `auth.users.id` (foreign key)
- `trading_experience` må være `'beginner'|'intermediate'|'experienced'|'expert'` (CHECK constraint)
- `user_profiles` har IKKE auto-generert `id` — må settes eksplisitt

### 4. Test alle sider systematisk

| Side | Hva å sjekke | Verktøy | Merk |
|------|-------------|---------|------|
| Landing | Duplikat innhold, "Laster...", i18n-nøkler | web_extract | ✅ Statisk |
| Priser | Tomme kort, manglende priser | Sjekk i18n-nøkler | ⚠️ JS-rendret |
| Om oss | Rå i18n-nøkler (vanligste feil) | web_extract | ✅ Statisk |
| Kurs | Låste kurs, duplikat innhold | web_extract | ✅ Delvis statisk |
| Login | Auth-skjema, OAuth-knapper | Browser eller curl | ❌ web_extract tom |
| Dashboard | Redirect-loop, auth-feil | curl med token | ❌ Krever auth |
| Trade | API-responser, feilmeldinger | curl mot /api/* | ❌ Krever auth |

**Viktig:** `web_extract` kjører IKKE JavaScript. Sider som `/login`, `/priser` (priskort), og alle `/dashboard/*`-sider er JS-rendret og returneres tomme. Se `references/web-extract-limitations.md` for full oversikt.

### 5. Klassifiser funn

| Nivå | Kriterium | Eksempel |
|------|-----------|----------|
| 🔴 Kritisk | Blokkerer bruk fullstendig | i18n-nøkler på hele siden |
| 🟠 Alvorlig | Forvirrer/blokkerer delvis | Duplikat hero, tomme priskort |
| 🟡 Moderat | Dårlig UX | Manglende labels, engelsk tekst |
| 🟢 Lav | Kosmetisk | Skrivefeil, manglende mellomrom |

### 6. Rapport-format

For hver feil: side-URL, hva som er feil, effekt på persona, alvorlighetsgrad.

## Eksempel: Gudrun Myhre-testen (2026-07-29)

20 feil funnet på 7 sider. 5 kritiske (i18n-nøkler, tomme priskort, "Laster..." på alle sider, blank login, ingen auth-knapper). Fikset via 4 parallelle subagenter.

**Viktigste funn:** `OmOssContent.tsx` brukte `namespace: "about"` men all norsk tekst lå under `aboutUs` i `messages/no.json` — alle sider viste rå i18n-nøkler. Løsning: la til `about` namespace med 51 nøkler i både `no.json` og `en.json`.
