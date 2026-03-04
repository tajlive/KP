# LinkedIn Login - Komplett Oppskrift

## 🇳🇴 Steg-for-steg (Norsk)

### Steg 1: Opprett LinkedIn App
1. Gå til: https://www.linkedin.com/developers/apps
2. Klikk "Create App"
3. Fyll ut:
   - **App name**: `Klarpakke Universitet`
   - **LinkedIn Page**: (velg din bedriftsside)
   - **App Logo**: Last opp logo fra `/public/logo.png`
   - **Legal terms**: Kryss av
4. Klikk "Create app"

### Steg 2: Aktiver "Sign In with LinkedIn"
1. I app-dashboard, gå til "Products"
2. Finn "Sign In with LinkedIn using OpenID Connect"
3. Klikk "Request access" (vanligvis øyeblikkelig)

### Steg 3: Hent nøkler
1. Gå til "Auth" fanen
2. Kopier **Client ID** (ser ut som: `86abcdefghij`)
3. Klikk "View" på Client Secret
4. Kopier **Client Secret** (ser ut som: `lmnopqrstuvwxyz`)

### Steg 4: Konfigurer OAuth
1. I "Auth" fanen, finn "OAuth 2.0 settings"
2. Under "Authorized redirect URLs", legg til:
   ```
   https://www.klarpakke.no/auth/callback
   ```
3. Klikk "Add" deretter "Save"

### Steg 5: Legg til i Supabase
1. Gå til https://app.supabase.com/project/_/auth/providers
2. Finn "LinkedIn (OIDC)" → Toggle **ON**
3. Lim inn:
   - **Client ID**: (fra steg 3)
   - **Client Secret**: (fra steg 3)
4. Klikk **Save**

✅ FERDIG! Test ved å gå til https://www.klarpakke.no/innlogging

---

## 🇬🇧 Step-by-step (English)

### Step 1: Create LinkedIn App
1. Go to: https://www.linkedin.com/developers/apps
2. Click "Create App"
3. Fill in:
   - **App name**: `Klarpakke University`
   - **LinkedIn Page**: (select your company page)
   - **App Logo**: Upload logo from `/public/logo.png`
   - **Legal terms**: Check the box
4. Click "Create app"

### Step 2: Enable "Sign In with LinkedIn"
1. In app dashboard, go to "Products"
2. Find "Sign In with LinkedIn using OpenID Connect"
3. Click "Request access" (usually instant)

### Step 3: Get credentials
1. Go to "Auth" tab
2. Copy **Client ID** (looks like: `86abcdefghij`)
3. Click "View" on Client Secret
4. Copy **Client Secret** (looks like: `lmnopqrstuvwxyz`)

### Step 4: Configure OAuth
1. In "Auth" tab, find "OAuth 2.0 settings"
2. Under "Authorized redirect URLs", add:
   ```
   https://www.klarpakke.no/auth/callback
   ```
3. Click "Add" then "Save"

### Step 5: Add to Supabase
1. Go to https://app.supabase.com/project/_/auth/providers
2. Find "LinkedIn (OIDC)" → Toggle **ON**
3. Paste:
   - **Client ID**: (from step 3)
   - **Client Secret**: (from step 3)
4. Click **Save**

✅ DONE! Test by going to https://www.klarpakke.no/innlogging

---

## 🎨 NORSK TEKST (Bruk på knappen)
```tsx
{locale === 'no' ? 'Fortsett med LinkedIn' : 'Continue with LinkedIn'}
```

## 🎨 ENGLISH TEXT (Use on button)
```tsx
{locale === 'en' ? 'Continue with LinkedIn' : 'Fortsett med LinkedIn'}
```
