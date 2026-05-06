# Mobil Audit Sjekkliste

> Brukes for å systematisk teste alle sider for "bare hardkodet tekst"-problemer og annen mobil-UX gjeld.

## Hurtigtest (5 min per side)

For hver side: Åpne i Chrome DevTools → Device Mode → iPhone 14 Pro (390×844)

| # | Test | Godkjent | Merk av |
|---|------|----------|---------|
| 1 | Siden laster uten hvit skjerm (>3s) | ☐ | |
| 2 | Ingen horizontal scroll | ☐ | |
| 3 | Bottom-nav overlapper ikke innhold | ☐ | |
| 4 | Minst én data-seksjon, chart, eller card er synlig | ☐ | |
| 5 | Ved tom data: empty state er tydelig (ikke bare liten tekst) | ☐ | |
| 6 | Ved API-feil: feilmelding vises (ikke bare hero) | ☐ | |
| 7 | Touch targets ≥ 44px (kan trykkes uten å treffe feil) | ☐ | |
| 8 | Tekst er lesbar uten zoom (min 14px) | ☐ | |

## Sider å teste

### Offentlige (inkognito)
- [ ] `/no` (forside)
- [ ] `/no/priser`
- [ ] `/no/om-oss`
- [ ] `/no/kontakt`
- [ ] `/no/hjelp`
- [ ] `/no/binance-guide`
- [ ] `/no/kalkulator`
- [ ] `/no/copy-trading`
- [ ] `/no/leaderboard`
- [ ] `/no/tradere`
- [ ] `/no/paper-trading`
- [ ] `/no/live-trading`
- [ ] `/no/personvern`
- [ ] `/no/vilkar`

### Innloggede (krever bruker)
- [ ] `/no/dashboard`
- [ ] `/no/dashboard/resultater`
- [ ] `/no/dashboard/portfolio`
- [ ] `/no/dashboard/handelshistorikk`
- [ ] `/no/dashboard/settings`
- [ ] `/no/dashboard/referral`
- [ ] `/no/dashboard/metrics`
- [ ] `/no/dashboard/strategies`
- [ ] `/no/dashboard/earn`
- [ ] `/no/dashboard/guide`
- [ ] `/no/dashboard/ai`
- [ ] `/no/dashboard/auto-trade`
- [ ] `/no/profile`
- [ ] `/no/varsler`

## Automatiserte verktøy

### 1. Kode-scanner
```bash
node scripts/mobile-audit-scanner.mjs
```
Finner:
- Conditional rendering uten loading/empty state
- `fetch()` uten try/catch
- Fixed chart heights uten mobil-breakpoint
- Grid uten `sm:`/`md:` breakpoints
- `overflow-x-auto` (potensiell horizontal scroll)
- Små touch targets

### 2. Playwright mobil-test
```bash
npx playwright test e2e/mobile/mobile-empty-state-audit.spec.ts --project=chromium-mobile
```
Tester:
- Alle offentlige ruter har synlig innhold
- Auth-ruter har innhold eller tydelig empty-state
- `/resultater` har KPI-kort eller empty-state
- Bottom-nav overlapper ikke innhold
- Ingen horizontal overflow

## Vanlige problemer og fikser

### "Bare hardkodet tekst"
**Årsak:** `data ? <Component /> : null` uten loading skeleton eller empty state.
**Fix:**
```tsx
{loading && <Skeleton />}
{error && <ErrorAlert message={error} />}
{data?.length === 0 && <EmptyState icon={Icon} title={t("emptyTitle")} cta={...} />}
{data && data.length > 0 && <RealContent />}
```

### Fetch uten error-håndtering
**Årsak:**
```tsx
useEffect(() => {
  fetch("/api/...").then(r => r.json()).then(setData);
}, []);
```
**Fix:**
```tsx
useEffect(() => {
  fetch("/api/...")
    .then(r => r.json())
    .then(setData)
    .catch(e => { setError(t("errorLoad")); console.error(e); })
    .finally(() => setLoading(false));
}, []);
```

### Charts for høye på mobil
**Årsak:** `h-[320px]` uten responsiv breakpoint.
**Fix:** `h-[240px] sm:h-[320px]`

### Grid kollapser ikke på mobil
**Årsak:** `grid-cols-3` uten `grid-cols-1` fallback.
**Fix:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
