# MCP PSQL Kommandoer for test-brukere

## Sjekk eksisterende brukere først

```bash
mcp psql query "SELECT id, email, created_at FROM auth.users WHERE email LIKE 'klarpakke.test%@gmail.com' ORDER BY created_at DESC"
```

## Slett eksisterende test-brukere (hvis du vil starte ferskt)

```bash
mcp psql query "DELETE FROM auth.users WHERE email IN ('klarpakke.test+playwright@gmail.com', 'klarpakke.test+b@gmail.com')"
```

## Opprett test-brukere

Bruk en av disse metodene:

### Metode A: Via Supabase Auth API (anbefalt)

Kjør denne Node.js-koden med MCP:

```bash
# Opprett User A
mcp fetch --method POST "https://$SUPABASE_PROJECT_ID.supabase.co/auth/v1/admin/users" \
  --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --header "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "email": "klarpakke.test+playwright@gmail.com",
    "password": "bilglass123",
    "email_confirm": true
  }'

# Opprett User B  
mcp fetch --method POST "https://$SUPABASE_PROJECT_ID.supabase.co/auth/v1/admin/users" \
  --header "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  --header "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "email": "klarpakke.test+b@gmail.com",
    "password": "bilglass123",
    "email_confirm": true
  }'
```

### Metode B: Direkte SQL (hvis du har superuser-tilgang)

```bash
# User A
mcp psql query "
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'klarpakke.test+playwright@gmail.com',
  crypt('bilglass123', gen_salt('bf')),
  NOW(),
  '{\"provider\":\"email\",\"providers\":[\"email\"]}',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = NOW();
"

# User B
mcp psql query "
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'klarpakke.test+b@gmail.com',
  crypt('bilglass123', gen_salt('bf')),
  NOW(),
  '{\"provider\":\"email\",\"providers\":[\"email\"]}',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET 
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = NOW();
"
```

## Verifiser at brukerne ble opprettet

```bash
mcp psql query "
SELECT 
  id, 
  email, 
  email_confirmed_at IS NOT NULL as email_verified,
  created_at
FROM auth.users 
WHERE email IN ('klarpakke.test+playwright@gmail.com', 'klarpakke.test+b@gmail.com')
ORDER BY created_at DESC
"
```

## Test innlogging (via psql funksjon)

```bash
# Sjekk at passordet fungerer
mcp psql query "
SELECT id, email 
FROM auth.users 
WHERE email = 'klarpakke.test+playwright@gmail.com' 
AND encrypted_password = crypt('bilglass123', encrypted_password);
"
```

## GitHub Secrets (legg til disse)

Etter at brukerne er opprettet, legg til i GitHub repo secrets:

| Secret | Verdi |
|--------|-------|
| `TEST_USER_EMAIL` | klarpakke.test+playwright@gmail.com |
| `TEST_USER_PASSWORD` | bilglass123 |
| `TEST_USER_B_EMAIL` | klarpakke.test+b@gmail.com |
| `TEST_USER_B_PASSWORD` | bilglass123 |

```bash
# Hvis du har gh CLI:
gh secret set TEST_USER_EMAIL -b"klarpakke.test+playwright@gmail.com"
gh secret set TEST_USER_PASSWORD -b"bilglass123"
gh secret set TEST_USER_B_EMAIL -b"klarpakke.test+b@gmail.com"
gh secret set TEST_USER_B_PASSWORD -b"bilglass123"
```
