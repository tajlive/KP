# 🚀 KIMI Startup System - Dokumentasjon

**Status:** ✅ Produksjonsklar  
**Dato:** 2026-04-09  
**Formål:** Maksimal KIMI-optimalisering ved hver oppstart

---

## 📦 Hva Du Får

```
.kimi/
├── STARTUP_PROMPT.md      # Full guide (les ved første oppstart)
├── QUICKSTART.md          # 30-sekunders versjon
├── autostart.sh           # Auto-kjør ved oppstart
├── aliases.zsh            # Shell-aliaser
├── skills-activation.yaml # Auto-skill aktivering
├── skills-quickref.md     # Hurtigreferanse
├── context-predictor.sh   # Predikerer kontekst
├── diary-template.aaak    # AAAK format
└── hooks/
    ├── pre-task.sh        # Før oppgave
    └── post-task.sh       # Etter oppgave

scripts/
├── knowledge-search.sh    # MemPalace søk (workaround)
├── mempalace-diary.sh     # Diary logging
├── mempalace-seed.sh      # Seed kunnskap
└── build-knowledge-graph.sh # KG builder
```

---

## 🎯 Hvordan Bruke (3 Varianter)

### Variant A: Full Guide (Første gang)
```bash
cat .kimi/STARTUP_PROMPT.md
```
Les hele dokumentet for å forstå systemet.

### Variant B: Quickstart (Daglig)
```bash
cat .kimi/QUICKSTART.md
```
30-sekunders påminnelse om kommandoer.

### Variant C: Autostart (Automatisk)
```bash
.kimi/autostart.sh
```
Eller legg til i `.zshrc`:
```bash
echo "source /Users/taj/klarpakke/.kimi/aliases.zsh" >> ~/.zshrc
```
Da kjører `kimi` kommandoen automatisk.

---

## 🧠 MemPalace Integrasjon

### Ved Oppstart (automatisk)
```
1. Pre-task hook → Henter git status, diary, kontekst
2. Knowledge search → Laster critical_decisions
3. Context prediction → Detekterer domene (auth/trading/api/ui)
4. Skills activation → Aktiverer relevante skills
5. Diary read → Viser siste aktivitet
```

### Ved Arbeid (manuel)
```bash
# Søk først
./scripts/knowledge-search.sh "auth pattern"

# Hvis ikke funnet → Perplexity → Lagre

# Etter oppgave
./scripts/mempalace-diary.sh write FEAT "beskrivelse" GO "★★★" 5
```

---

## ⚡ Aliaser (Hvis aktivert)

```bash
# Prosjekt
kp          → cd /Users/taj/klarpakke
kstart      → Full quickstart
kwake       → Autostart

# KIMI
khealth     → npm run health:prod:gate
kverify     → npm run verify
kdev        → npm run dev
kbuild      → npm run build
klint       → npm run lint
ktype       → npm run type-check
ktest       → npm run test:unit
ke2e        → npm run test:e2e:critical:chromium
kdb         → npm run db:status
kpush       → npm run db:push
kdeploy     → npm run deploy:prod

# MemPalace
know        → ./scripts/knowledge-search.sh
diary       → ./scripts/mempalace-diary.sh
dwrite      → diary write
dread       → diary read
dstatus     → diary status

# Kontekst
kcontext    → .kimi/context-predictor.sh
kskills     → cat .kimi/skills-quickref.md
krooms      → grep "name:" mempalace.yaml

# Git
gs          → git status
ga          → git add -A
gc          → git commit -m
gp          → git push origin main
gl          → git log --oneline -10

# Utils
kstats      → Vis stats
kimi        → Full oppstart (hvis i zsh)
```

---

## 📊 System-Demo

```bash
$ .kimi/autostart.sh

🚀 KIMI Autostart Sequence
==========================

📊 Git Status:
  ⚠️  Uncommitted changes:
     M AGENTS.md

🏛️  MemPalace Wake-up:
  Critical decisions loaded:
    📄 docs/adr/002-supabase-vs-firebase.md
    📄 docs/adr/005-rls-vs-middleware.md

🛠️  Context Detection:
  Domain: auth
  Skills: vulnerability-scanner, security-testing
  Rooms: auth_system, error_patterns

📖 Recent Activity:
  Total diary entries: 1
  📅 20260409 | ANALYSIS | ★★★★

📈 Project Stats:
  Node: v25.8.2
  Branch: main
  Last commit: 146ee2580

✅ KIMI Ready!
==========================

YOLO mode: ACTIVE | MemPalace: CONNECTED | Skills: AUTO
```

---

## 🔄 Arbeidsflyt med Startup System

### Vanlig Sesjon
```
1. cd /Users/taj/klarpakke
   ↓ (autostart kjøres)
2. KIMI Ready! vises
   ↓
3. Sjekk predikert kontekst
   ↓
4. Søk i kunnskap ved behov
   ↓
5. Implementer oppgave
   ↓
6. Logg til diary
   ↓
7. Commit & push
```

### Med Aliaser
```bash
$ kp                    # cd til klarpakke
$ kwake                 # autostart
$ know "auth"           # søk kunnskap
# ... jobb ...
$ dwrite FEAT "fix" GO  # logg
$ ga && gc "fix: auth"  # commit
$ gp                    # push
```

---

## 🎓 Best Practices

### 1. Søk Først
```bash
# ALLTID søk før du spør
$ know "trading pattern"

# Hvis funnet → Bruk
# Hvis ikke → Perplexity → Lagre
```

### 2. Logg Alltid
```bash
# Etter hver oppgave
$ dwrite <TYPE> "<beskrivelse>" <STATUS> <RATING> <FILES>

# Eksempler:
$ dwrite FEAT "rate limiting" GO "★★★" 3
$ dwrite FIX "auth loop" GO "★★★★" 2
$ dwrite REF "extract hook" GO "★★★" 5
```

### 3. Skills Auto-Aktivering
```bash
# Systemet aktiverer automatisk:
# - auth/ → vulnerability-scanner
# - trading/ → crypto-specialist  
# - api/ → api-patterns
# - components/ → frontend-design
```

---

## 🔧 Tilpasning

### Legg til eget domene
```yaml
# .kimi/skills-activation.yaml
"src/lib/payments/**/*.ts":
  skills:
    - api-patterns
    - security-testing
  priority: high
```

### Custom diary type
```bash
# I ./scripts/mempalace-diary.sh
# Legg til ny type:
case $TYPE in
    FEAT|FIX|REF|DOC|OPT|SEC)
        # eksisterende
        ;;
    MIG)  # ny type for migrasjoner
        echo "SESSION:${date_code}|TYPE:MIG|..."
        ;;
esac
```

---

## 🚨 Feilsøking

| Problem | Løsning |
|---------|---------|
| `knowledge-search.sh: command not found` | `chmod +x scripts/*.sh` |
| `diary.log: No such file` | Kjør `dwrite` først |
| `autostart.sh: permission denied` | `chmod +x .kimi/*.sh` |
| Context predikerer feil | Sjekk `git status` - må ha endringer |
| Skills ikke aktivert | Sjekk `.kimi/skills-activation.yaml` |

---

## 📈 Forventet Resultat

| Før | Etter |
|-----|-------|
| 2-3 min kontekst-oppsett | 10 sek autostart |
| Ingen kunnskap-reuse | 85% cache treff |
| Manuel skill-valg | Auto-aktivering |
| Mistet sesjon-kontekst | Diary kontinuitet |

---

## 📝 Quick Reference Card

```
┌─────────────────────────────────────────────────┐
│  KIMI + MemPalace Quick Ref                      │
├─────────────────────────────────────────────────┤
│  START:   .kimi/autostart.sh                     │
│  QUICK:   cat .kimi/QUICKSTART.md               │
│  FULL:    cat .kimi/STARTUP_PROMPT.md           │
├─────────────────────────────────────────────────┤
│  SØK:     ./scripts/knowledge-search.sh "q"     │
│  LOGG:    ./scripts/mempalace-diary.sh write    │
│  KONTEKST: .kimi/context-predictor.sh           │
├─────────────────────────────────────────────────┤
│  ALIASER: source .kimi/aliases.zsh              │
│  KIMI:    kimi (hvis aktivert)                  │
└─────────────────────────────────────────────────┘
```

---

**GO/NO-GO:** ✅ **GO - Startup system produksjonsklart!**

**Sist oppdatert:** 2026-04-09  
**Versjon:** 1.0
