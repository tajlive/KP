# Database Baseline & Migration Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish one canonical Supabase project for type generation, one generated-types file, a clean migration baseline, a single user-init trigger, and CI gates that prevent future drift.

**Architecture:** Stop treating migrations as a running log of production patches. Move diagnostic/repair SQL out of versioned migrations, regenerate types from the true production project, and collapse overlapping user-creation triggers into one canonical function. This makes `supabase db push` trustworthy and reduces signup-related drift.

**Tech Stack:** Supabase CLI, Postgres, TypeScript, GitHub Actions / Husky pre-push.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `package.json` | Correct `db:gen-types` script target |
| `src/types/database.types.ts` | Single generated source of truth |
| `src/lib/supabase/database.types.ts` | **Delete** — duplicate |
| `src/types/database.ts` | **Delete** — stale hand-written types |
| `scripts/sql/diagnostics/` | New home for repair/diagnostic SQL |
| `supabase/migrations/20260701000000_baseline_schema.sql` | Clean baseline from prod pull |
| `supabase/migrations/20260701000001_canonical_user_init.sql` | Single `handle_new_user()` trigger |
| `supabase/migrations/20260701000002_deprecate_profiles.sql` | View + comments for old `profiles` table |
| `.husky/pre-push` | Run `db:status:ci --strict` and `db:lint:ci` |
| `scripts/db-status-ci.mjs` | Wrapper that fails if migration history is dirty |

---

## Task 1: Fix type-generation target

**Files:**
- Modify: `package.json:266`

- [ ] **Step 1: Update the script**

```json
"db:gen-types": "npx supabase gen types typescript --project-id vuxbjlykgmzskxbclquf --schema public > src/types/database.types.ts",
```

- [ ] **Step 2: Verify the project ID matches the production project**

Run:
```bash
grep -R "vuxbjlykgmzskxbclquf" .env.local .env.production .env.production.local 2>/dev/null | head -5
```
Expected: at least one hit in `NEXT_PUBLIC_SUPABASE_URL` or docs.

- [ ] **Step 3: Run type generation**

Run:
```bash
npm run db:gen-types
```
Expected: `src/types/database.types.ts` is regenerated (file timestamp changes, size ~10k lines).

- [ ] **Step 4: Commit**

```bash
git add package.json src/types/database.types.ts
git commit -m "chore(db): generate types from canonical production project"
```

---

## Task 2: Remove duplicate/stale type files

**Files:**
- Delete: `src/lib/supabase/database.types.ts`
- Delete: `src/types/database.ts`
- Modify: any files that import from the deleted paths

- [ ] **Step 1: Find all importers**

Run:
```bash
grep -R "from ['\"].*lib/supabase/database.types['\"]" src/ --include="*.ts" --include="*.tsx"
grep -R "from ['\"].*types/database['\"]" src/ --include="*.ts" --include="*.tsx"
```
Expected: list of files. If empty, proceed. If not empty, update imports to `src/types/database.types.ts`.

- [ ] **Step 2: Delete the files**

```bash
rm src/lib/supabase/database.types.ts
rm src/types/database.ts
```

- [ ] **Step 3: Verify build still passes**

Run:
```bash
npm run type-check
```
Expected: no `Cannot find module` errors for the deleted paths.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(db): delete duplicate and stale database type files"
```

---

## Task 3: Move diagnostic/repair SQL out of versioned migrations

**Files:**
- Create: `scripts/sql/diagnostics/`
- Modify: move selected files from `supabase/migrations/`

- [ ] **Step 1: Identify non-versioned repair scripts**

Run:
```bash
ls supabase/migrations/ | grep -E "^(999_|performance_cleanup_|v3_0|_archive|_historical)"
```
Expected: `999_fix_materialized_view.sql`, `performance_cleanup_20260224`, `v3_0`, `_archive`, `_historical`.

- [ ] **Step 2: Create diagnostics directory and move scripts**

```bash
mkdir -p scripts/sql/diagnostics
mv supabase/migrations/999_fix_materialized_view.sql scripts/sql/diagnostics/
mv supabase/migrations/performance_cleanup_20260224 scripts/sql/diagnostics/
mv supabase/migrations/v3_0 scripts/sql/diagnostics/
```

Keep `_archive` and `_historical` in place but add a `README.md` explaining they are not applied by `supabase db push`.

- [ ] **Step 3: Update db-status allowlist**

Find any script that whitelists `999_fix_materialized_view` and remove that exception.

Run:
```bash
grep -R "999_fix_materialized_view" scripts/ .github/ --include="*.mjs" --include="*.ts" --include="*.yml"
```
Modify the file to remove the special case.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore(db): move diagnostic sql out of versioned migrations"
```

---

## Task 4: Create clean baseline migration

**Files:**
- Create: `supabase/migrations/20260701000000_baseline_schema.sql`

- [ ] **Step 1: Pull current production schema**

Run:
```bash
supabase db pull --linked
```
Expected: a new migration file is created in `supabase/migrations/`.

- [ ] **Step 2: Rename to baseline**

```bash
mv supabase/migrations/*_remote_schema.sql supabase/migrations/20260701000000_baseline_schema.sql
```

- [ ] **Step 3: Remove any data-only inserts from baseline**

Open `supabase/migrations/20260701000000_baseline_schema.sql` and delete `INSERT INTO` statements for seed/reference data. Keep only schema (tables, indexes, functions, triggers, policies).

- [ ] **Step 4: Verify migration applies cleanly to fresh project**

Run:
```bash
supabase db reset
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260701000000_baseline_schema.sql
git commit -m "chore(db): add clean baseline migration from production schema"
```

---

## Task 5: Canonicalize user initialization

**Files:**
- Create: `supabase/migrations/20260701000001_canonical_user_init.sql`
- Create: `supabase/migrations/20260701000002_deprecate_profiles.sql`
- Modify: code that reads from `profiles` (if still used)

- [ ] **Step 1: Audit existing user triggers**

Run:
```bash
grep -R "CREATE OR REPLACE FUNCTION.*handle_new_user" supabase/migrations/ --include="*.sql"
```
Expected: multiple functions like `handle_new_user_consolidated`, `handle_new_user_onboarding_kla158`, etc.

- [ ] **Step 2: Write canonical trigger function**

Create `supabase/migrations/20260701000001_canonical_user_init.sql`:

```sql
-- Single canonical user initialization trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Core profile
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.created_at, NEW.created_at)
  ON CONFLICT (id) DO NOTHING;

  -- Default settings
  INSERT INTO public.user_settings (user_id, created_at, updated_at)
  VALUES (NEW.id, NEW.created_at, NEW.created_at)
  ON CONFLICT (user_id) DO NOTHING;

  -- Paper trading session
  INSERT INTO public.trading_sessions (
    user_id,
    mode,
    initial_capital_nok,
    current_capital_nok,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    'paper',
    100000,
    100000,
    NEW.created_at,
    NEW.created_at
  )
  ON CONFLICT (user_id, mode) DO NOTHING;

  -- Risk profile
  INSERT INTO public.risk_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NEW.created_at, NEW.created_at)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop old triggers
DROP TRIGGER IF EXISTS create_default_user_data ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_consolidated_trigger ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_onboarding_kla158_trigger ON auth.users;

-- Attach canonical trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

- [ ] **Step 3: Deprecate `profiles` table**

Create `supabase/migrations/20260701000002_deprecate_profiles.sql`:

```sql
-- Backfill user_profiles from profiles where missing
INSERT INTO public.user_profiles (id, email, created_at, updated_at)
SELECT id, email, created_at, updated_at
FROM public.profiles
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

-- Create compatibility view
CREATE OR REPLACE VIEW public.profiles_deprecated AS
SELECT * FROM public.profiles;

COMMENT ON TABLE public.profiles IS 'DEPRECATED: use public.user_profiles';
```

- [ ] **Step 4: Verify migration applies**

Run:
```bash
supabase db reset
```
Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260701000001_canonical_user_init.sql
git add supabase/migrations/20260701000002_deprecate_profiles.sql
git commit -m "chore(db): canonicalize user initialization and deprecate profiles"
```

---

## Task 6: Add CI gates

**Files:**
- Create: `scripts/db-status-ci.mjs`
- Modify: `.husky/pre-push`

- [ ] **Step 1: Write db-status CI wrapper**

Create `scripts/db-status-ci.mjs`:

```javascript
#!/usr/bin/env node
import { execSync } from "child_process";

const strict = process.argv.includes("--strict");

try {
  const output = execSync("npx supabase migration list --linked", {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  console.log(output);

  const dirty = output.split("\n").some((line) =>
    line.includes("Applied") && line.includes("Local")
  );

  if (dirty && strict) {
    console.error("❌ Migration history is dirty. Run db:repair-history or db:push.");
    process.exit(1);
  }

  if (dirty) {
    console.warn("⚠️ Migration history is dirty (non-strict mode).");
  }
} catch (err) {
  console.error(err.stderr || err.message);
  process.exit(1);
}
```

Make it executable:
```bash
chmod +x scripts/db-status-ci.mjs
```

- [ ] **Step 2: Add gates to pre-push**

Modify `.husky/pre-push` to include:

```bash
npm run db:lint:ci
node scripts/db-status-ci.mjs --strict
```

If `.husky/pre-push` uses `node scripts/pre-push.mjs`, update that script instead.

- [ ] **Step 3: Add db-gen-types check**

Create a small check script or add to pre-push:

```bash
npm run db:gen-types
git diff --exit-code src/types/database.types.ts || (
  echo "❌ database.types.ts is out of sync. Commit regenerated types." && exit 1
)
```

- [ ] **Step 4: Commit**

```bash
git add scripts/db-status-ci.mjs .husky/pre-push
git commit -m "ci(db): add migration drift and type-sync gates"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run full verification**

```bash
npm run db:gen-types
npm run type-check
npm run db:lint:ci
node scripts/db-status-ci.mjs --strict
```
Expected: all pass.

- [ ] **Step 2: Commit any generated-type changes**

```bash
git add -A
git commit -m "chore(db): sync generated types after baseline cleanup" || echo "No changes"
```

---

## Self-Review

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| Single Supabase project ID for type generation | Task 1 |
| One canonical generated-types file | Tasks 1–2 |
| Diagnostic/repair SQL moved out of migrations | Task 3 |
| Clean baseline migration | Task 4 |
| Canonical user-init trigger | Task 5 |
| CI gates for drift | Task 6 |

**Placeholder scan:** No TBD/TODO. All commands are exact.  
**Type consistency:** `database.types.ts` is the only generated source; `handle_new_user()` is the only new user trigger.  
**Gaps:** None for this subsystem.
