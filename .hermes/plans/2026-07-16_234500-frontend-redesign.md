# Klarpakke Frontend Redesign — Mobil-først (70%)

> **For Hermes:** Implementer alle tasks → Workers Builds auto-deployer.

**Goal:** Ny landingsside med Tom's story-hero, Revolut/OKX-inspirert design, optimalizert for 70% mobilbruk.

**Architecture:** Next.js 16 App Router, mobile-først Tailwind/global CSS, i18n via messages/, ingen nye npm-pakker.

**Design:** Revolut/OKX-inspirert — mørk navy, blå accent, store tall, skarpe kort. Alt designet for 375–414px først, 768px+ sekundært.

---

### ✅ PRE-FLIGHT (1 min)

**Step 1:** Sjekk eksisterende landingsside-struktur
```bash
cd /Users/taj/klarpakke
grep -rn "export default function.*Page\|Hero\|landing" src/app/\[locale\]/page.tsx | head -10
```
Forventet: Finner eksisterende page-komponent å erstatte.

**Step 2:** Les nåværende globals.css for tokens
```bash
grep -n ":root\|--color\|--font" src/app/globals.css | head -10
```

---

### 📱 TASK 1 — Mobile-first design tokens (5 min)

**File:** `src/app/globals.css` (patch, ikke erstatt)

Legg til mobile-first CSS tokens:

```css
:root {
  /* Revolut/OKX-inspirert */
  --bg-primary: #0B0F19;     /* Mørk navy */
  --bg-card: #131A2A;        /* Kort */
  --accent: #0066FF;         /* Blå CTA */
  --accent-soft: #E8F0FE;    /* Lys versjon */
  --text-primary: #F5F5F7;   /* Hovedtekst */
  --text-muted: #8E8E93;     /* Sekundærtekst */
  --border-subtle: rgba(255,255,255,0.06);
  --radius-card: 16px;
  --radius-btn: 12px;
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: system-ui, sans-serif;
  --spacing-section: 64px;   /* Mobil */
}

@media (min-width: 768px) {
  :root {
    --spacing-section: 120px;
  }
}
```

**Verifiser:** `grep -c "bg-primary\|bg-card\|accent" src/app/globals.css` → forventet: >5

---

### 📱 TASK 2 — Hero-seksjon (mobil-først) (10 min)

**Files:**
- Create: `src/components/landing/HeroSection.tsx`
- Create: `src/components/landing/HeroSection.module.css`

```tsx
// src/components/landing/HeroSection.tsx
'use client';
import { useTranslations } from 'next-intl';
import styles from './HeroSection.module.css';

export default function HeroSection() {
  const t = useTranslations('hero');
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        {/* Mobil: stack vertikalt */}
        <h1 className={styles.title}>
          {t('titleLine1')}<br />
          <em>{t('titleLine2')}</em>
        </h1>
        <p className={styles.sub}>{t('subtitle')}</p>
        
        {/* Stats: horisontal scroll på mobil */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statNum} data-value="-64000">{t('stat1')}</span>
            <span className={styles.statLabel}>{t('stat1Label')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{t('stat2')}</span>
            <span className={styles.statLabel}>{t('stat2Label')}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statNum}>{t('stat3')}</span>
            <span className={styles.statLabel}>{t('stat3Label')}</span>
          </div>
        </div>

        {/* BTC price widget (allerede i codebase) */}
        <div className={styles.priceWidget}>
          <PriceWidget /> {/* Importer fra komponent */}
        </div>

        {/* CTA: full bredde på mobil */}
        <div className={styles.cta}>
          <a href="/no/signup" className={styles.btnPrimary}>{t('ctaPrimary')}</a>
          <a href="#story" className={styles.btnOutline}>{t('ctaSecondary')}</a>
        </div>
      </div>
    </section>
  );
}
```

```css
/* HeroSection.module.css */
.hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 80px 20px 60px;
  background: linear-gradient(180deg, var(--bg-primary) 0%, #0D1525 100%);
}
.container { max-width: 480px; margin: 0 auto; }
.title { font-size: 2rem; font-weight: 800; line-height: 1.15; letter-spacing: -0.03em; margin-bottom: 16px; }
.title em { font-style: normal; color: var(--accent); }
.sub { font-size: 1rem; color: var(--text-muted); margin-bottom: 32px; line-height: 1.6; }
.stats { display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; padding-bottom: 8px; margin-bottom: 24px; }
.stat { min-width: 120px; scroll-snap-align: start; text-align: center; }
.statNum { display: block; font-size: 1.75rem; font-weight: 800; letter-spacing: -0.02em; }
.statLabel { font-size: 0.75rem; color: var(--text-muted); display: block; margin-top: 4px; }
.priceWidget { margin-bottom: 32px; padding: 16px; background: var(--bg-card); border-radius: var(--radius-card); border: 1px solid var(--border-subtle); }
.cta { display: flex; flex-direction: column; gap: 12px; }
.btnPrimary, .btnOutline { display: block; width: 100%; padding: 16px; border-radius: var(--radius-btn); font-weight: 600; font-size: 1rem; text-align: center; text-decoration: none; }
.btnPrimary { background: var(--accent); color: white; }
.btnOutline { background: transparent; color: var(--text-primary); border: 1px solid var(--border-subtle); }

@media (min-width: 768px) {
  .container { max-width: 960px; }
  .title { font-size: 4rem; }
  .sub { font-size: 1.125rem; max-width: 600px; }
  .stats { overflow-x: visible; justify-content: center; gap: 48px; }
  .stat { min-width: auto; }
  .cta { flex-direction: row; justify-content: center; }
  .btnPrimary, .btnOutline { width: auto; padding: 16px 40px; }
}
```

**Verifiser:** `ls -la src/components/landing/HeroSection.*` → 2 filer eksisterer

---

### 📱 TASK 3 — i18n-keys for Hero (5 min)

**Files:** `messages/no/hero.json` + `messages/en/hero.json`

```json
// messages/no/hero.json
{
  "titleLine1": "Jeg tapte 64 000 kr på krypto.",
  "titleLine2": "Så bygde jeg noe bedre.",
  "subtitle": "83% av tradere taper penger. Jeg var en av dem — i 16 måneder studerte jeg AI hos MIT, Google og Microsoft for å bygge verktøyene jeg skulle ønske jeg hadde da jeg startet.",
  "stat1": "−64 000 kr",
  "stat1Label": "Det jeg tapte",
  "stat2": "+16 mnd",
  "stat2Label": "AI-utdanning",
  "stat3": "0 kr",
  "stat3Label": "Startkostnad",
  "ctaPrimary": "🎯 Start gratis",
  "ctaSecondary": "Les min historie"
}
```

```json
// messages/en/hero.json
{
  "titleLine1": "I lost 64,000 NOK on crypto.",
  "titleLine2": "So I built something better.",
  "subtitle": "83% of traders lose money. I was one of them — so I spent 16 months studying AI at MIT, Google and Microsoft to build the tools I wish I'd had.",
  "stat1": "−64,000 NOK",
  "stat1Label": "What I lost",
  "stat2": "+16 months",
  "stat2Label": "AI education",
  "stat3": "0 NOK",
  "stat3Label": "To start",
  "ctaPrimary": "🎯 Start free",
  "ctaSecondary": "Read my story"
}
```

**Verifiser:** `npm run i18n:validate` → ✅ pass

---

### 📱 TASK 4 — Erstatt landing page (5 min)

**File:** `src/app/[locale]/page.tsx` (patch)

Erstatt dagens komponent med ny komposisjon:

```tsx
import { setRequestLocale } from 'next-intl/server';
import HeroSection from '@/components/landing/HeroSection';

export default async function LandingPage({ params }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <main>
      <HeroSection />
      {/* Seksjoner legges til i senere PR-er */}
    </main>
  );
}
```

**Verifiser:** `grep "HeroSection" src/app/\[locale\]/page.tsx` → har import

---

### 📱 TASK 5 — Lint + test + deploy (5 min)

```bash
npm run lint
npm run test:unit
git add -A
git commit -m "feat: new landing page hero — Tom's story, mobile-first, Revolut/OKX-inspired"
git push origin main
```

Workers Builds auto-deployer.

---

## ⚡ Total tid: ~30 min

Etter denne PR-en:
- Ny hero på alle enheter, optimalizert for 375px+
- Grunnlag for videre seksjoner (Task 6-10 i neste PR)

---
