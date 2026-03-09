# KLA-129: next-intl v4 Upgrade — Technical Specification

## Epic Overview

**Priority:** P0 (blocks international expansion)
**Epic:** KLA-129
**Goal:** Full i18n support with English version at /en/
**Estimated Effort:** 5-7 days
**Risk Level:** Medium

## Current State

### Existing Setup
- next-intl version: Check package.json
- Default locale: Norwegian (no prefix)
- English locale: /en/ prefix
- Messages: messages/no.json (primary), messages/en.json (may be incomplete)

### Known Issues
- Some hardcoded Norwegian text in components
- Incomplete English translations
- Date/number formatting not fully localized

## Upgrade Scope

### Phase 1: Dependency Upgrade (Day 1)

**Tasks:**
1. Upgrade next-intl to v4
```bash
npm install next-intl@latest
```

2. Update configuration files:
   - `next.config.mjs` - i18n config
   - `middleware.ts` - v4 middleware API
   - `i18n.ts` or `src/i18n.ts` - request handler

3. Fix breaking changes:
   - `useTranslations()` requires namespace in v4
   - Server components use `getTranslations()` not `useTranslations()`

**Acceptance Criteria:**
- [ ] App builds without errors
- [ ] Norwegian version works as before
- [ ] English routing works (/en/)

### Phase 2: Translation Audit (Day 2)

**Tasks:**
1. Find all hardcoded text:
```bash
# Search for potential hardcoded Norwegian text
grep -r "class.*>.*[A-Za-zæøåÆØÅ]" src/app --include="*.tsx" | grep -v "t('" | grep -v "className"
```

2. Extract strings to translation keys following pattern:
   - `section.component.element`
   - Example: `dashboard.header.welcomeMessage`

3. Update messages/no.json with all keys

4. Create complete messages/en.json

**Acceptance Criteria:**
- [ ] Zero hardcoded text in /app and /components
- [ ] en.json has 100% coverage of no.json keys

### Phase 3: Locale-Specific Formatting (Day 3)

**Tasks:**
1. Create formatting utilities:
```typescript
// lib/formatters.ts
export function formatCurrency(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'no' ? 'nb-NO' : 'en-US', {
    style: 'currency',
    currency: locale === 'no' ? 'NOK' : 'USD'
  }).format(amount);
}

export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'no' ? 'nb-NO' : 'en-US', {
    style: 'percent',
    minimumFractionDigits: 2
  }).format(value);
}
```

2. Update all number/date displays to use formatters

**Acceptance Criteria:**
- [ ] NOK displays for Norwegian locale
- [ ] USD/EUR displays for English locale
- [ ] Dates format correctly per locale

### Phase 4: Language Switcher & SEO (Day 4)

**Tasks:**
1. Create LanguageSwitcher component:
```typescript
// components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (newLocale: 'no' | 'en') => {
    const pathWithoutLocale = pathname.replace(/^\/en/, '');
    const newPath = newLocale === 'no'
      ? pathWithoutLocale || '/'
      : `/en${pathWithoutLocale}`;
    router.push(newPath);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => switchTo('no')}
        className={locale === 'no' ? 'font-bold' : ''}
      >
        Norsk
      </button>
      <button
        onClick={() => switchTo('en')}
        className={locale === 'en' ? 'font-bold' : ''}
      >
        English
      </button>
    </div>
  );
}
```

2. Add to header/navigation

3. Implement SEO metadata:
```typescript
// app/[locale]/layout.tsx
export async function generateMetadata({ params: { locale } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });

  return {
    title: t('title'),
    description: t('description'),
    alternates: {
      canonical: `https://klarpakke.no${locale === 'en' ? '/en' : ''}`,
      languages: {
        'no': 'https://klarpakke.no',
        'en': 'https://klarpakke.no/en'
      }
    }
  };
}
```

**Acceptance Criteria:**
- [ ] Language switcher visible and functional
- [ ] SEO metadata correct for both locales
- [ ] hreflang tags present

### Phase 5: Testing & QA (Day 5)

**Manual Testing Checklist:**
- [ ] Homepage renders in both languages
- [ ] Dashboard fully translated
- [ ] Trading interface fully translated
- [ ] Form validation messages translated
- [ ] Error messages translated
- [ ] Numbers/currency display correctly
- [ ] Dates format correctly
- [ ] Language switcher works everywhere
- [ ] SEO metadata correct
- [ ] No console errors

**Automated Testing:**
```typescript
// tests/i18n/coverage.test.ts
import no from '../../messages/no.json';
import en from '../../messages/en.json';

function flattenObject(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null) {
      return flattenObject(value, newKey);
    }
    return [newKey];
  });
}

test('English has all Norwegian keys', () => {
  const noKeys = flattenObject(no);
  const enKeys = flattenObject(en);
  const missing = noKeys.filter(k => !enKeys.includes(k));
  expect(missing).toEqual([]);
});
```

## Breaking Changes (v3 → v4)

### Middleware
```typescript
// v3
export default createMiddleware({
  locales: ['no', 'en'],
  defaultLocale: 'no'
});

// v4
export default createMiddleware({
  locales: ['no', 'en'],
  defaultLocale: 'no',
  localePrefix: 'as-needed'
});
```

### Server Components
```typescript
// v3
import { useTranslations } from 'next-intl/server';
const t = useTranslations('namespace');

// v4
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('namespace');
```

### Type Safety
```typescript
// v4 requires explicit namespace
const t = useTranslations('common'); // ✅
const t = useTranslations(); // ❌ Error
```

## Risk Assessment

| Area | Risk | Mitigation |
|------|------|------------|
| Routing changes | High | Test all routes before deploy |
| Server component API | Medium | Grep and update all occurrences |
| TypeScript strictness | Medium | Run tsc frequently |
| Translation gaps | Low | Use spreadsheet to track |

## Rollback Plan

```bash
# If critical issues:
git revert [KLA-129 commits]
npm install next-intl@3.x.x
npm run build
```

## Success Metrics

- English page views: > 10% of traffic within 30 days
- Zero translation errors in Sentry
- Language switcher usage tracked
- SEO impressions for English keywords

## Timeline

| Phase | Duration |
|-------|----------|
| 1. Dependency Upgrade | 1 day |
| 2. Translation Audit | 1 day |
| 3. Locale Formatting | 1 day |
| 4. Language Switcher | 1 day |
| 5. Testing & QA | 1 day |
| Buffer | 2 days |
| **Total** | **7 days** |

---

**Created:** 2026-03-09
**Author:** Klarpakke Engineering
**Status:** Ready to Start
