# Supabase Persona-bruker — opprettelse via Admin API

## Opprett bruker

```bash
SR_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY /Users/taj/klarpakke/.env.local | head -1 | cut -d= -f2-)
curl -X POST "https://pskhryjzkobytnfwucrb.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SR_KEY" \
  -H "Authorization: Bearer $SR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "persona@klarpakke.no",
    "password": "EnkeltPassord123!",
    "email_confirm": true,
    "user_metadata": {
      "full_name": "Persona Navn",
      "age": 80,
      "experience": "none",
      "device": "mobile"
    }
  }'
```

Returnerer `id` (UUID) — bruk denne for DB-rader.

## Sett opp user_profiles

```sql
INSERT INTO user_profiles (id, user_id, display_name, full_name, email, 
  trading_experience, ui_theme, font_size_preference, high_contrast_mode, 
  created_at, updated_at)
VALUES ('<auth-id>', '<auth-id>', 'Persona Navn', 'Persona Navn', 'persona@klarpakke.no',
  'beginner', 'dark', 'large', true, NOW(), NOW());
```

**Kritiske pitfall:**
1. `user_profiles.id` MÅ matche `auth.users.id` (foreign key `users(id)`)
2. `trading_experience` MÅ være `'beginner'|'intermediate'|'experienced'|'expert'` (CHECK constraint)
3. `user_profiles` har IKKE auto-generert `id` — må settes eksplisitt
4. Kolonnen `is_onboarded` finnes IKKE — bruk `onboarding_completed`

## Sett opp paper_accounts

```sql
INSERT INTO paper_accounts (user_id, current_balance, initial_balance, created_at, updated_at)
VALUES ('<auth-id>', 100000, 100000, NOW(), NOW())
ON CONFLICT (user_id) DO UPDATE 
SET current_balance = 100000, initial_balance = 100000, updated_at = NOW();
```

## Test login

```bash
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY /Users/taj/klarpakke/.env.local | head -1 | cut -d= -f2-)
curl -s -X POST "https://pskhryjzkobytnfwucrb.supabase.co/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"email":"persona@klarpakke.no","password":"EnkeltPassord123!"}' \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('OK' if 'access_token' in d else 'FAILED')"
```
