# KIMI 2.5 - FIX CSS SIZE OG OPPNÅ LCP <2.5s

**Generert:** 2026-03-09 17:59 CET  
**Prioritet:** P0 - KRITISK  
**Estimat:** 2-4 timer  
**Current LCP:** 5.8s  
**Target LCP:** <2.5s  
**Gap:** 3.3s (må reduseres 57%)

---

## KONTEKST

**Situasjon:**
- ✅ Paper trading fikset (trading_sessions mapping)
- ⚠️ LCP 5.8s (ned fra 6.4s, men fortsatt 2.3x over target)
- 🚨 **ROOT CAUSE IDENTIFISERT:** CSS fil er 336 KB (burde være <100 KB)

**Tailwind v4:** Prosjektet bruker Tailwind CSS v4 som har endret hvordan CSS genereres.

**Målet:** Reduser CSS til <100 KB og oppnå LCP <2.5s.

---

## DIN OPPGAVE

**3 FASER (2-4 timer totalt):**

1. **FASE 1: CSS OPTIMALISERING (1-2 timer)**
   - Reduser CSS fra 336 KB til <100 KB
   - Forventet impact: -2.0s LCP (5.8s → 3.8s)

2. **FASE 2: KRITISK CSS INLINE (1 time)**
   - Ekstraher above-the-fold CSS
   - Defer non-kritisk CSS
   - Forventet impact: -1.0s LCP (3.8s → 2.8s)

3. **FASE 3: FINAL TUNING (30 min)**
   - Minifiser JavaScript
   - Defer non-kritisk JS
   - Forventet impact: -0.3s LCP (2.8s → 2.5s eller bedre)

---

## FASE 1: CSS OPTIMALISERING (1-2 timer)

### Problem

**Current state:**
```bash
curl -s https://www.klarpakke.no/_next/static/css/*.css | wc -c
# Output: 336000+ bytes (336 KB)
```

**Tailwind v4 genererer for mye CSS.**

### Root Cause

Tailwind v4 bruker en ny CSS engine som ikke purger unused styles like aggressivt som v3.

### Løsning: PurgeCSS + CSS Minification

---

### Steg 1.1: Installer PurgeCSS

```bash
cd /Users/taj/klarpakke
npm install --save-dev @fullhuman/postcss-purgecss cssnano
```

---

### Steg 1.2: Konfigurer PostCSS med PurgeCSS

**File:** `postcss.config.js` (eller `postcss.config.mjs`)

**Sjekk først hva som finnes:**
```bash
cat postcss.config.js 2>/dev/null || cat postcss.config.mjs 2>/dev/null
```

**Oppdater eller opprett:**

```javascript
// postcss.config.mjs
import purgecss from '@fullhuman/postcss-purgecss';
import cssnano from 'cssnano';

const isProduction = process.env.NODE_ENV === 'production';

export default {
  plugins: [
    // Tailwind v4 CSS engine
    '@tailwindcss/postcss',
    
    // PurgeCSS - remove unused styles
    ...(isProduction
      ? [
          purgecss({
            content: [
              './src/**/*.{js,jsx,ts,tsx}',
              './src/app/**/*.{js,jsx,ts,tsx}',
              './src/components/**/*.{js,jsx,ts,tsx}',
            ],
            defaultExtractor: (content) => {
              // Tailwind class name extractor
              const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
              const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
              return broadMatches.concat(innerMatches);
            },
            safelist: [
              // Preserve dynamic classes
              /^bg-/,
              /^text-/,
              /^border-/,
              /^hover:/,
              /^focus:/,
              /^active:/,
              /^disabled:/,
              /^dark:/,
              // Preserve animation classes
              /^animate-/,
              /^transition-/,
              // Preserve framer-motion classes
              /^motion-/,
            ],
          }),
        ]
      : []),
    
    // CSS minification
    ...(isProduction
      ? [
          cssnano({
            preset: [
              'default',
              {
                discardComments: { removeAll: true },
                minifySelectors: true,
                minifyFontValues: true,
                normalizeWhitespace: true,
                colormin: true,
                convertValues: true,
              },
            ],
          }),
        ]
      : []),
  ],
};
```

**CRITICAL:** Hvis `postcss.config.js` allerede eksisterer, MERGE med eksisterende config (ikke overskriv alt).

---

### Steg 1.3: Verifiser Tailwind Config

**File:** `tailwind.config.ts` eller `tailwind.config.js`

**Sjekk at content paths er korrekte:**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}', // ⚠️ CRITICAL: Include all source files
    './src/app/**/*.{js,jsx,ts,tsx}',
    './src/components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**Hvis Tailwind v4 bruker `@config` i CSS:**

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  /* Custom theme here */
}
```

Dette er OK - PurgeCSS vil fortsatt fungere.

---

### Steg 1.4: Build og Test CSS Størrelse

```bash
cd /Users/taj/klarpakke

# Clean build
rm -rf .next

# Production build
NODE_ENV=production npm run build

# Check CSS size
find .next/static/css -name '*.css' -exec wc -c {} \; | awk '{sum+=$1} END {print "Total CSS:", sum/1024, "KB"}'
```

**Forventet output:**
```
Total CSS: 80-100 KB  ✅ (ned fra 336 KB)
```

**Hvis fortsatt >150 KB:**
- Sjekk at PurgeCSS content paths inkluderer ALLE source filer
- Sjekk at safelist ikke er for bred
- Sjekk console for PurgeCSS warnings

---

### Steg 1.5: Test Lokalt

```bash
# Start production server lokalt
npm run build
npm run start

# I annen terminal: Test med Lighthouse
lighthouse http://localhost:3000 --only-categories=performance --output=json --output-path=./lighthouse-after-css-fix.json

# Extract LCP
cat lighthouse-after-css-fix.json | jq '.audits["largest-contentful-paint"].numericValue / 1000'
```

**Forventet LCP:** 3.5-4.0s (ned fra 5.8s)

**Hvis LCP ikke forbedres:**
- CSS størrelse kan være OK, men det er andre blokkere
- Sjekk Network tab i DevTools for andre store filer
- Fortsett til Fase 2

---

### Steg 1.6: Commit og Deploy

```bash
git add postcss.config.mjs package.json package-lock.json
git commit -m "perf: reduce CSS size from 336KB to ~90KB with PurgeCSS

- Added @fullhuman/postcss-purgecss
- Added cssnano for minification
- Configured content paths for Tailwind v4
- Preserved dynamic classes with safelist

Expected impact: LCP 5.8s → 3.8s (-2.0s)

Refs: CSS optimization Phase 1"

git push origin main
```

**Vent på Vercel deploy (~2 min)**

```bash
# Sjekk deploy status
while true; do
  version=$(curl -s https://www.klarpakke.no/api/health | jq -r '.version' 2>/dev/null)
  if [[ $version == *"$(git rev-parse --short HEAD)"* ]]; then
    echo "✅ Deploy complete: $version"
    break
  fi
  sleep 10
done
```

**Test i production:**
```bash
lighthouse https://www.klarpakke.no --only-categories=performance --output=json --output-path=./lighthouse-phase1.json
cat lighthouse-phase1.json | jq '.audits["largest-contentful-paint"].numericValue / 1000'
```

**Dokumenter resultat:**
```markdown
### Phase 1 Result: CSS Optimization

**CSS Size:**
- Before: 336 KB
- After: [X] KB
- Reduction: [Y]%

**LCP:**
- Before: 5.8s
- After: [X]s
- Improvement: [Y]s

**Status:** ✅ PASS / ❌ FAIL
```

---

## FASE 2: KRITISK CSS INLINE (1 time)

### Problem

Selvom CSS er redusert til ~90 KB, må brukeren fortsatt laste ned hele filen før rendering kan starte.

### Løsning: Inline Critical CSS

Ekstraher CSS for above-the-fold innhold og inline det i `<head>`. Defer resten.

---

### Steg 2.1: Installer Critters (Next.js CSS Inliner)

```bash
npm install --save-dev critters
```

---

### Steg 2.2: Konfigurer Next.js med Critters

**File:** `next.config.mjs`

```javascript
// next.config.mjs
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Critters = require('critters');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
  
  experimental: {
    optimizeCss: true, // Enable CSS optimization
  },
  
  // Webpack config for CSS extraction
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Apply Critters to inline critical CSS
      config.plugins.push(
        new Critters({
          path: config.output.path,
          publicPath: config.output.publicPath,
          compress: true,
          pruneSource: false,
          mergeStylesheets: true,
          preload: 'swap',
        })
      );
    }
    return config;
  },
};

export default nextConfig;
```

**ALTERNATIVE (hvis Critters ikke fungerer med Next.js 15):**

Manual critical CSS extraction:

---

### Steg 2.3: Manual Critical CSS (hvis Critters feiler)

**Tool:** `critical` package

```bash
npm install --save-dev critical
```

**Script:** `scripts/extract-critical-css.js`

```javascript
// scripts/extract-critical-css.js
import critical from 'critical';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const htmlPath = join(process.cwd(), '.next/server/pages/index.html');
const criticalCssPath = join(process.cwd(), 'src/app/critical.css');

// Extract critical CSS from homepage
critical.generate({
  base: '.next/',
  src: htmlPath,
  target: criticalCssPath,
  width: 375, // Mobile first
  height: 667,
  inline: false, // We'll inline it manually
  minify: true,
}, (err, output) => {
  if (err) {
    console.error('Critical CSS extraction failed:', err);
    process.exit(1);
  }
  console.log('✅ Critical CSS extracted:', criticalCssPath);
  console.log('Size:', Buffer.byteLength(output.css), 'bytes');
});
```

**Package.json script:**
```json
{
  "scripts": {
    "extract-critical": "node scripts/extract-critical-css.js",
    "build": "next build && npm run extract-critical"
  }
}
```

**Manual inline i layout:**

```typescript
// src/app/[locale]/layout.tsx
import { readFileSync } from 'fs';
import { join } from 'path';

// Load critical CSS at build time
let criticalCss = '';
try {
  criticalCss = readFileSync(join(process.cwd(), 'src/app/critical.css'), 'utf-8');
} catch (e) {
  console.warn('Critical CSS not found, skipping inline');
}

export default function RootLayout({ children, params: { locale } }) {
  return (
    <html lang={locale}>
      <head>
        {/* Inline critical CSS */}
        {criticalCss && (
          <style
            dangerouslySetInnerHTML={{ __html: criticalCss }}
            data-critical="true"
          />
        )}
        
        {/* Preload full CSS */}
        <link
          rel="preload"
          href="/_next/static/css/app.css"
          as="style"
          onLoad="this.rel='stylesheet'"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

### Steg 2.4: Test Critical CSS

```bash
# Build med critical CSS
npm run build

# Check critical CSS size
wc -c src/app/critical.css
# Target: <20 KB

# Test LCP
lighthouse http://localhost:3000 --only-categories=performance
```

**Forventet LCP:** 2.5-3.0s (ned fra 3.8s)

---

### Steg 2.5: Commit og Deploy

```bash
git add next.config.mjs scripts/ src/app/critical.css package.json
git commit -m "perf: inline critical CSS for LCP optimization

- Added Critters for critical CSS extraction
- Inlined above-the-fold CSS (~15KB)
- Defer non-critical CSS

Expected impact: LCP 3.8s → 2.8s (-1.0s)

Refs: CSS optimization Phase 2"

git push origin main
```

**Vent og test:**
```bash
# Vent på deploy
sleep 120

# Test production
lighthouse https://www.klarpakke.no --only-categories=performance --output=json --output-path=./lighthouse-phase2.json
cat lighthouse-phase2.json | jq '.audits["largest-contentful-paint"].numericValue / 1000'
```

**Dokumenter:**
```markdown
### Phase 2 Result: Critical CSS Inline

**Critical CSS Size:** [X] KB

**LCP:**
- Before: 3.8s
- After: [X]s
- Improvement: [Y]s

**Status:** ✅ PASS / ❌ FAIL
```

---

## FASE 3: FINAL TUNING (30 min)

### Steg 3.1: Minifiser og Defer JavaScript

**File:** `next.config.mjs`

```javascript
const nextConfig = {
  // ... existing config
  
  // JavaScript optimization
  swcMinify: true, // Use SWC for faster minification
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production', // Remove console.logs
  },
  
  // Code splitting
  experimental: {
    optimizePackageImports: ['@/components', '@/lib'], // Tree-shake imports
  },
};
```

---

### Steg 3.2: Lazy Load Heavy Components

**Check for heavy imports:**

```bash
# Find large imports
npm run build -- --profile 2>&1 | grep -i "size\|chunk"
```

**Lazy load if >100 KB:**

```typescript
// Example: Lazy load Framer Motion
import dynamic from 'next/dynamic';

const AnimatedComponent = dynamic(
  () => import('./AnimatedComponent'),
  { ssr: false }
);
```

---

### Steg 3.3: Image Optimization (hvis bilder finnes)

**Check for unoptimized images:**

```bash
find public/ -name '*.jpg' -o -name '*.png' | while read img; do
  size=$(wc -c < "$img")
  if [ $size -gt 100000 ]; then
    echo "⚠️ Large image: $img ($size bytes)"
  fi
done
```

**Optimize large images:**

```bash
# Install sharp
npm install sharp

# Optimize images
node -e "
const sharp = require('sharp');
const fs = require('fs');
const images = ['public/hero.jpg', 'public/banner.png'];
images.forEach(async (img) => {
  if (fs.existsSync(img)) {
    await sharp(img)
      .resize(1920, null, { withoutEnlargement: true })
      .webp({ quality: 85 })
      .toFile(img.replace(/\.(jpg|png)$/, '.webp'));
    console.log('✅ Optimized:', img);
  }
});
"
```

---

### Steg 3.4: Final Build og Test

```bash
# Clean build
rm -rf .next

# Production build
NODE_ENV=production npm run build

# Test lokalt
npm run start
lighthouse http://localhost:3000 --only-categories=performance --output=html --output-path=./lighthouse-final.html

# Open report
open lighthouse-final.html
```

**Forventet scores:**
- Performance: >90
- LCP: <2.5s ✅
- FCP: <1.8s ✅
- TBT: <200ms ✅

---

### Steg 3.5: Final Commit og Deploy

```bash
git add next.config.mjs public/ package.json
git commit -m "perf: final LCP optimizations to reach <2.5s target

- Enabled SWC minification
- Removed console.logs in production
- Optimized package imports
- Lazy loaded heavy components
- Converted images to WebP

Final result: LCP 2.8s → 2.3s ✅

Closes: LCP performance issue
Refs: P0 blocker for KLA-129"

git push origin main
```

**Final verification:**
```bash
# Vent på deploy
sleep 120

# Run Lighthouse multiple times (for average)
for i in {1..3}; do
  echo "Run $i:"
  lighthouse https://www.klarpakke.no --only-categories=performance --quiet | grep "Performance\|Largest Contentful Paint"
  sleep 10
done
```

---

## FINAL REPORT

### Steg 4.1: Sammendrag

**Lag komplett rapport:**

```markdown
# LCP Optimization Final Report - 2026-03-09

**Commit:** [final commit SHA]  
**Completed:** 2026-03-09 [time] CET  
**Total Time:** [hours]

---

## Executive Summary

**Status:** ✅ SUCCESS - LCP <2.5s achieved

| Phase | Change | Impact | LCP |
|-------|--------|--------|-----|
| Start | - | - | 5.8s |
| Phase 1 | CSS 336KB → 90KB | -2.0s | 3.8s |
| Phase 2 | Inline critical CSS | -1.0s | 2.8s |
| Phase 3 | JS minify + lazy load | -0.5s | 2.3s ✅ |

**Total improvement:** 3.5s (60% reduction)

---

## Changes Applied

### Phase 1: CSS Optimization
- Installed PurgeCSS
- Configured PostCSS pipeline
- Result: 336 KB → [X] KB

### Phase 2: Critical CSS
- Extracted above-the-fold CSS
- Inlined [X] KB critical CSS
- Deferred non-critical CSS

### Phase 3: JavaScript Optimization
- Enabled SWC minification
- Removed console.logs
- Lazy loaded heavy components
- Optimized images to WebP

---

## Performance Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Performance | 64 | [X] | >90 | ✅/❌ |
| LCP | 5.8s | [X]s | <2.5s | ✅/❌ |
| FCP | 1.8s | [X]s | <1.8s | ✅/❌ |
| TBT | 190ms | [X]ms | <200ms | ✅/❌ |
| CLS | 0.004 | [X] | <0.1 | ✅/❌ |

---

## Files Changed

- `postcss.config.mjs` (new)
- `next.config.mjs` (updated)
- `src/app/[locale]/layout.tsx` (updated)
- `scripts/extract-critical-css.js` (new)
- `package.json` (dependencies)

---

## GO/NO-GO for KLA-129

**Decision:** ✅ GO / ❌ NO-GO

**Reasoning:**
[1-2 paragrafer]

**Conditions:**
- LCP <2.5s: ✅/❌
- Lighthouse >90: ✅/❌
- No regressions: ✅/❌

---

## Next Steps

1. ✅ Monitor Vercel Analytics for 24h
2. ✅ Monitor Sentry for errors
3. 🚀 **START KLA-129** (i18n implementation)

---

**Signatur:** KIMI 2.5  
**Godkjent av:** Tom Jensen  
**Dato:** 2026-03-09 [time] CET
```

### Steg 4.2: Lagre Rapport

```bash
cat > docs/LCP-OPTIMIZATION-FINAL-REPORT-20260309.md << 'EOF'
[paste report here]
EOF

git add docs/LCP-OPTIMIZATION-FINAL-REPORT-20260309.md
git commit -m "docs: Add final LCP optimization report"
git push origin main
```

---

## SUCCESS CRITERIA

**✅ SUCCESS hvis:**
- [ ] CSS size <100 KB (fra 336 KB)
- [ ] LCP <2.5s (fra 5.8s)
- [ ] Lighthouse Performance >90 (fra 67)
- [ ] FCP <1.8s
- [ ] TBT <200ms
- [ ] No regressions (funktionalitet fungerer)

**❌ FAILURE hvis:**
- [ ] LCP >3.0s (ikke nok forbedring)
- [ ] CSS size >150 KB (PurgeCSS fungerte ikke)
- [ ] Build errors
- [ ] Runtime errors i production

---

## TROUBLESHOOTING

### Problem: PurgeCSS fjerner nødvendige classes

**Symptom:** Styling mangler i production

**Fix:**
```javascript
// postcss.config.mjs
safelist: [
  /^class-pattern-that-was-removed$/,
  // Add more patterns
]
```

### Problem: Critters feiler med Next.js 15

**Symptom:** Build error

**Fix:** Bruk manual critical CSS (Steg 2.3)

### Problem: LCP fortsatt >3.0s etter alle faser

**Sjekk:**
1. Er CSS faktisk redusert? (sjekk Network tab)
2. Er critical CSS inlined? (sjekk HTML source)
3. Er JS minified? (sjekk bundle size)

**Hvis fortsatt >3.0s:**
- LCP element kan være noe annet (ikke CSS)
- Sjekk Chrome DevTools Performance tab
- Identifiser blocking resources

---

## TIMELINE

**18:00 → START Phase 1**
- Install PurgeCSS
- Configure PostCSS
- Build og test

**18:45 → Phase 1 Complete**
- CSS: 336KB → ~90KB
- LCP: 5.8s → ~3.8s
- Deploy og verifiser

**19:00 → START Phase 2**
- Install Critters / critical
- Extract critical CSS
- Inline i layout

**19:30 → Phase 2 Complete**
- Critical CSS: ~15KB inlined
- LCP: 3.8s → ~2.8s
- Deploy og verifiser

**19:45 → START Phase 3**
- Enable SWC minify
- Lazy load components
- Optimize images

**20:15 → Phase 3 Complete**
- LCP: 2.8s → ~2.3s ✅
- Deploy og verifiser

**20:30 → FINAL REPORT**
- Dokumenter alt
- GO/NO-GO for KLA-129

**20:45 → FERDIG**
- Total tid: 2h 45min

---

**DETTE ER EN STRENGT DEFINERT OPTIMIZATION PROMPT.**
**FØLG ALLE 3 FASER I REKKEFØLGE.**
**TEST ETTER HVER FASE.**
**DOKUMENTER ALLE RESULTATER.**

**Deadline:** 2026-03-09 20:45 CET (2h 45min fra nå)  
**Approved by:** Tom Jensen (Product Owner)

---

**START NÅ MED FASE 1. GI STATUSOPPDATERINGER ETTER HVER FASE.**
