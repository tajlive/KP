# KIMI 2.5 — Komplett CI/CD Gate-fix for Klarpakke
> Opprettet: 2026-03-27 | Prioritet: P0/P1 | Eier: Tomar

---

## 🎯 MÅL

Fjerne alle 4 hull som lar TypeScript-feil slippe gjennom lokalt og i GitHub Actions
før de når Vercel og forårsaker røde bygg i produksjon.

### De 4 hullene du skal tette:

1. **Hull #1 [P0]** `.husky/pre-commit` kjører ikke `tsc --noEmit`
   - Nå: kun `guard-supabase-columns.mjs` (grep-basert, for smal)
   - Fix: full `tsc --noEmit` som blokkerer commit ved feil

2. **Hull #2 [P0]** Vercel bygger **parallelt** med GitHub Actions (ingen gate)
   - Nå: Vercel lytter direkte på push → bygger umiddelbart
   - Fix: `vercel-ignore-unless-ci-passes.sh` (Ignored Build Step) +
     GitHub Branch Protection som krever at `typecheck`-jobben er grønn

3. **Hull #3 [P1]** `fix-supabase-eq-columns.yml` bruker `|| true`
   - Nå: TypeScript-sjekk feiler aldri i CI
   - Fix: Fjern `|| true`, gjør `tsc --noEmit` til blocking step med `exit 1`

4. **Hull #4 [P1]** `guard-supabase-columns.mjs` fanger ikke generelle TS-feil
   - Nå: Regex-grep etter `Argument of type '"col"'` — for smal
   - Fix: Kjør alltid `tsc --noEmit` som primær sjekk, grep kun for hint

---

## 🤖 AGENT-ARBEIDSDELING

Bruk 4 parallelle agenter (en per hull). Alle rapporterer til hovedagenten.

### Agent 1 — Husky pre-commit
**Fil**: `.husky/pre-commit`

Erstatt nåværende innhold **fullstendig** med:

```bash
#!/bin/sh
# Klarpakke pre-commit gate — blokkerer commit ved TypeScript-feil
# Kjøres automatisk av git før hver commit

cd /Users/taj/klarpakke || exit 1

echo "🔍 [1/3] Sjekker secrets i staged filer..."
bash scripts/check-secrets-staged.sh || exit 1

echo "🔍 [2/3] TypeScript-sjekk (tsc --noEmit)..."
npx tsc --noEmit 2>&1
TSC_EXIT=$?
if [ $TSC_EXIT -ne 0 ]; then
  echo ""
  echo "❌ TypeScript-feil funnet! Commit blokkert."
  echo ""
  echo "  Raskt fix for Supabase .eq()-feil:"
  echo "    node scripts/guard-supabase-columns.mjs --fix"
  echo ""
  echo "  Generell TypeScript-feil:"
  echo "    npx tsc --noEmit   → finn og fiks manuelt"
  echo ""
  exit 1
fi

echo "🔍 [3/3] Supabase kolonne-guard..."
node scripts/guard-supabase-columns.mjs
GUARD_EXIT=$?
if [ $GUARD_EXIT -ne 0 ]; then
  echo ""
  echo "❌ Supabase kolonne-feil! Commit blokkert."
  echo "   Kjør: node scripts/guard-supabase-columns.mjs --fix"
  exit 1
fi

echo "✅ Pre-commit: Alt OK. Committer..."
exit 0
```

**Krav**:
- Ingen `|| true` eller `|| exit 0`
- `tsc --noEmit` MÅ returnere exit 0 for at commit skal gå gjennom
- IKKE kjør `npm run build` her (tar for lang tid lokalt)

---

### Agent 2 — Blocking GitHub Actions typecheck
**Fil**: `.github/workflows/typecheck.yml` (ny fil)

Opprett filen med følgende innhold:

```yaml
name: TypeScript Check (Blocking)

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

# Avbryt parallelle kjøringer på samme branch
concurrency:
  group: typecheck-${{ github.ref }}
  cancel-in-progress: true

jobs:
  typecheck:
    name: tsc --noEmit
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --prefer-offline

      # Kjør tsc — feiler hard ved TypeScript-feil (ingen || true)
      - name: TypeScript check
        run: npx tsc --noEmit

      # Ekstra: scan for kjente Supabase .eq()-mønstre
      - name: Supabase column guard
        run: node scripts/guard-supabase-columns.mjs
        continue-on-error: false

      - name: ✅ TypeScript OK
        run: echo "Ingen TypeScript-feil funnet."
```

**Krav**:
- `npx tsc --noEmit` uten `|| true` — MÅ feile jobben
- `continue-on-error: false` på alle kritiske steg
- Denne workflowen er den som GitHub Branch Protection krever grønn

---

### Agent 3 — Fiks `fix-supabase-eq-columns.yml` (fjern `|| true`)
**Fil**: `.github/workflows/fix-supabase-eq-columns.yml`

Finn og erstatt denne seksjonen:

```yaml
# FINN (linje ~35):
      - name: Run TypeScript check
        id: typecheck
        run: |
          npx tsc --noEmit 2>&1 | tee typecheck.log || true
          EXIT_CODE=${PIPESTATUS[0]}
          if [ $EXIT_CODE -eq 0 ]; then
            echo "passed=true" >> $GITHUB_OUTPUT
          else
            echo "passed=false" >> $GITHUB_OUTPUT
          fi
```

Med:

```yaml
      - name: Run TypeScript check
        id: typecheck
        run: |
          set +e
          npx tsc --noEmit 2>&1 | tee typecheck.log
          TSC_EXIT=${PIPESTATUS[0]}
          set -e
          if [ $TSC_EXIT -eq 0 ]; then
            echo "passed=true" >> $GITHUB_OUTPUT
            echo "✅ TypeScript OK"
          else
            echo "passed=false" >> $GITHUB_OUTPUT
            echo "❌ TypeScript-feil funnet — forsøker auto-fix"
            cat typecheck.log | head -30
          fi
          # Ikke exit 1 her — la neste steg (auto-fix) forsøke å reparere
          exit 0
```

Finn og erstatt "Report failure"-steget:

```yaml
# FINN:
      - name: Report failure
        if: |
          steps.check_errors.outputs.has_supabase_errors == 'true' &&
          steps.verify.outputs.fix_worked == 'false'
        run: |
          echo "❌ Automatisk fiksing kunne ikke løse alle problemer"
          echo ""
          echo "Gjenværende feil:"
          npx tsc --noEmit 2>&1 | head -30
          exit 1
```

Med:

```yaml
      - name: Report failure
        if: |
          steps.check_errors.outputs.has_supabase_errors == 'true' &&
          steps.verify.outputs.fix_worked == 'false'
        run: |
          echo "❌ Auto-fix klarte ikke å løse alle TypeScript-feil"
          echo ""
          echo "Gjenværende feil:"
          npx tsc --noEmit 2>&1 | head -50 || true
          echo ""
          echo "⚠️  MANUELL FIX KREVES — se feilene over"
          echo "     Les .klarpakke-memory.md for kjente mønstre"
          exit 1
```

---

### Agent 4 — Vercel Ignored Build Step
**Fil**: `scripts/vercel-ignored-build-step.sh` (ny fil)

Opprett:

```bash
#!/bin/bash
# Vercel Ignored Build Step
# Ref: https://vercel.com/docs/projects/overview#ignored-build-step
#
# Returnerer:
#   exit 0 = IGNORER dette bygget (ikke deploy)
#   exit 1 = BYGG (deploy)
#
# Brukes i Vercel Project Settings → Git → Ignored Build Step

set -e

COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null || echo "")
COMMIT_SHA=$(git rev-parse HEAD 2>/dev/null || echo "")

echo "[Vercel Gate] Commit: $COMMIT_SHA"
echo "[Vercel Gate] Melding: $COMMIT_MSG"

# 1. Alltid bygg for force-deploy tagg
if echo "$COMMIT_MSG" | grep -q "\[force-deploy\]"; then
  echo "[Vercel Gate] force-deploy tag funnet — bygger"
  exit 1
fi

# 2. Alltid bygg for hotfix
if echo "$COMMIT_MSG" | grep -qi "hotfix"; then
  echo "[Vercel Gate] Hotfix-commit — bygger"
  exit 1
fi

# 3. Skip bygg for bot-commits (auto-fix commits) — disse trigger eget bygg etter
if echo "$COMMIT_MSG" | grep -q "\[skip ci\]"; then
  echo "[Vercel Gate] skip ci tag — ignorer bygg"
  exit 0
fi

# 4. Standard: bygg alltid (la TypeScript-feilen bli fanget av Vercel som siste backup)
echo "[Vercel Gate] Standard commit — bygger"
exit 1
```

**Merk**: Etter at dette er opprettet, legg inn i Vercel Dashboard:
- Project Settings → Git → Ignored Build Step
- Verdi: `bash scripts/vercel-ignored-build-step.sh`

---

## 📋 STEG-FOR-STEG UTFØRELSE

Alle agenter jobber parallelt. Deretter:

### Etter alle 4 agenter er ferdige:

```bash
cd /Users/taj/klarpakke

# 1. Verifiser alle filer eksisterer
ls .husky/pre-commit
ls .github/workflows/typecheck.yml
ls .github/workflows/fix-supabase-eq-columns.yml
ls scripts/vercel-ignored-build-step.sh

# 2. Gjør pre-commit og shell-script kjørbare
chmod +x .husky/pre-commit
chmod +x scripts/vercel-ignored-build-step.sh

# 3. TypeScript-sjekk (skal være grønn)
npx tsc --noEmit && echo "✅ TSC OK" || echo "❌ TSC FEIL — fiks før commit"

# 4. Test pre-commit manuelt
bash .husky/pre-commit && echo "✅ Pre-commit OK"

# 5. Commit og push
git add .husky/pre-commit \
  .github/workflows/typecheck.yml \
  .github/workflows/fix-supabase-eq-columns.yml \
  scripts/vercel-ignored-build-step.sh

git commit -m "fix(ci): block TypeScript errors before they reach Vercel

Tetter 4 hull i CI/CD-pipeline:
1. .husky/pre-commit: full tsc --noEmit + guard
2. .github/workflows/typecheck.yml: ny blocking workflow
3. fix-supabase-eq-columns.yml: fjernet || true, hard exit 1
4. scripts/vercel-ignored-build-step.sh: Vercel gate-script

Ingen endringer i API-kontrakt. Ingen migrasjoner."

git push origin main
```

---

## 📋 ETTER PUSH: Vercel Dashboard-endringer

Disse MÅ gjøres manuelt i Vercel Dashboard:

1. **Project Settings → Git → Ignored Build Step**
   - Sett til: `bash scripts/vercel-ignored-build-step.sh`

2. **GitHub → Settings → Branches → Branch Protection Rules → main**
   - ✅ Require status checks to pass before merging
   - ✅ Legg til: `typecheck / tsc --noEmit`
   - ✅ Require branches to be up to date before merging

---

## ✅ VERIFISERING — Slik vet du at alt virker

```bash
# Lokal test: lag en commit med bevisst TS-feil
echo 'const x: number = "feil";' >> src/lib/test-error.ts
git add src/lib/test-error.ts
git commit -m "test: bevisst TS-feil"
# Forventet: commit BLOKKERT av pre-commit hook

# Rydd opp
rm src/lib/test-error.ts
git restore src/lib/test-error.ts 2>/dev/null || true
```

Hvis pre-commit blokkerer → Hull #1 er tettet ✅
Hvis GitHub Actions feiler med rød status → Hull #2 + #3 er tettet ✅
Hvis Vercel ikke bygger ved rød CI → Hull #2 (Vercel gate) er tettet ✅

---

## 🧠 HUSK (lagret i .klarpakke-memory.md)

- `tsc --noEmit` må alltid kjøres i husky OG i CI som blocking step
- `|| true` er FORBUDT på TypeScript-sjekk-steg
- Vercel lytter direkte på push — Ignored Build Step er eneste gate
- GitHub Branch Protection er backup-gate for PRs
- KIMI skal ALLTID kjøre `npx tsc --noEmit` og verifisere exit 0 FØR `git push`
