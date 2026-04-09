# 🔍 Dependency Audit Report

**Dato:** 2026-04-08  
**Utført av:** Repo Optimizer + Modernization Lead Agent

## 📊 Oversikt

| Kategori | Antall | Status |
|----------|--------|--------|
| **Production deps** | ~75 | 🟡 Mange |
| **Dev deps** | ~50 | 🟡 Mange |
| **Total** | ~125 | 🔴 Høyt |
| **Outdated** | ~25 | 🟡 Trenger oppdatering |
| **Extraneous** | 5 | 🔴 Kan fjernes |

---

## 🔴 Kritiske Funn

### 1. Extraneous Dependencies (Kan fjernes)

```bash
npm ls --depth=0 | grep extraneous
```

| Pakke | Versjon | Årsak |
|-------|---------|-------|
| `@emnapi/core` | 1.9.2 | Orphaned fra gammel installasjon |
| `@emnapi/runtime` | 1.9.2 | Orphaned fra gammel installasjon |
| `@emnapi/wasi-threads` | 1.2.1 | Orphaned fra gammel installasjon |
| `@napi-rs/wasm-runtime` | 1.1.2 | Orphaned fra gammel installasjon |
| `@tybys/wasm-util` | 0.10.1 | Orphaned fra gammel installasjon |

**Fix:**
```bash
npm prune
rm -rf node_modules
npm ci
```

---

### 2. Utdaterte Major Versions

| Pakke | Nåværende | Siste | Risk |
|-------|-----------|-------|------|
| `@storybook/*` | 8.6.18 | 10.3.5 | 🔴 Breaking changes |
| `@vercel/analytics` | 1.6.1 | 2.0.1 | 🟡 Moderat |
| `@vercel/speed-insights` | 1.3.1 | 2.0.0 | 🟡 Moderat |
| `@stripe/stripe-js` | 8.11.0 | 9.1.0 | 🟡 Moderat |
| `@supabase/ssr` | 0.9.0 | 0.10.0 | 🟡 Moderat |
| `@types/node` | 24.12.2 | 25.5.2 | 🟡 Dev only |

**Anbefaling:**
- Storybook: Vurder om det fortsatt brukes aktivt
- Stripe: Planlegg oppgradering (følg Stripe changelog)
- Supabase SSR: Sjekk breaking changes før oppgradering

---

### 3. Potensielt Ubrukte Pakker (Trenger verifisering)

| Pakke | Hvorfor mistenkt | Sjekk |
|-------|-----------------|-------|
| `@coinbase/cds-web` | 8.62.1 - Brukes Coinbase? | `grep -r "coinbase" src/` |
| `@huggingface/inference` | 4.13.15 - AI-feature aktiv? | `grep -r "huggingface" src/` |
| `html2canvas` | 1.4.1 - Brukes til PDF/screenshots? | `grep -r "html2canvas" src/` |
| `opik` | 1.10.54 - Hva er dette? | Sjekk dokumentasjon |
| `pg` | 8.19.0 - Postgres native - trengs? | Brukes kun med Supabase? |
| `@react-email/render` | 2.0.4 - Brukes email rendering? | `grep -r "@react-email" src/` |

---

### 4. Duplisert Funksjonalitet

| Funksjon | Pakke 1 | Pakke 2 | Anbefaling |
|----------|---------|---------|------------|
| **Charts** | `chart.js` | `lightweight-charts` | Vurder å standardisere på én |
| **AI SDK** | `@ai-sdk/openai` | `openai` | Kan være overlapp |
| **HTTP Client** | `fetch` (native) | `axios` (hvis tilstede) | Bruk native fetch |
| **Date handling** | `date-fns` | native `Intl` | Vurder native alternativ |

---

## 🟡 Moderat Risk

### 5. Dev Dependencies i Production

Sjekket - ingen funnet. Alle dev deps er korrekt plassert.

### 6. GitHub Actions

| Action | Versjon | Status |
|--------|---------|--------|
| `actions/checkout` | v5 | ✅ Oppdatert |
| `actions/setup-node` | v5/v4 | ✅ OK (v4 legacy) |
| `actions/github-script` | v7 | ✅ Oppdatert |
| `slackapi/slack-github-action` | v2 | ✅ Oppdatert |

**Anbefaling:** Oppdater `actions/setup-node@v4` til `@v5` i alle workflows.

---

## 🎯 Anbefalte Tiltak

### Umiddelbart (Denne uken)

1. **Rydd extraneous deps:**
   ```bash
   npm prune
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Verifiser mistenkte pakker:**
   ```bash
   grep -r "coinbase\|huggingface\|html2canvas\|opik" src/ --include="*.ts" --include="*.tsx"
   ```

3. **Oppdater patch/minor versions:**
   ```bash
   npm update
   ```

### Kort sikt (Denne måneden)

4. **Vurder Storybook fjerning** (hvis ikke aktivt brukt):
   - Fjerne ~20 dev dependencies
   - Redusere build tid

5. **Standardiser chart-bibliotek:**
   - Velg én: `chart.js` ELLER `lightweight-charts`
   - Fjerne den andre

6. **Planlegg Stripe v9 oppgradering:**
   - Sjekk changelog
   - Test i staging

### Lang sikt (Neste kvartal)

7. **Redusere total bundle size:**
   - Analysere med `@next/bundle-analyzer`
   - Fjerne ubrukte Radix UI komponenter
   - Tree-shaking sjekk

8. **Vurder pnpm:**
   - Raskere installasjon
   - Bedre disk-bruk
   - Striktere dependency management

---

## 📈 Mål

| Mål | Nåværende | Mål | Timeline |
|-----|-----------|-----|----------|
| Prod deps | ~75 | <50 | 3 måneder |
| Dev deps | ~50 | <35 | 3 måneder |
| Outdated | ~25 | <5 | 1 måned |
| Bundle size | Unknown | -30% | 3 måneder |

---

## Neste Steg

1. Kjør `npm prune` for å fjerne extraneous
2. Verifiser mistenkte pakker med grep
3. Commit endringer
4. Oppdater patch/minor versions
5. Planlegg major version oppgraderinger

---

**Ansvarlig:** Modernization Lead Agent  
**Neste review:** 2026-05-08
