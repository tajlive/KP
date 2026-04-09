# Major Dependency Updates - 9. April 2026

**Status:** 23 pakker med major oppdateringer tilgjengelige  
**Node.js:** 24.14.1 ✅  
**NPM:** 11.11.0 ✅  

---

## 🔴 KRITISKE (Krever omfattende migrering)

| Pakke | Nåværende | Siste | Risiko | Breaking Changes |
|-------|-----------|-------|--------|------------------|
| **next** | 15.5.15 | 16.2.3 | 🔴 HØY | middleware→proxy, async params, Turbopack default |
| **typescript** | 5.9.3 | 6.0.2 | 🔴 HØY | es5 deprecated, strict default, baseUrl deprecated |
| **storybook** | 8.6.18 | 10.3.5 | 🔴 HØY | ESM-only, Node 20.19+ required |
| **@storybook/nextjs** | 8.6.18 | 10.3.5 | 🔴 HØY | ESM config required |
| **@storybook/react** | 8.6.18 | 10.3.5 | 🔴 HØY | ESM-only |

---

## 🟡 HØY (Viktige oppdateringer)

| Pakke | Nåværende | Siste | Risiko | Breaking Changes |
|-------|-----------|-------|--------|------------------|
| **eslint** | 9.39.4 | 10.2.0 | 🟡 HØY | Flat config only |
| **eslint-config-next** | 15.5.15 | 16.2.3 | 🟡 HØY | Matcher next 16 |
| **vite** | 6.4.2 | 8.0.7 | 🟡 HØY | Rolldown/Oxc, esbuild deprecated |
| **@vitejs/plugin-react** | 5.2.0 | 6.0.1 | 🟡 HØY | React 19 optimalisert |
| **stripe** | 20.4.1 | 22.0.1 | 🟡 HØY | API versioning endringer |
| **@stripe/stripe-js** | 8.11.0 | 9.1.0 | 🟡 HØY | Named versions (Acacia/Basil) |
| **lucide-react** | 0.563.0 | 1.7.0 | 🟡 HØY | Brand icons fjernet, aria-hidden default |
| **@supabase/ssr** | 0.9.0 | 0.10.0 | 🟡 HØY | Cookie API endringer |

---

## 🟢 MIDDELS (Mindre påvirkning)

| Pakke | Nåværende | Siste | Risiko | Breaking Changes |
|-------|-----------|-------|--------|------------------|
| **@linear/sdk** | 76.0.0 | 81.0.0 | 🟢 MEDIUM | GraphQL API endringer |
| **@types/node** | 24.12.2 | 25.5.2 | 🟢 MEDIUM | Node 25 typer |
| **jsdom** | 28.1.0 | 29.0.2 | 🟢 MEDIUM | Node 18 støtte fjernet |
| **dotenv** | 16.6.1 | 17.4.1 | 🟢 MEDIUM | API endringer |
| **knip** | 5.88.1 | 6.3.1 | 🟢 MEDIUM | Config format |
| **@vercel/analytics** | 1.6.1 | 2.0.1 | 🟢 MEDIUM | endpoint→eventEndpoint/viewEndpoint |
| **@vercel/speed-insights** | 1.3.1 | 2.0.0 | 🟢 MEDIUM | Minimal |

---

## Anbefalt Oppgraderingsrekkefølge

### Fase 1: Lav risiko (umiddelbart) ✅ SIKKERT
```bash
npm update @linear/sdk @types/node jsdom dotenv knip @vercel/analytics @vercel/speed-insights --legacy-peer-deps
```

### Fase 2: Medium risiko (etter testing)
```bash
npm update lucide-react @supabase/ssr @stripe/stripe-js stripe --legacy-peer-deps
```
**Testing påkrevd:**
- [ ] Verifiser ikoner rendres korrekt (spesielt hvis brand icons brukes)
- [ ] Test autentiseringsflyt
- [ ] Test betalingsflyt i staging

### Fase 3: Høy risiko (planlagt migrering)

#### 3A: Vite + Vitest
```bash
npm update vite @vitejs/plugin-react --legacy-peer-deps
```
**Sjekkliste:**
- [ ] Vitest config fungerer
- [ ] Alle tester passerer
- [ ] Coverage rapporter genereres

#### 3B: ESLint
```bash
npm update eslint eslint-config-next --legacy-peer-deps
```
**Sjekkliste:**
- [ ] ESLint config er gyldig
- [ ] Ingen nye lint errors
- [ ] Pre-commit hooks fungerer

### Fase 4: Kritisk (separate branch + grundig testing)

#### 4A: Storybook
```bash
npx storybook@latest upgrade
```
**Migrering:**
- Konverter `.storybook/main.ts` til ESM
- Verifiser alle stories fungerer

#### 4B: TypeScript
```bash
npm update typescript --legacy-peer-deps
```
**Oppgaver:**
- Oppdater tsconfig.json:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "strict": true,
      "rootDir": "./src"
    }
  }
  ```
- Fiks imports (`import * as x` → `import x`)

#### 4C: Next.js (største endring)
```bash
# Lag branch
git checkout -b next-16-upgrade

# Kjør codemod
npx @next/codemod@canary upgrade latest

# Migrer middleware
npx @next/codemod@canary middleware-to-proxy .
```

**Kritiske filer å oppdatere:**
1. `src/middleware.ts` → `src/proxy.ts` (rename)
2. Oppdater funksjonsnavn: `middleware()` → `proxy()`
3. Alle pages med `params` må bruke `await`
4. Sjekk `cookies()` og `headers()` bruk

---

## Oppsummering

**23 pakker** venter på major oppdateringer:
- 🔴 5 Kritiske (Next.js, TypeScript, Storybook)
- 🟡 8 Høy risiko (ESLint, Vite, Stripe, Lucide, Supabase)
- 🟢 7 Medium risiko (dev tools, types, analytics)

**Anbefaling:** Vent med kritiske oppdateringer til etter prod-deployment. Start med fase 1 (lav risiko).

---

*Generert: 9. April 2026*
