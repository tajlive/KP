# i18n Namespace Consolidation Mapping

## Overview
53 namespace files have been consolidated into 20 namespaces across all locales (no, en, th, zh).

## Consolidation Map

| New Namespace | Old Namespaces Merged |
|--------------|----------------------|
| **common** | common + base + navigation + footer + metadata + meta + toasts + threeSteps |
| **auth** | auth |
| **dashboard** | dashboard |
| **trading** | trading + tradeHistory + orderHistory + tradingResults + liveTrading + paperTrading + copyTrading + tradingGuide |
| **account** | account + settings + wallet |
| **marketplace** | autoTradingPage + autoTrade + autoTrading |
| **notifications** | notifications |
| **onboarding** | onboarding + beta |
| **landing** | landing + pricing + calculator + hero + contact |
| **errors** | (empty - reserved for future use) |
| **admin** | admin + adminDashboard |
| **components** | components + gamification |
| **simulator** | simulator |
| **education** | courses + quizPage + binanceGuide + learning + coursePreview + studieprogram + interestTest + tradingGuide |
| **checkout** | checkout + payment + pricingSuccess + pricingCancel |
| **about** | about + aboutUs |
| **competition** | competition + leagues |
| **help** | helpPage + help |
| **legal** | legal |
| **tax** | taxReport + tax |

## Code Migration Guide

### Namespace Changes in Code

When updating imports, change from old namespace to new namespace:

```typescript
// BEFORE
const t = useTranslations("paperTrading");
const t = useTranslations("tradeHistory");
const t = useTranslations("orderHistory");

// AFTER
const t = useTranslations("trading");
// Note: For conflicting keys, access via: t("paperTrading.keyName")
```

### Key Conflicts Resolution

When two source files had the same key, the conflicting keys are nested under the source filename:

```typescript
// If both paperTrading.json and trading.json had a "title" key:
// Access via: t("paperTrading.title") instead of t("title")
```

### Files Requiring Updates

Based on grep analysis, these files need namespace updates:

1. `hooks/useI18nToast.ts` - "toasts" → "common"
2. `features/trading/OrderHistory.tsx` - "orderHistory" → "trading"
3. `features/learning/LearningBanner.tsx` - "learning" → "education"
4. `features/gamification/KLTWallet.tsx` - "gamification" → "components"
5. `features/gamification/MonthlyCompetitionBanner.tsx` - "gamification" → "components"
6. `shared/layout/MarketingNavigation.tsx` - "navigation" → "common"
7. `features/copy-trading/CopyTradingSubAppHeader.tsx` - "navigation" → "common"
8. `app/[locale]/(user)/varsler/ClientVarsler.tsx` - "notifications" ✓ (no change)
9. `features/paper-trading/*.tsx` - "paperTrading" → "trading"
10. `app/[locale]/(user)/handelshistorikk/*.tsx` - "tradeHistory" → "trading"
11. `features/payments/*.tsx` - "payment" → "checkout"
12. `features/marketing/components/HelpContactBlock.tsx` - "helpPage" → "help"
13. `features/landing/Footer.tsx` - "footer" → "common"
14. `features/landing/Studieprogram.tsx` - "studieprogram" → "education"
15. `features/landing/CoursePreview.tsx` - "coursePreview" → "education"
16. `features/landing/ThreeSteps.tsx` - "threeSteps" → "common"
17. `features/landing/Hero.tsx` - "hero" → "common"
18. `features/profile/WalletTab.tsx` - "wallet" → "account"
19. `features/dashboard/TradingResultsDashboard.tsx` - "tradingResults" → "trading"
20. `app/[locale]/(user)/dashboard/guide/page.tsx` - "tradingGuide" → "education"
21. `app/[locale]/(marketing)/kalkulator/*.tsx` - "calculator" → "common"
22. `app/[locale]/(marketing)/kontakt/*.tsx` - "contact" → "common"
23. `app/[locale]/(marketing)/om-oss/*.tsx` - "about" ✓ (no change)
24. `app/[locale]/(marketing)/binance-guide/*.tsx` - "binanceGuide" → "education"
25. `app/[locale]/(marketing)/hjelp/*.tsx` - "helpPage" → "help"
26. `app/[locale]/(onboarding)/interessetest/*.tsx` - "interestTest" → "education"
27. `app/[locale]/(onboarding)/quiz/*.tsx` - "quizPage" → "education"
28. `app/[locale]/(beta)/beta/konkurranse/*.tsx` - "competition" ✓ (no change)
29. `app/[locale]/(beta)/beta/dashboard/*.tsx` - "beta" → "onboarding"
30. `app/[locale]/(beta)/beta/auto-trade/*.tsx` - "autoTrade" → "marketplace"
31. `app/[locale]/(beta)/beta/live-trading/*.tsx` - "liveTrading" → "trading"
32. `app/[locale]/(user)/dashboard/tax-report/*.tsx` - "taxReport" → "tax"

## File Count Summary

| Locale | Before | After | Reduction |
|--------|--------|-------|-----------|
| no | 53 | 20 | 62% |
| en | 53 | 20 | 62% |
| th | 47 | 20 | 57% |
| zh | 46 | 19 | 59% |

## Backup Locations

Original files backed up to:
- `/Users/taj/klarpakke/messages/backup_no/`
- `/Users/taj/klarpakke/messages/backup_en/`
- `/Users/taj/klarpakke/messages/backup_th/`
- `/Users/taj/klarpakke/messages/backup_zh/`

Original i18n.ts backed up to:
- `/Users/taj/klarpakke/src/i18n.ts.backup`
- `/Users/taj/klarpakke/src/i18n.ts.final.backup`

## Notes

- All translations have been preserved
- Conflicting keys are nested under their source filename
- Empty `errors.json` created as placeholder for future error messages
- zh locale missing `about.json` (zh locale doesn't have about translations)
