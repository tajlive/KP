# KIMI Agent Guide for Klarpakke

**Versjon:** 2.1  
**Oppdatert:** 2026-04-14  
**For:** KIMI CLI i Klarpakke-prosjektet  
**Mål:** Maksimal automasjon, minimal friksjon

---

## Din Kontekst (ALLTID)

Du jobber i `/Users/taj/klarpakke` – en produksjonsklar AI-trading plattform.

```yaml
Project: Klarpakke
Repo: tajlive/KP
Stack: Next.js 15, React 19, TypeScript 5.9, Supabase, Vercel
Status: Production (www.klarpakke.no)
Node: 24.x (se .nvmrc)
```

---

## KIMI Superpowers (Bruk Disse!)

### 1. Automatisk Prosjekt-Kontekst
KIMI leser automatisk:
- `.cursorrules` – tekniske regler
- `AGENTS.md` – prosjekt-status
- `package.json` – scripts og avhengigheter
- `.perplexity/klarpakke-space-prompt.md` – master prompt

### 2. Kjente Kommandoer (Alias)
```bash
# Helse & Status
kimi health          # npm run health:prod:gate
kimi verify          # npm run verify
kimi status          # git status + sjekk

# Utvikling
kimi dev             # npm run dev
kimi build           # npm run build
kimi lint            # npm run lint
kimi typecheck       # npm run type-check

# Testing
kimi test            # npm run test:unit
kimi test:e2e        # npm run test:e2e:critical:chromium
kimi test:auth       # npm run test:unit -- src/lib/auth/__tests__
kimi test:smoke      # npm run test:e2e:smoke

# Database
kimi db:status       # npm run db:status
kimi db:push         # npm run db:push
kimi db:gen          # npm run db:gen-types

# Deploy
kimi deploy          # npm run deploy:prod
kimi preview         # vercel deploy --target=preview

# MemPalace (FTS5)
mempalace search "auth" --wing klarpakke   # Søk kunnskap
mempalace wake-up --wing klarpakke         # Hent kontekst
```

### 3. Smarte Templates
```bash
# Feature
kimi feature "[beskrivelse]"
→ Oppretter branch, implementerer, tester, committer

# Fix
kimi fix "[bug-beskrivelse]"
→ Finner rotårsak, fikser, verifiserer

# Refactor
kimi refactor "[område]"
→ Analyserer, refaktorerer, tester
```

---

## Arbeidsflyt (ALLTID)

### FØR kodeendring:
1. `git status` – sjekk at du er på clean main
2. `npm run verify` – verifiser miljø
3. Les relevante filer – forstå kontekst

### UNDER kodeendring:
1. Gjør minimal endring
2. Test lokalt – `npm run test:unit` for berørte områder
3. Verifiser – `npm run lint && npm run type-check`

### ETTER kodeendring:
1. `git add -A`
2. `git commit -m "type: beskrivelse"`
3. `git push origin main`

---

## Kommando-Patterns

### Pattern A: Undersøk → Analyser → Løs
```
"Undersøk [problem] i /Users/taj/klarpakke. 
1. Finn relevante filer med grep
2. Analyser koden
3. Foreslå løsning
4. Implementer hvis GO"
```

### Pattern B: Implementer → Test → Verifiser
```
"Implementer [feature] i /Users/taj/klarpakke.
1. Sjekk eksisterende kode
2. Implementer endring
3. Kjør relevante tester
4. Verifiser bygg
5. Rapportér GO/NO-GO"
```

### Pattern C: Debug → Fiks → Verifiser
```
"Debug [feil] i /Users/taj/klarpakke.
1. Reproduser/feilsøk
2. Finn rotårsak
3. Implementer minimal fix
4. Verifiser at fix fungerer
5. Commit med forklaring"
```

---

## KIMI-Minne (Husk!)

### Projekt-spesifikt
- **Cron source of truth:** Supabase (ikke Vercel)
- **i18n:** Kun no + en (th/zh avvent)
- **Trading:** Edge Functions eller Supabase scheduler
- **Auth:** @supabase/ssr (ikke auth-helpers-nextjs)
- **Auth refresh:** refresh-guard.ts (mutex + circuit breaker) — se commit 4a98feb1c
- **MemPalace:** SQLite FTS5 (ikke grep raw mode)

### Personlig Preferanser
- YOLO-modus: Alltid aktiv (ikke spør om bekreftelse)
- Minimal endring: Kun det som må til
- Verifiser først: Sjekk før endring
- GO/NO-GO: Alltid tydelig status

### Tekniske Detaljer
- PL/pgSQL: DECLARE på toppnivå, aldri nested
- Testing: Vitest + Playwright
- Lint: ESLint 9 flat config
- Types: Strict, target ES2022

---

## Smarte Snarveier

### Fil-lesing
```
"Les src/lib/trading/core/execute-trade.ts, linje 45-80"
"List src/app/api/cron/"
"Grep pattern=useTradingSession"
```

### Git-operasjoner
```
"Git log --oneline -10"
"Git diff HEAD~1"
"Git show [commit]"
```

### Shell-kommandoer
```
"Shell: cd /Users/taj/klarpakke && npm run verify"
"Shell: lsof -i :3000"
"Shell: killall node"
```

---

## Feilsøking (Når KIMI Strander)

### Hvis kommando feiler:
1. Les feilmelding nøye
2. Sjekk om det mangler env-vars
3. Prøv med `--no-verify` hvis git hook feiler
4. Spør bruker hvis blocker

### Hvis kontekst mangler:
1. Les AGENTS.md
2. Les docs/ARCHITECTURE.md
3. Sjekk package.json scripts
4. Spør hvis fortsatt uklart

### Hvis usikker:
```
"Jeg er usikker på [X]. Alternativer:
A) [alternativ 1]
B) [alternativ 2]
C) Avbryt og forklar mer"
```

---

## Produktivitets-Tips

1. **Bruk tabs** – Åpne flere filer samtidig
2. **Bruk @** – @src/... for rask filreferanse
3. **Kontekst-vindu** – KIMI husker siste ~50k tokens
4. **Undo** – Ctrl+Z fungerer for KIMI-endringer

---

**Husk:** Du er en senior utvikler. Vær proaktiv, effektiv og presis.
