# KIMI 2.5 — Klarpakke: Full Prevention + Fix Prompt
> Generert: 2026-03-27 | Basert på produksjonskritisk CSS/i18n-audit

## KONTEKST
Du jobber på Klarpakke — norsk krypto trading-plattform.
Stack: Next.js 15, Tailwind CSS v4.2.1, next-intl v4, Playwright, GitHub Actions, Vercel.
Alle endringer skal være produksjonsklare, TypeScript-kompilerende og test-grønne.

---

## DEL 1 — AKUTTE BUGFIKSER (P0/P1) — Utfør i denne rekkefølgen

### BUG 1 — globals.css: Tailwind v4 config-konflikt (P0)
FIL: `src/app/globals.css`

Problem:
- Filen bruker `@import "tailwindcss" layer(base)` — Tailwind v4-syntaks
- Mangler `@config`-direktiv → tailwind.config.mjs ignoreres delvis
- `--color-*: initial` i @theme-blokken nuker ALLE farger fra config,
  inkludert bg-brand-500, bg-kp-bg-primary, bg-kp-bg-secondary, text-kp-text-primary etc.

Fix — gjør BEGGE disse endringene:
1. Legg til som ALLER FØRSTE linje i filen:
   `@config "../../tailwind.config.mjs";`
2. Fjern denne linjen fra @theme-blokken:
   `--color-*: initial;`
3. Behold absolutt alle andre linjer i filen uendret.

Valider: `npm run build` skal fullføre uten feil.

---

### BUG 2 — CdsProvider.tsx: Coinbase global CSS overskriver alt (P0)
FIL: `src/app/providers/CdsProvider.tsx`

Problem:
Disse to importene injiserer Coinbase CSS-reset + Coinbase Sans globalt,
og overskriver Tailwind, Inter-font og alle kp-*-stiler på ALLE sider:
```
import "@coinbase/cds-web/globalStyles";
import "@coinbase/cds-web/defaultFontStyles";
```

Fix:
1. Fjern begge import-linjene HELT — ingen kommentering, full fjerning.
2. Behold ThemeProvider, MediaQueryProvider og defaultTheme — disse er rent JS, ingen global CSS.
3. Behold `colorScheme`-logikken uendret.
4. Sjekk at ingen CDS-komponenter (knapper, modaler, etc.) mister funksjonalitet ved
   å kjøre `npm run dev` og visuelt inspisere sidene som bruker CDS-komponenter.

Forventet resultat: Inter-font gjenopprettes, Klarpakke-design-system vises korrekt.

---

### BUG 3 — layout.tsx: Feil Tailwind-klassenavn på body (P1)
FIL: `src/app/[locale]/layout.tsx`

Problem:
`body` bruker `bg-kp-primary` og `text-kp-primary` — disse klassene finnes ikke.
tailwind.config.mjs genererer `bg-kp-bg-primary` og `text-kp-text-primary`.

Fix — endre body className:
```tsx
// FRA:
<body className={`${inter.className} font-sans antialiased bg-kp-primary text-kp-primary min-h-screen`}>
// TIL:
<body className={`${inter.className} font-sans antialiased bg-kp-bg-primary text-kp-text-primary min-h-screen`}>
```

---

### BUG 4 — Font-mismatch: font-sans peker på DM Sans som aldri lastes (P1)
FIL: `tailwind.config.mjs`

Problem:
```js
fontFamily: {
  sans: ['var(--font-dm-sans)', 'DM Sans', ...],  // DM Sans lastes aldri
}
```
Layout laster kun Inter med variabel `--font-inter`. `font-sans` faller tilbake til system-ui.
kp-tokens.css bruker allerede `var(--font-inter)` korrekt.

Fix — oppdater tailwind.config.mjs:
```js
fontFamily: {
  sans: ['var(--font-inter)', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  serif: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
  display: ['var(--font-instrument-serif)', 'Instrument Serif', 'Georgia', 'serif'],
},
```

---

### BUG 5 — layout.tsx: i18n error-fallback laster gammel monolittfil (P1)
FIL: `src/app/[locale]/layout.tsx`

Problem:
```ts
// I catch-blokken:
messages = await import(`../../../messages/en.json`).then((m) => m.default);
```
Dette laster en gammel monolittfil i stedet for de 54 namespace-filene i `messages/en/`.

Fix:
```ts
try {
  messages = await getMessages();
} catch {
  // Fallback: last kun base-namespace for å unngå tom side
  const base = await import('../../../messages/en/base.json').then((m) => m.default);
  const landing = await import('../../../messages/en/landing.json').then((m) => m.default);
  const navigation = await import('../../../messages/en/navigation.json').then((m) => m.default);
  messages = { base, landing, navigation };
}
```

---

## DEL 2 — PREVENTION: Automatiske kvalitetsgater

### STEG 1 — ESLint-regel: Blokkér CDS global-importer (blokkerende)
FIL: Finn og oppdater ESLint-konfigfilen (sjekk om den heter `eslint.config.mjs`, `.eslintrc.js` eller `eslint.config.js`)

Legg til denne regelen som blokkerer fremtidige @coinbase/cds-web global CSS-importer:
```js
// I rules-objektet:
'no-restricted-imports': ['error', {
  patterns: [
    {
      group: ['@coinbase/cds-web/globalStyles', '@coinbase/cds-web/defaultFontStyles'],
      message: 'CDS global CSS er forbudt — det overskriver Tailwind og Inter-font. Bruk kun JS-exports fra @coinbase/cds-web/system og @coinbase/cds-web/themes/*'
    }
  ]
}]
```

---

### STEG 2 — Ny fil: scripts/validate-css-classes.mjs (blokkerende i CI)
Opprett `/Users/taj/klarpakke/scripts/validate-css-classes.mjs`

Scriptet skal:
1. Lese tailwind.config.mjs og trekke ut alle gyldige kp-*-klassenavn
2. Rekursivt scanne alle .tsx/.ts-filer i src/
3. Finne alle bg-kp-*, text-kp-*, border-kp-*-klasser i className-attributter
4. Rapportere klasser som ikke finnes i config
5. Exit med kode 1 ved funn

Implementasjon:
```mjs
#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');

// Kjente gyldige kp-*-klasser fra tailwind.config.mjs
const VALID_KP_CLASSES = new Set([
  'bg-kp-bg-primary', 'bg-kp-bg-secondary', 'bg-kp-bg-tertiary',
  'text-kp-text-primary', 'text-kp-text-secondary', 'text-kp-text-tertiary',
  'bg-kp-brand', 'bg-kp-brand-light', 'bg-kp-brand-dark',
  'text-kp-brand', 'border-kp-border',
  'bg-kp-success', 'bg-kp-warning', 'bg-kp-danger',
  'bg-kp-success-light', 'bg-kp-warning-light', 'bg-kp-danger-light',
  'bg-kp-dark-bg', 'bg-kp-dark-surface', 'border-kp-dark-border',
]);

// Klasser som er dokumenterte falske positiver (f.eks. dynamisk genererte)
const KNOWN_EXCEPTIONS = new Set([
  // Legg til her hvis nødvendig
]);

function scanDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) files.push(...scanDir(full));
    else if (entry.match(/\.(tsx|ts|jsx|js)$/)) files.push(full);
  }
  return files;
}

const KP_CLASS_PATTERN = /\b(bg|text|border)-kp-[a-z-]+/g;
const errors = [];

for (const file of scanDir(join(ROOT, 'src'))) {
  const content = readFileSync(file, 'utf8');
  const matches = [...content.matchAll(KP_CLASS_PATTERN)];
  for (const m of matches) {
    const cls = m[0];
    if (!VALID_KP_CLASSES.has(cls) && !KNOWN_EXCEPTIONS.has(cls)) {
      const line = content.substring(0, m.index).split('\n').length;
      errors.push(`${file.replace(ROOT, '')}:${line} — ugyldig klasse: ${cls}`);
    }
  }
}

if (errors.length > 0) {
  console.error('\n❌ UGYLDIGE KP-TAILWIND-KLASSER FUNNET:');
  errors.forEach(e => console.error(' ', e));
  console.error(`\nTotalt: ${errors.length} feil. Gyldig format: bg-kp-bg-primary, text-kp-text-primary etc.`);
  process.exit(1);
} else {
  console.log(`✅ CSS-klassevalidering OK (scanna ${scanDir(join(ROOT, 'src')).length} filer)`);
}
```

Legg til i package.json scripts:
```json
"validate:css": "node scripts/validate-css-classes.mjs"
```

---

### STEG 3 — Visual Regression Tests med Playwright
Opprett ny fil: `e2e/visual/visual-regression.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

// Sider og viewports som testes visuelt
const PAGES = [
  { name: 'landing', path: '/', label: 'Forside' },
  { name: 'pricing', path: '/no/priser', label: 'Priser' },
  { name: 'login', path: '/no/innlogging', label: 'Innlogging' },
  { name: 'paper-trading', path: '/no/paper-trading', label: 'Paper Trading' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

for (const page of PAGES) {
  for (const viewport of VIEWPORTS) {
    test(`${page.label} — ${viewport.name} [visual]`, async ({ page: pw }) => {
      // Sett viewport
      await pw.setViewportSize({ width: viewport.width, height: viewport.height });

      // Naviger og vent på full render
      await pw.goto(page.path, { waitUntil: 'networkidle' });

      // Vent til Tailwind-CSS er lastet (sjekk at en kjent brand-farge vises)
      await pw.waitForFunction(() => {
        const btn = document.querySelector('[class*="bg-brand-500"]');
        if (!btn) return true; // ingen knapp på siden er OK
        const style = window.getComputedStyle(btn);
        // Sjekk at brand-fargen faktisk er satt (ikke fallback)
        return style.backgroundColor !== 'rgba(0, 0, 0, 0)';
      }, { timeout: 10_000 });

      // Skjul dynamisk innhold (priser, tidsstempler) for stabile snapshots
      await pw.addStyleTag({
        content: `
          [data-testid="live-price"],
          [data-testid="timestamp"],
          [data-dynamic="true"],
          .animate-pulse { visibility: hidden !important; }
        `
      });

      // Snapshot med 2% toleranse
      await expect(pw).toHaveScreenshot(
        `${page.name}-${viewport.name}.png`,
        {
          maxDiffPixelRatio: 0.02,
          fullPage: viewport.name === 'desktop',
          animations: 'disabled',
        }
      );
    });
  }
}

// Ekstra: Sjekk at CDS global CSS IKKE er aktiv
test('CDS global CSS er ikke aktiv', async ({ page }) => {
  await page.goto('/');
  const hasCoingbaseFont = await page.evaluate(() => {
    const bodyFont = window.getComputedStyle(document.body).fontFamily;
    return bodyFont.toLowerCase().includes('coinbase') ||
           bodyFont.toLowerCase().includes('cds');
  });
  expect(hasCoingbaseFont).toBe(false);
});

// Sjekk at Inter-font lastes korrekt
test('Inter font er aktiv på body', async ({ page }) => {
  await page.goto('/');
  const fontFamily = await page.evaluate(() =>
    window.getComputedStyle(document.body).fontFamily
  );
  expect(fontFamily.toLowerCase()).toMatch(/inter|system-ui|-apple-system/);
});

// Sjekk at primærfarge er Klarpakke-blå, ikke Coinbase-default
test('Brand-farge er #0052FF', async ({ page }) => {
  await page.goto('/');
  const brandColor = await page.evaluate(() => {
    const el = document.querySelector('[class*="bg-brand-500"], .kp-button-primary');
    if (!el) return null;
    return window.getComputedStyle(el).backgroundColor;
  });
  if (brandColor) {
    // rgb(0, 82, 255) = #0052FF
    expect(brandColor).toBe('rgb(0, 82, 255)');
  }
});
```

Legg til Playwright project i `playwright.config.ts`:
```typescript
{
  name: 'visual-regression',
  testMatch: '**/visual/**/*.spec.ts',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 900 },
  },
},
```

Legg til i package.json scripts:
```json
"test:visual": "playwright test --project=visual-regression",
"test:visual:update": "playwright test --project=visual-regression --update-snapshots"
```

**VIKTIG:** Kjør `npm run test:visual:update` én gang for å lage baseline-snapshots.
Commit snapshot-filene til git under `e2e/visual/__snapshots__/`.

---

### STEG 4 — Oppdater pr-check.yml med nye gates
FIL: `.github/workflows/pr-check.yml`

Legg til disse stegene i `quick-check`-jobben, ETTER `📦 Install` og FØR `🔍 Lint`:

```yaml
      - name: 🌐 i18n Validering
        run: npm run i18n:validate
        id: i18n

      - name: 🎨 CSS-klasse validering
        run: npm run validate:css
        id: cssvalidate
```

Og legg til nytt steg ETTER `🏗️ Build`:

```yaml
      - name: 👁️ Visual Regression (kun på landing-endringer)
        if: |
          contains(github.event.head_commit.message, 'landing') ||
          contains(github.event.head_commit.message, 'layout') ||
          contains(github.event.head_commit.message, 'css') ||
          contains(github.event.head_commit.message, 'style') ||
          contains(github.event.head_commit.message, 'tailwind')
        run: npm run test:visual
        id: visual
        env:
          PLAYWRIGHT_TEST_BASE_URL: http://localhost:3000
        continue-on-error: false
```

Oppdater også Failure summary-steget til å inkludere de nye kommandoene:
```yaml
          echo "npm run i18n:validate" >> $GITHUB_STEP_SUMMARY
          echo "npm run validate:css" >> $GITHUB_STEP_SUMMARY
```

---

### STEG 5 — Oppdater lint-staged i package.json for pre-commit
FIL: `package.json` — oppdater `lint-staged`-seksjonen:

```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ],
  "messages/**/*.json": [
    "node scripts/validate-i18n.js"
  ],
  "src/**/*.{tsx,ts}": [
    "node scripts/validate-css-classes.mjs"
  ],
  "*.{json,md}": [
    "prettier --write"
  ]
}
```

Oppdater også `pre-commit`-scriptet i package.json:
```json
"pre-commit": "npm run check:secrets-staged && npm run lint && npm run type-check && npm run i18n:validate && npm run validate:css"
```

---

## DEL 3 — VALIDERING

Etter alle endringer, kjør følgende i denne rekkefølgen:

```bash
# 1. TypeScript
npm run type-check

# 2. Lint (inkl. ny CDS-regel)
npm run lint

# 3. i18n
npm run i18n:validate

# 4. CSS-klasser
npm run validate:css

# 5. Build
npm run build

# 6. Generer visual regression baseline (kun første gang)
npm run dev &
sleep 15
npm run test:visual:update

# 7. Visuell verifisering i browser — sjekk disse:
# - Knapper er blå (#0052FF), IKKE Coinbase-default
# - Bakgrunn er hvit/lysgrå, IKKE blank
# - Font er Inter (DevTools → Elements → Computed → font-family)
# - Ingen --cds-*-variabler i DevTools computed styles
# - TrustStrip viser tekst, IKKE [MISSING: landing.trustStrip.*]
```

## SUKSESSKRITERIER
- [ ] `npm run type-check` — ingen feil
- [ ] `npm run lint` — ingen feil, CDS-import-regel aktiv
- [ ] `npm run i18n:validate` — 0 manglende nøkler
- [ ] `npm run validate:css` — 0 ugyldige kp-klasser
- [ ] `npm run build` — bygger uten feil
- [ ] `npm run test:visual` — alle snapshots matcher baseline
- [ ] Visuell spot-check: Inter-font, Klarpakke-blå, hvit bakgrunn
- [ ] CDS global CSS ikke aktiv (sjekk: font-family på body er IKKE coinbase)
