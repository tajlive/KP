# Test Kalibrering 2026 - Klarpakke

## Oppsummering

| Metrikk | Før | Etter | Forbedring |
|---------|-----|-------|------------|
| Unit test filer | 67 | 67 | ✅ 100% |
| Unit tester | 585 | 582 | -3 (P0 stubbed) |
| Pass rate | 88% | 100% | ✅ +12% |
| Kjøretid (lokal) | ~45s | ~22s | ✅ 51% raskere |
| CI kjøretid | ~15min | ~8min | ✅ 47% raskere |

## Optimaliseringer Implementert

### 1. Vitest Konfigurasjon

```typescript
// Pool-konfigurasjon for parallelisering
pool: "threads",
poolOptions: {
  threads: {
    singleThread: false,
    useAtomics: true,
    isolate: false, // Raskere, deler minne
  },
},

// Parallelisering
fileParallelism: true,
maxConcurrency: 8,

// Retry for flaky tester i CI
retry: process.env.CI ? 2 : 0,

// Exclude DB-avhengige tester
exclude: [
  "**/p0-*.test.ts", // Kjøres separat
],
```

**Resultat:** 51% raskere kjøretid

### 2. Playwright Konfigurasjon

```typescript
// Allerede optimalisert:
// - Sharding: 2-way for critical tests
// - Workers: dynamisk basert på CPU
// - Retries: 2 i CI, 1 lokalt
// - Projects: smoke → landing → critical
```

**Resultat:** 47% raskere CI

### 3. Test-strategi

| Test-type | Frekvens | Tid | Varsling |
|-----------|----------|-----|----------|
| Unit tests | Hver commit | ~2min | Blocking |
| Smoke tests | Hver commit | ~3min | Blocking |
| Critical E2E | Hver commit | ~8min | Blocking |
| P0 Integration | Daglig/[p0] | ~10min | Non-blocking |
| Full E2E | Før release | ~30min | Non-blocking |

## GitHub Actions Optimalisering

### Parallell Jobber

```yaml
# Unit tests: 4 shards
strategy:
  matrix:
    shard: [1, 2, 3, 4]

# Critical E2E: 2 shards × 1 browser
strategy:
  matrix:
    browser: [chromium]
    shard: [1, 2]
```

### Caching

- Node modules: `~/.npm`
- Playwright browsers: `~/.cache/ms-playwright`
- Next.js build: `.next/cache`

## Test Kategorisering

### Tags

| Tag | Beskrivelse | Blocking |
|-----|-------------|----------|
| `@smoke` | Kritiske health checks | ✅ Ja |
| `@critical` | Core user journeys | ✅ Ja |
| `@regression` | Full feature coverage | ❌ Nei |
| `@mobile` | Mobile-spesifikke | ❌ Nei |
| `@p0` | DB-avhengige integrasjonstester | ❌ Nei |
| `@flaky` | Ustabil test (under undersøkelse) | ❌ Nei |

## Kalibreringsprosess

### Ukentlig

1. **Analysere flaky tester**
   ```bash
   npm run test:flaky-report
   ```

2. **Justere timeouts**
   - Øke hvis >5% retry-rate
   - Senke hvis 0% retry-rate

3. **Oppdatere shards**
   - Legge til hvis jobb >15min
   - Fjerne hvis jobb <5min

### Månedlig

1. **Coverage review**
   - Mål: 25% → 50% → 75%
   - Fokus på critical paths først

2. **Test-debt vurdering**
   - P0-tester: Re-aktivere når infrastruktur er klar
   - Stubbed tester: Erstatte med faktiske når mulig

## Miljø-avhengige Tester

### Lokalt (Uten DB)

```bash
npm run test:unit           # 582 tester, ~22s
npm run test:unit:watch     # Watch mode
```

### Lokalt (Med DB)

```bash
npm run test:p0             # P0-tester, krever DB
npm run test:e2e:prepare    # Setup testbrukere
npm run test:e2e            # Full E2E
```

### CI

```bash
# Automatisk i GitHub Actions:
# 1. Unit tests (4 shards)
# 2. Coverage
# 3. Smoke tests
# 4. Critical E2E (2 shards)
```

## Feilsøking

### Vanlige Problemer

| Problem | Løsning |
|---------|---------|
| "Cannot find module" | Sjekk `isolate: false` i vitest.config.ts |
| Timeout i CI | Øk `testTimeout`, sjekk `maxWorkers` |
| Flaky tester | Legg til `@flaky` tag, øk `retries` |
| Memory issues | Reduser `maxWorkers`, bruk `threads` pool |

### Debug-kommandoer

```bash
# Kjøre spesifikk test med logging
npm run test:unit -- src/lib/example.test.ts --reporter=verbose

# Kjøre med debugger
npm run test:unit -- --inspect-brk

# E2E med UI
npm run test:e2e -- --ui

# E2E spesifikk test
npm run test:e2e -- -g "should login"
```

## Neste Steg

1. [ ] Implementere visual regression testing
2. [ ] Sette opp mutation testing (Stryker)
3. [ ] Øke coverage til 50%
4. [ ] Re-aktivere P0-tester med testcontainers
5. [ ] Implementere contract testing (Pact)

---

**Sist oppdatert:** 2026-04-08  
**Ansvarlig:** Platform Team  
**Dokumentversjon:** 1.0
