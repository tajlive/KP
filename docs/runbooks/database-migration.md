# Runbook: Database migrasjon

**Eier:** Taj  
**Bruk når:** Trenger å legge til/endre database schema  

## Steg

### 1. Lag ny migrasjon

```bash
supabase migration new beskrivelse_av_endring
```

Dette oppretter: `supabase/migrations/YYYYMMDDHHMMSS_beskrivelse_av_endring.sql`

---

### 2. Skriv migrasjon

**Konvensjoner:**

```sql
-- Idempotent (ALLTID IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS new_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_new_table_user_id ON new_table(user_id);

-- RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own data"
ON new_table FOR ALL
USING (auth.uid() = user_id);

-- Seed data (hvis relevant)
INSERT INTO new_table (user_id, data)
SELECT id, 'default' FROM profiles
ON CONFLICT DO NOTHING;
```

---

### 3. Test lokalt

```bash
# Start local Supabase
supabase start

# Push migrasjon
supabase db push

# Verifiser at den kan kjøres på nytt (idempotent)
supabase db push
```

---

### 4. Commit og deploy

```bash
git add supabase/migrations/
git commit -m "feat: add new_table for X feature"
git push origin main
```

---

### 5. Verifiser i produksjon

```bash
# Sjekk migrasjonsstatus
supabase migration list

# Verifiser tabell eksisterer
supabase sql "SELECT * FROM new_table LIMIT 1"
```

---

## Feilsøking

### Migrasjon feiler

```bash
# Sjekk error
supabase db push

# Reparer hvis nødvendig
supabase migration repair --status reverted <timestamp>
```

### Migrasjon er ikke idempotent

Fix: Legg til `IF NOT EXISTS`:

```sql
-- Før
CREATE TABLE table_name (...);

-- Etter
CREATE TABLE IF NOT EXISTS table_name (...);
```

---

## Related

- [docs/02-DATABASE.md](../02-DATABASE.md)
