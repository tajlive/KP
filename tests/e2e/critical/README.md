# Critical E2E Tests

Kritiske ende-til-ende-tester for Klarpakke prod.

## Test-filer

| Fil | Beskrivelse | Tag |
|-----|-------------|-----|
| `onboarding.spec.ts` | Ny bruker registrering + onboarding steg 1-5 | @critical @onboarding |
| `paper-trading.spec.ts` | Paper trading: start/pause/resume/stopp sesjon | @critical @papertrading |
| `security.spec.ts` | Bruker-isolasjon, 404 ved uautorisert aksess | @critical @security |
| `i18n.spec.ts` | Språk: /en/ viser engelsk, /no/ viser norsk | @critical @i18n |

## Kjøring

```bash
# Kjør alle kritiske tester
npm run test:e2e:critical

# Kjør spesifikk test-fil
npx playwright test tests/e2e/critical/onboarding.spec.ts

# Kjør med UI-modus (for debugging)
npx playwright test tests/e2e/critical/ --ui

# Kjør mot prod (eksplisitt)
BASE_URL=https://www.klarpakke.no npm run test:e2e:critical
```

## Miljøvariabler

Krever følgende i `.env`:

```bash
BASE_URL=https://www.klarpakke.no
TEST_USER_EMAIL=klarpakke.test+playwright@gmail.com
TEST_USER_PASSWORD=your_password
```

## Viktige assertions

### Onboarding
- Verifiserer redirect til `/onboarding/step/1` etter registrering
- Går gjennom alle 5 steg
- Verifiserer at dashboard laster
- Sjekker at ingen rå i18n-nøkler vises

### Paper Trading
- Oppretter ny sesjon med BTC/USDT + 10 000 kr
- Verifiserer at sesjon vises med korrekt URL
- Tester pause → fortsett → stopp flyt
- Verifiserer at stoppet sesjon vises i liste

### Security
- Bruker A oppretter sesjon
- Bruker B (uten login) får redirect til login
- Bruker B (med login) får 404 ved aksess til A sin sesjon

### i18n
- `/en/dashboard` viser kun engelsk tekst
- `/no/dashboard` viser kun norsk tekst
- Ingen rå i18n-nøkler (f.eks. `dashboard.botStatus.xxx`)

## Feilsøking

```bash
# Debug-modus
DEBUG=pw:api npx playwright test tests/e2e/critical/onboarding.spec.ts

# Med screenshots på hvert steg
npx playwright test tests/e2e/critical/ --screenshot=on

# Trace-viewer
npx playwright test tests/e2e/critical/ --trace=on
npx playwright show-trace test-results/trace.zip
```
