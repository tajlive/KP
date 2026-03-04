# Google Login - Komplett Oppskrift

## 🇳🇴 Steg-for-steg (Norsk)

### Steg 1: Google Cloud Console
1. Gå til https://console.cloud.google.com/
2. Velg ditt prosjekt (eller opprett nytt: "Klarpakke")

### Steg 2: Aktiver API
1. Gå til "APIs & Services" → "Library"
2. Søk etter "Google+ API" 
3. Klikk "Enable"

### Steg 3: OAuth Consent Screen
1. Gå til "APIs & Services" → "OAuth consent screen"
2. Velg "External" (hvis ikke Google Workspace)
3. Fyll ut:
   - **App name**: `Klarpakke Universitet`
   - **User support email**: `post@klarpakke.no`
   - **Developer contact**: `post@klarpakke.no`
4. Scopes: Legg til:
   - `.../auth/userinfo.profile`
   - `.../auth/userinfo.email`
5. Test users: Legg til din epost
6. Klikk "Save and Continue"

### Steg 4: Credentials
1. Gå til "Credentials" → "Create Credentials" → "OAuth client ID"
2. **Application type**: "Web application"
3. **Name**: `Klarpakke Web`
4. **Authorized redirect URIs**:
   ```
   https://www.klarpakke.no/auth/callback
   ```
5. Klikk "Create"
6. Kopier **Client ID** og **Client Secret**

### Steg 5: Supabase
1. https://app.supabase.com/project/_/auth/providers
2. Finn "Google" → Toggle **ON**
3. Lim inn Client ID og Secret
4. Klikk **Save**

✅ FERDIG!

---

## 🇬🇧 Step-by-step (English)

### Step 1: Google Cloud Console
1. Go to https://console.cloud.google.com/
2. Select your project (or create new: "Klarpakke")

### Step 2: Enable API
1. Go to "APIs & Services" → "Library"
2. Search for "Google+ API"
3. Click "Enable"

### Step 3: OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Select "External" (unless Google Workspace)
3. Fill in:
   - **App name**: `Klarpakke University`
   - **User support email**: `post@klarpakke.no`
   - **Developer contact**: `post@klarpakke.no`
4. Scopes: Add:
   - `.../auth/userinfo.profile`
   - `.../auth/userinfo.email`
5. Test users: Add your email
6. Click "Save and Continue"

### Step 4: Credentials
1. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
2. **Application type**: "Web application"
3. **Name**: `Klarpakke Web`
4. **Authorized redirect URIs**:
   ```
   https://www.klarpakke.no/auth/callback
   ```
5. Click "Create"
6. Copy **Client ID** and **Client Secret**

### Step 5: Supabase
1. https://app.supabase.com/project/_/auth/providers
2. Find "Google" → Toggle **ON**
3. Paste Client ID and Secret
4. Click **Save**

✅ DONE!

---

## 🎨 TEKST / TEXT
```tsx
{locale === 'no' ? 'Fortsett med Google' : 'Continue with Google'}
```
