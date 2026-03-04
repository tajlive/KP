# Apple Sign In - Komplett Oppskrift

## ⚠️ KRAV: Apple Developer Program ($99/år)

Hvis du IKKE har det, hopp over Apple. LinkedIn + Google er nok!

---

## 🇳🇴 Steg-for-steg (Norsk)

### Steg 1: Apple Developer Account
1. https://developer.apple.com/account/resources/
2. Gå til "Certificates, Identifiers & Profiles"

### Steg 2: Opprett App ID
1. "Identifiers" → "App IDs" → "+"
2. Type: "App"
3. **Description**: `Klarpakke Login`
4. **Bundle ID**: `no.klarpakke.auth`
5. Kryss av for "Sign In with Apple"
6. "Continue" → "Register"

### Steg 3: Opprett Service ID
1. "Identifiers" → "Services IDs" → "+"
2. **Description**: `Klarpakke Auth`
3. **Identifier**: `no.klarpakke.auth.service`
4. Enable "Sign In with Apple" → "Configure"
5. **Primary App ID**: Velg app fra steg 2
6. **Domains**: 
   ```
   www.klarpakke.no
   klarpakke.no
   ```
7. **Return URLs**:
   ```
   https://www.klarpakke.no/auth/callback
   ```
8. "Save" → "Continue" → "Register"

### Steg 4: Opprett Private Key
⚠️ **VIKTIG**: Last ned .p8 filen - du får BARE ÉN SJANSE!

1. "Keys" → "+"
2. **Name**: `Klarpakke Sign In Key`
3. Kryss av "Sign In with Apple"
4. "Configure" → Velg Primary App ID
5. "Save" → "Continue" → "Register"
6. **LAST NED .p8 FILEN!**
7. Kopier **Key ID** (f.eks. `ABC123DEF4`)

### Steg 5: Generer Client Secret

1. Finn din **Team ID**: Apple Developer → Membership
2. Lag filen `generate-secret.js`:

```javascript
const jwt = require('jsonwebtoken');
const fs = require('fs');

const privateKey = fs.readFileSync('AuthKey_ABC123DEF4.p8'); // DIN .p8 FIL
const teamId = 'TEAM_ID'; // DIN TEAM ID
const clientId = 'no.klarpakke.auth.service';
const keyId = 'ABC123DEF4'; // DIN KEY ID

const token = jwt.sign({
  iss: teamId,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 15777000, // 6 måneder
  aud: 'https://appleid.apple.com',
  sub: clientId,
}, privateKey, {
  algorithm: 'ES256',
  header: { alg: 'ES256', kid: keyId },
});

console.log(token);
```

3. Kjør: `node generate-secret.js`
4. Kopier output (lang tekststreng)

### Steg 6: Supabase
1. https://app.supabase.com/project/_/auth/providers
2. Finn "Apple" → Toggle **ON**
3. **Services ID**: `no.klarpakke.auth.service`
4. **Client ID**: `no.klarpakke.auth.service`
5. **Client Secret**: (lim inn fra steg 5)
6. **Save**

✅ FERDIG!

---

## 🇬🇧 Step-by-step (English)

Same steps, just use English in Apple Developer interface.

---

## 🎨 TEKST / TEXT
```tsx
{locale === 'no' ? 'Fortsett med Apple' : 'Continue with Apple'}
```

## ⚠️ VIKTIG
Client Secret utløper etter 6 måneder. Du må regenerere den da!
