# 🧪 Smart Test Strategi: KIMI + MemPalace + Vercel

> **Problem:** Full Next.js build tar 3-5 minutter → for treg for iterativ utvikling  
> **Løsning:** 3-nivå test-pyramide med raske feedback loops

---

## 🎯 3-Nivå Test-Pyramide

```
        ╱╲
       ╱  ╲     Nivå 3: Vercel Build (5 min) - SIST
      ╱ 🔥 ╲    Full produksjonsbygg
     ╱──────╲
    ╱        ╲
   ╱   Nivå 2:  ╲   Pre-Deploy Check (30 sek) - FØR COMMIT
  ╱   Rask Validering ╲  Lint + TypeScript + Unit tester
 ╱────────────────────────╲
╱                            ╲
╱    Nivå 1: Instant (5 sek)   ╲  - KONTINUERLIG (KIMI)
╱    Config + Syntaks + Mock    ╲   Sjekk filer uten bygg
╱__________________________________╲
```

---

## 🚀 Nivå 1: Instant Feedback (KIMI Primary)

**Brukes av:** KIMI (meg) under aktiv koding  
**Varighet:** 5-10 sekunder  
**Kommando:**

```bash
# 1. Config-syntaks (umiddelbar)
node --check next.config.mjs

# 2. TypeScript-sjekk (rask, uten emit)
npx tsc --noEmit --skipLibCheck

# 3. Fil-sjekk (middleware/proxy)
ls src/proxy.ts && ! ls src/middleware.ts 2>/dev/null
```

**Når:** Etter hver kodeendring, FØR commit

---

## ⚡ Nivå 2: Pre-Deploy Check (KIMI + MemPalace)

**Brukes av:** Før hver Git push  
**Varighet:** 30-60 sekunder  
**Kommando:**

```bash
npm run pre-deploy-check
# eller
node scripts/pre-deploy-check.mjs
```

**Dette sjekker:**
- ✅ ESLint (warnings OK, errors stopper)
- ✅ TypeScript (0 errors)
- ✅ Unit tester (550 tester, ~20s)
- ✅ next.config syntaks
- ✅ Kritiske dependencies

**SKIP build:** Full Next.js build hoppes over (tar for lang tid)

---

## 🔥 Nivå 3: Vercel Build (MemPalace Dokumentasjon)

**Brukes av:** Vercel (etter Git push)  
**Varighet:** 3-5 minutter  
**Trigger:** Automatisk på `git push origin main`

**Hva skjer:**
1. Vercel trigger bygg
2. Full Next.js build (med optimiseringer)
3. Deploy til staging/preview
4. E2E tester kjøres (GitHub Actions)

---

## 📚 MemPalace Rolle

```
┌─────────────────────────────────────────────────────────────┐
│  MemPalace = TEST KUNNSKAPSBASE                              │
├─────────────────────────────────────────────────────────────┤
│  • Lagrer "test patterns" og feilsøkingshistorikk           │
│  • Husker hvilke endringer som introduserte feil            │
│  • Dokumenterer "kjente problemer" og løsninger             │
│  • Søkbar database: "middleware.ts feil" → løsning          │
└─────────────────────────────────────────────────────────────┘
```

**MemPalace kommandoer:**
```bash
# Søk etter tidligere lignende feil
knowledge-search "middleware proxy error"

# Lagre ny kunnskap (etter fiks)
npm run knowledge:mine
npm run knowledge:sync
```

---

## 🔄 Optimalisert Workflow

### Scenario: Fikse Vercel-feil

```bash
# ═══════════════════════════════════════════════════════════
# STEG 1: KIMI Instant Check (5 sek)
# ═══════════════════════════════════════════════════════════
$ node --check next.config.mjs
✅ Config syntaks OK

$ ls src/proxy.ts && ! ls src/middleware.ts
✅ Kun proxy.ts eksisterer

# ═══════════════════════════════════════════════════════════
# STEG 2: KIMI Pre-Deploy (30 sek)
# ═══════════════════════════════════════════════════════════
$ npm run pre-deploy-check
✅ ESLint: 96 warnings (OK)
✅ TypeScript: 0 errors
✅ Unit tester: 550/550 passed
✅ Config: Valid

# ═══════════════════════════════════════════════════════════
# STEG 3: Commit (KIMI)
# ═══════════════════════════════════════════════════════════
$ git add -A
$ git commit -m "fix: fjern duplikat middleware, fiks config"

# ═══════════════════════════════════════════════════════════
# STEG 4: Push → Vercel tar over (KIMI venter på resultat)
# ═══════════════════════════════════════════════════════════
$ git push origin main

# ═══════════════════════════════════════════════════════════
# STEG 5: MemPalace arkivering (ETTER vellykket deploy)
# ═══════════════════════════════════════════════════════════
$ npm run knowledge:mine    # Generer docs
$ npm run knowledge:sync    # Sync til MemPalace
```

---

## 📊 Sammenligning: Før vs Etter

| Metode | Tid | Når | Status |
|--------|-----|-----|--------|
| ❌ `npm run build` lokalt | 5 min | Hver endring | For tregt |
| ✅ **Nivå 1+2** (KIMI) | 30 sek | Hver endring | ✅ BRA |
| ✅ **Nivå 3** (Vercel) | 5 min | Etter push | ✅ OK |

**Tidsbesparelse:** 90% raskere feedback loop

---

## 🛠️ Implementasjon

### 1. Opprett hurtigtest-script

```bash
# scripts/quick-test.sh
#!/bin/bash
echo "🚀 Quick Test (Nivå 1+2)"
echo "═══════════════════════════════════════"

# Nivå 1: Instant
echo "📋 Nivå 1: Config-sjekk..."
node --check next.config.mjs || exit 1
echo "✅ Config OK"

# Nivå 2: Pre-deploy
echo "📋 Nivå 2: Pre-deploy sjekk..."
node scripts/pre-deploy-check.mjs || exit 1
echo "✅ Pre-deploy OK"

echo ""
echo "🎉 Klar for git push!"
echo "Vercel vil kjøre full bygg etter push."
```

### 2. Git hook (valgfritt)

```bash
# .husky/pre-push
#!/bin/bash
npm run test:quick
```

### 3. MemPalace dokumentasjon

```bash
# Lagre test-mønster
echo "## Test Pattern: Vercel Config Feil" >> docs/test-patterns.md
echo "- Sjekk: node --check next.config.mjs" >> docs/test-patterns.md
echo "- Fiks: Se errors i Vercel dashboard" >> docs/test-patterns.md

# Sync til MemPalace
npm run knowledge:sync
```

---

## 🎯 Konklusjon

**KIMI = Rask iterasjon** (kode-endringer, testing)  
**MemPalace = Kunnskapsbevaring** (patterns, historikk)  
**Vercel = Kanonisk bygg** (produksjon, E2E)

**Denne strategien gir:**
- ⚡ 10x raskere utvikling
- 🧠 Bedre kunnskapsdeling (MemPalace)
- 🚀 Pålitelig produksjonsdeploy
