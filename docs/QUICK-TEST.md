# 🚀 Klarpakke - Quick Test Guide

Rask guide for å teste hele systemet på 5 minutter.

---

## ✅ PRE-TEST CHECKLIST

Før du tester, sjekk at:
- ✅ Edge Functions er deployed (approve-signal, get-signals)
- ✅ Webflow JavaScript filer er uploaded
- ✅ Custom code er lagt til i Webflow
- ✅ Webflow siden er published

---

## 🧪 TEST 1: Backend API (1 min)

Disse skal returnere `401 Unauthorized` (som er **korrekt** - de krever auth):

### Test get-signals:
```bash
curl https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals
```
**Forventet:** `{"code":401,"message":"Missing authorization header"}`

### Test approve-signal:
```bash
curl -X POST https://swfyuwkptusceiouqlks.supabase.co/functions/v1/approve-signal \
  -H "Content-Type: application/json" \
  -d '{"signal_id":"test","action":"approve"}'
```
**Forventet:** `{"code":401,"message":"Missing authorization header"}`

✅ **Hvis begge returnerer 401 = API fungerer!**

---

## 🧪 TEST 2: Opprett Test Bruker (2 min)

### Metode 1: Via Supabase Dashboard (ENKLEST)

1. **Gå til:**
   ```
   https://supabase.com/dashboard/project/swfyuwkptusceiouqlks/auth/users
   ```

2. **Klikk "Add User"** (grønn knapp øverst)

3. **Fyll inn:**
   - Email: `admin@klarpakke.com`
   - Password: `KlarpakkeTest2026!`
   - ✅ Auto Confirm User (kryss av!)

4. **Klikk "Create User"**

5. **Gå til SQL Editor:**
   ```
   https://supabase.com/dashboard/project/swfyuwkptusceiouqlks/sql/new
   ```

6. **Lim inn og kjør:**
   ```sql
   -- Assign admin role
   INSERT INTO user_roles (user_id, role)
   SELECT id, 'admin'
   FROM auth.users
   WHERE email = 'admin@klarpakke.com'
   ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

   -- Create 5 test signals
   INSERT INTO signals (id, title, direction, confidence, status, created_by)
   SELECT
     gen_random_uuid(),
     'Test Signal ' || i || ': ' ||
       CASE WHEN i % 2 = 0 THEN 'BTC/USD' ELSE 'ETH/USD' END ||
       CASE WHEN i % 3 = 0 THEN ' Long' ELSE ' Short' END,
     CASE WHEN i % 3 = 0 THEN 'long' ELSE 'short' END,
     (60 + random() * 30)::integer,
     'pending',
     (SELECT id FROM auth.users WHERE email = 'admin@klarpakke.com')
   FROM generate_series(1, 5) i;

   -- Verify
   SELECT 'User created:' as status, email, id
   FROM auth.users
   WHERE email = 'admin@klarpakke.com'
   UNION ALL
   SELECT 'Signals created:' as status,
          COUNT(*)::text as email,
          NULL as id
   FROM signals
   WHERE created_by = (SELECT id FROM auth.users WHERE email = 'admin@klarpakke.com');
   ```

7. **Klikk "Run"** (CMD/CTRL + Enter)

✅ **Du skal se:**
- 1 rad: "User created" med email og ID
- 1 rad: "Signals created: 5"

---

## 🧪 TEST 3: Test Login Flow (1 min)

1. **Åpne i nettleser:**
   ```
   https://klarpakke-c65071.design.webflow.com/login
   ```

2. **Åpne Developer Console** (CMD + Option + J)

3. **Sjekk Console Output - skal se:**
   ```
   ✅ Klarpakke scripts loaded
   ✅ Auth module loaded
   ✅ Login page loaded
   ✅ Supabase client initialized
   ```

4. **Hvis du ser errors:**
   - ❌ "Supabase is not defined" → Mangler Supabase library i HEAD code
   - ❌ "KlarpakkeAuth is not defined" → Feil URL til auth.js i Footer code
   - ❌ 404 errors → JavaScript filer ikke uploaded til Webflow

5. **Logg inn:**
   - Email: `admin@klarpakke.com`
   - Password: `KlarpakkeTest2026!`

6. **Forventet resultat:**
   - ✅ Redirect til dashboard (/)
   - ✅ Console viser: "✅ Login successful"

---

## 🧪 TEST 4: Test Dashboard (1 min)

**På dashboard siden:**

1. **Sjekk Console Output:**
   ```
   ✅ User logged in: admin@klarpakke.com
   ✅ Fetching signals...
   ✅ Signals loaded: 5
   ```

2. **Sjekk UI:**
   - ✅ Brukerinfo vises (admin@klarpakke.com)
   - ✅ Logout knapp synlig
   - ✅ 5 test signaler vises
   - ✅ "Approve" og "Reject" knapper på hver signal

3. **Test Approve:**
   - Klikk "Approve" på et signal
   - Console skal vise: "✅ Signal approved"
   - Signal forsvinner fra listen (eller status endres)

4. **Test Reject:**
   - Klikk "Reject" på et annet signal
   - Console skal vise: "✅ Signal rejected"
   - Signal forsvinner fra listen (eller status endres)

5. **Test Logout:**
   - Klikk "Logout" knappen
   - Skal redirectes til /login
   - Console viser: "✅ Logged out"

---

## 🧪 TEST 5: Verify Backend (Optional)

**Sjekk at alt ble lagret i Supabase:**

1. **Gå til SQL Editor:**
   ```
   https://supabase.com/dashboard/project/swfyuwkptusceiouqlks/sql/new
   ```

2. **Kjør:**
   ```sql
   -- Check signal statuses
   SELECT
     title,
     status,
     processed_by IS NOT NULL as was_processed
   FROM signals
   ORDER BY created_at DESC
   LIMIT 10;

   -- Check audit logs
   SELECT
     action,
     timestamp,
     (SELECT email FROM auth.users WHERE id = audit_logs.user_id) as user_email
   FROM audit_logs
   ORDER BY timestamp DESC
   LIMIT 10;
   ```

✅ **Du skal se:**
- Signaler du approved/rejected har oppdatert status
- Audit logs viser alle dine actions

---

## 🐛 TROUBLESHOOTING

### Problem: "Cannot read property 'supabase' of undefined"
**Fix:** Supabase library ikke lastet. Legg til i HEAD code:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

### Problem: "KlarpakkeAuth is not defined"
**Fix:** auth.js ikke lastet. Sjekk:
1. Fil er uploaded til Webflow Assets
2. URL i Footer code er riktig
3. Hard refresh (CMD + Shift + R)

### Problem: "Unauthorized" når du logger inn
**Fix:**
```sql
-- Verify user exists and is confirmed
SELECT
  email,
  email_confirmed_at IS NOT NULL as confirmed
FROM auth.users
WHERE email = 'admin@klarpakke.com';

-- If not confirmed, fix:
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email = 'admin@klarpakke.com';
```

### Problem: Signaler vises ikke
**Fix:** Sjekk console for errors. Test API manuelt:
```javascript
// In browser console:
const session = await KlarpakkeAuth.getSession()
const token = session.access_token
console.log('Token:', token)

fetch('https://swfyuwkptusceiouqlks.supabase.co/functions/v1/get-signals', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3Znl1d2twdHVzY2Vpb3VxbGtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxODY4MDEsImV4cCI6MjA4NDc2MjgwMX0.ZSpSU8pkIDxY0DrBKRitID2Sx6OUUGy1D4bFMVSwWlk'
  }
}).then(r => r.json()).then(console.log)
```

### Problem: CORS Error
**Fix:** Domain mismatch. Hvis du bruker custom domain:
```bash
# Update CORS in Supabase
supabase secrets set CORS_ORIGIN=https://your-custom-domain.com
supabase functions deploy
```

---

## ✅ SUCCESS CRITERIA

Alle disse skal fungere:
- [x] ✅ API returnerer 401 for unauthorized requests
- [x] ✅ Test bruker opprettet med admin rolle
- [x] ✅ 5 test signaler opprettet
- [x] ✅ Login siden laster uten errors
- [x] ✅ Kan logge inn med test credentials
- [x] ✅ Dashboard viser signaler
- [x] ✅ Approve/reject fungerer
- [x] ✅ Audit logs opprettes
- [x] ✅ Logout fungerer

---

## 📞 FORTSATT PROBLEMER?

1. **Sjekk Supabase Logs:**
   ```
   https://supabase.com/dashboard/project/swfyuwkptusceiouqlks/logs/edge-functions
   ```

2. **Sjekk Browser Console** for JavaScript errors

3. **Kjør full test script:**
   ```
   /Users/taj/claude/klarpakke-complete/full-test-and-setup.sql
   ```

4. **Verifiser deployment:**
   ```bash
   supabase functions list
   ```

---

**God testing! 🚀**
