# KIMI Autopatch Regel — Operativt Minne

> **Gyldig for:** Alle KIMI-sesjoner på Klarpakke  
> **Priority:** CRITICAL — skal aldri overseres

---

## 🔴 Ufravikelige Regler

1. **Alt skal automatiseres**
   - Aldri foreslå manuell editor-endring
   - Aldri "gjør dette manuelt etterpå"
   - Fullfør eller feil med eksplisitt melding

2. **TypeScript patching = AST-first**
   - Kjør `npm run verify:ts-ast` før `type-check`
   - Regex-patcher forbudt i kritiske filer uten fallback
   - Kritiske paths: `src/lib/ai/sonar/`, `src/lib/trading/`, `src/app/api/signal/`

3. **Stage kun relevante filer**
   - Sjekk `git status` før commit
   - Fjern urelaterte filer med `git restore -- staged <fil>`
   - Ingen "oppryddingsfiler" i feature-commits

4. **Test målrettet før full suite**
   - Endret fil i `src/lib/ai/sonar/` → kjør `__tests__/*.test.ts` der først
   - Grønt → kjør full suite om nødvendig
   - Aldri skip test-steg

---

## 🟡 Standard Rekkefølge

```bash
# 1. AST-verifisering (rask)
npm run verify:ts-ast

# 2. Full type-check	npm run type-check

# 3. Målrettede tester
npm run test:unit -- --run <endret-fil>.test.ts

# 4. Stage og commit
git add -A
git commit -m "type(scope): beskrivelse"
```

---

## 🟢 Hvis Blocket

```
❌ IKKE SI: "Rediger manuelt i..."
✅ RIKTIG: "[BLOCKED] Årsak: X. Løsning: Y. Exit: 1"
```

---

## 🔧 Hurtigreferanse

| Kommando | Når |
|----------|-----|
| `npm run verify:ts-ast` | Etter TS-patch, før type-check |
| `npm run type-check` | Før commit |
| `npm run test:unit -- --run <pattern>` | Målrettet testing |
| `git diff --cached --name-only` | Se staged filer |

---

*Dokumentversjon: 1.0*  
*Opprettet: 2026-03-28*
