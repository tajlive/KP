# Database

> **Versjon:** 1.1.0  
> **Oppdatert:** 2026-02-15  
> **For:** Utviklere, database-administratorer

---

## Overview

- **Platform:** Supabase (PostgreSQL 15+)
- **Project ID:** vuxbjlykgmzskxbclquf
- **RLS:** Enabled on all tables
- **Migrations:** 31 timestamped SQL files in `supabase/migrations/`

---

## Core Tables

### `profiles`

Brukerprofiler, utvider `auth.users`. Automatisert via `handle_new_user()` trigger.

| Column            | Type        | Constraints         | Description             |
| ----------------- | ----------- | ------------------- | ----------------------- |
| id                | uuid        | PK, FK → auth.users | Bruker-ID               |
| email             | text        | NOT NULL, UNIQUE    | E-post                  |
| full_name         | text        |                     | Fullt navn              |
| avatar_url        | text        |                     | Profilbilde (fra OAuth) |
| locale            | text        | DEFAULT 'no'        | Brukerens språkvalg     |
| role              | text        | DEFAULT 'user'      | admin/user              |
| provider          | text        | DEFAULT 'email'     | e-post/google/microsoft |
| google_id         | text        | UNIQUE              | Google OAuth ID         |
| microsoft_id      | text        | UNIQUE              | Microsoft OID           |
| subscription_tier | text        |                     | free/professor/trader   |
| created_at        | timestamptz | DEFAULT now()       | Opprettet               |
| updated_at        | timestamptz | DEFAULT now()       | Sist oppdatert          |

**RLS Policies:**

```sql
-- SELECT: Brukere kan se sin egen profil
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- UPDATE: Brukere kan kun oppdatere sin egen profil
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);
```

**Indexes:**

```sql
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
```

---

### `paper_accounts`

Virtuelle trading-kontoer for simulator.

| Column       | Type        | Constraints     | Description         |
| ------------ | ----------- | --------------- | ------------------- |
| id           | uuid        | PK              | Konto-ID            |
| user_id      | uuid        | FK → profiles   | Eier                |
| balance      | decimal     | DEFAULT 1000000 | Virtuell saldo (kr) |
| total_trades | int         | DEFAULT 0       | Antall trades       |
| created_at   | timestamptz | DEFAULT now()   | Opprettet           |

**RLS:**

```sql
CREATE POLICY "Users can manage own paper accounts"
ON paper_accounts FOR ALL
USING (auth.uid() = user_id);
```

---

### `paper_trades`

Trades i simulator.

| Column      | Type        | Constraints                     | Description               |
| ----------- | ----------- | ------------------------------- | ------------------------- |
| id          | uuid        | PK                              | Trade-ID                  |
| account_id  | uuid        | FK → paper_accounts             | Konto                     |
| symbol      | text        | NOT NULL                        | BTC/USDT, ETH/USDT, etc.  |
| side        | text        | CHECK (side IN ('buy', 'sell')) | Kjøp/salg                 |
| quantity    | decimal     | NOT NULL                        | Antall coins              |
| entry_price | decimal     | NOT NULL                        | Inngangspris              |
| exit_price  | decimal     |                                 | Utgangspris (hvis lukket) |
| status      | text        | DEFAULT 'open'                  | open/closed               |
| profit_loss | decimal     |                                 | P&L i NOK                 |
| created_at  | timestamptz | DEFAULT now()                   | Åpnet                     |
| closed_at   | timestamptz |                                 | Lukket                    |

**RLS:**

```sql
CREATE POLICY "Users can view own trades"
ON paper_trades FOR SELECT
USING (EXISTS (
  SELECT 1 FROM paper_accounts
  WHERE paper_accounts.id = paper_trades.account_id
  AND paper_accounts.user_id = auth.uid()
));
```

---

### `courses`

Kurs på læreplanen.

| Column       | Type    | Constraints                                               | Description       |
| ------------ | ------- | --------------------------------------------------------- | ----------------- |
| id           | uuid    | PK                                                        | Kurs-ID           |
| slug         | text    | UNIQUE                                                    | URL-slug          |
| title        | text    | NOT NULL                                                  | Tittel            |
| description  | text    |                                                           | Beskrivelse       |
| level        | text    | CHECK (level IN ('beginner', 'intermediate', 'advanced')) | Nivå              |
| order_index  | int     | DEFAULT 0                                                 | Rekkefølge        |
| is_published | boolean | DEFAULT true                                              | Publisert         |
| price_nok    | int     | DEFAULT 0                                                 | Pris (0 = gratis) |

**RLS:**

```sql
-- Alle kan se publiserte kurs
CREATE POLICY "Published courses are publicly readable"
ON courses FOR SELECT
USING (is_published = true);

-- Kun admins kan endre
CREATE POLICY "Only admins can modify courses"
ON courses FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
));
```

---

### `lessons`

Leksjoner i kurs.

| Column          | Type    | Constraints   | Description      |
| --------------- | ------- | ------------- | ---------------- |
| id              | uuid    | PK            | Leksjon-ID       |
| course_id       | uuid    | FK → courses  | Kurs             |
| slug            | text    |               | URL-slug         |
| title           | text    | NOT NULL      | Tittel           |
| content         | text    |               | Markdown-innhold |
| order_index     | int     | DEFAULT 0     | Rekkefølge       |
| is_free_preview | boolean | DEFAULT false | Gratis preview   |

**Unique:** `(course_id, slug)`

---

### `user_course_progress`

Brukerens fremgang i kurs.

| Column           | Type        | Constraints   | Description  |
| ---------------- | ----------- | ------------- | ------------ |
| id               | uuid        | PK            | Progress-ID  |
| user_id          | uuid        | FK → profiles | Bruker       |
| course_id        | uuid        | FK → courses  | Kurs         |
| lesson_id        | uuid        | FK → lessons  | Leksjon      |
| is_completed     | boolean     | DEFAULT false | Fullført     |
| progress_percent | int         | CHECK (0-100) | Prosent      |
| completed_at     | timestamptz |               | Fullført tid |

**RLS:**

```sql
CREATE POLICY "Users can manage own progress"
ON user_course_progress FOR ALL
USING (auth.uid() = user_id);
```

---

### `subscriptions`

Stripe abonnementer.

| Column                 | Type        | Constraints   | Description               |
| ---------------------- | ----------- | ------------- | ------------------------- |
| id                     | uuid        | PK            | Subscription-ID           |
| user_id                | uuid        | FK → profiles | Bruker                    |
| stripe_subscription_id | text        | UNIQUE        | Stripe ID                 |
| tier                   | text        |               | Gratis/Basis/Komplett/Pro |
| status                 | text        |               | active/canceled/past_due  |
| current_period_start   | timestamptz |               | Periode start             |
| current_period_end     | timestamptz |               | Periode slutt             |
| cancel_at_period_end   | boolean     | DEFAULT false | Kanselleres ved slutt     |

---

### `beta_applications`

Beta-program søknader.

| Column      | Type        | Constraints       | Description               |
| ----------- | ----------- | ----------------- | ------------------------- |
| id          | uuid        | PK                | Søknad-ID                 |
| user_id     | uuid        | FK → profiles     | Søker                     |
| reason      | text        |                   | Hvorfor vil de delta      |
| status      | text        | DEFAULT 'pending' | pending/approved/rejected |
| approved_at | timestamptz |                   | Godkjent tid              |
| created_at  | timestamptz | DEFAULT now()     | Søkt                      |

---

## RLS Policies Summary

All tables have RLS enabled. Pattern:

| Table                | SELECT Policy              | INSERT Policy | UPDATE Policy | DELETE Policy |
| -------------------- | -------------------------- | ------------- | ------------- | ------------- |
| profiles             | Own profile                | Auth trigger  | Own profile   | No            |
| paper_accounts       | Own accounts               | Own user_id   | No            | No            |
| paper_trades         | Via account                | Own account   | No            | No            |
| courses              | Public if published        | Admin only    | Admin only    | Admin only    |
| lessons              | Public if course published | Admin only    | Admin only    | Admin only    |
| user_course_progress | Own progress               | Own user_id   | Own progress  | No            |
| subscriptions        | Own subscription           | Service role  | Service role  | Service role  |
| beta_applications    | Own application            | Own user_id   | Admin only    | No            |

---

## Common Queries

### Get user's portfolio

```sql
SELECT
  pa.id as account_id,
  pa.balance,
  pa.total_trades,
  COUNT(pt.id) FILTER (WHERE pt.status = 'open') as open_positions,
  COALESCE(SUM(pt.profit_loss), 0) as total_pnl
FROM paper_accounts pa
LEFT JOIN paper_trades pt ON pa.id = pt.account_id
WHERE pa.user_id = auth.uid()
GROUP BY pa.id;
```

### Get course progress

```sql
SELECT
  c.id,
  c.title,
  c.level,
  COUNT(l.id) as total_lessons,
  COUNT(ucp.id) FILTER (WHERE ucp.is_completed = true) as completed_lessons,
  ROUND(
    COUNT(ucp.id) FILTER (WHERE ucp.is_completed = true) * 100.0 / NULLIF(COUNT(l.id), 0)
  ) as progress_percent
FROM courses c
LEFT JOIN lessons l ON c.id = l.course_id
LEFT JOIN user_course_progress ucp ON l.id = ucp.lesson_id AND ucp.user_id = auth.uid()
WHERE c.is_published = true
GROUP BY c.id, c.title, c.level;
```

### Get leaderboard

```sql
SELECT
  p.username,
  p.avatar_url,
  pa.total_trades,
  COALESCE(SUM(pt.profit_loss), 0) as total_pnl,
  CASE
    WHEN pa.total_trades >= 100 THEN 'master'
    WHEN pa.total_trades >= 50 THEN 'pro'
    WHEN pa.total_trades >= 20 THEN 'trader'
    ELSE 'rookie'
  END as badge
FROM profiles p
JOIN paper_accounts pa ON p.id = pa.user_id
LEFT JOIN paper_trades pt ON pa.id = pt.account_id
WHERE p.consent_paper_trading_public = true
GROUP BY p.id, p.username, p.avatar_url, pa.total_trades
ORDER BY total_pnl DESC
LIMIT 100;
```

---

## Indexes

### Performance-critical indexes

```sql
-- Foreign keys
CREATE INDEX idx_paper_trades_account_id ON paper_trades(account_id);
CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_progress_user_id ON user_course_progress(user_id);

-- Common queries
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);

-- Timestamps (for sorting)
CREATE INDEX idx_trades_created_at ON paper_trades(created_at DESC);
```

---

## Migrations

### Running migrations

```bash
# Local
supabase db push

# Production (via CI)
bash scripts/full-deploy.sh
```

### Creating new migration

```bash
supabase migration new migration_name
# Edit supabase/migrations/<timestamp>_migration_name.sql
```

### Migration conventions

1. **Idempotent:** Always use `IF NOT EXISTS`

   ```sql
   CREATE TABLE IF NOT EXISTS table_name (...);
   CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);
   ```

2. **Safe defaults:** Include `ON DELETE` for foreign keys

   ```sql
   user_id uuid REFERENCES profiles(id) ON DELETE CASCADE
   ```

3. **Timestamps:** Always use `timestamptz`
   ```sql
   created_at timestamptz DEFAULT now()
   ```

---

## Backup

```bash
# Manual backup
bash scripts/backup-db.sh

# Automated (daily via CI)
# Configured in .github/workflows/backup.yml
```

---

## Related

- [ARCHITECTURE.md](01-ARCHITECTURE.md) - System architecture
- [SECURITY.md](09-SECURITY.md) - Security deep-dive
- [runbooks/database-migration.md](runbooks/database-migration.md) - Migration runbook
