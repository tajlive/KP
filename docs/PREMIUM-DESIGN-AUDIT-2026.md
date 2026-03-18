# Premium design audit 2026 – rapport

**Dato:** Mars 2026  
**Workflow:** `.agent/workflows/premium-design-audit.md`  
**Sjekkliste:** `.agent/agents/ux-saas-lead.md` + `.cursor/rules/design-ux-premium.md`

---

## Oppsummering

| Sjekk           | Status | Kommentar                                                                                                                                        |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tokens          | Delvis | Hero, priser og noen komponenter bruker tokens; mange bruker fortsatt ad-hoc hex/gradient                                                        |
| Ikoner          | Delvis | Priser bruker Lucide; én emoji fjernet i PricingSection (🏆→Trophy). Emojis gjenstår i BotWizard, strategies-data, KLTWallet, e-post, onboarding |
| CTA             | OK     | Landing har tydelig primær CTA; Final CTA og Testimonials-CTA lagt til                                                                           |
| Kort/knapper    | OK     | Skygge og overganger brukes på landing og priser                                                                                                 |
| tabular-nums    | Delvis | Brukes mange steder; TABLE.cellNumeric fra tokens kan brukes mer i tabeller                                                                      |
| Premium-uttrykk | OK     | Mørkt tema, tydelig hierarki; Hero bruker HERO.gradient (#0052FF)                                                                                |

---

## Prioriterte sider – funn

### Landing (`src/app/[locale]/page.tsx`)

- **Tokens:** Hero bruker `HERO.gradient` fra tokens ✅. FinalCTASection og TrustBar bruker #0052FF – kan byttes til BRAND/link fra tokens for konsistens.
- **Ikoner:** Lucide overalt på landing ✅. TrustBar: Trophy for KLT-teaser ✅.
- **CTA:** Hero primær CTA, Final CTA «Start gratis nå» → paper-trading, Testimonials «Start med lekepenger» → paper-trading, TrustBar «Bli med» → paper-trading ✅.
- **Premium:** Ser dyrt ut; kort med border/skygge ✅.

### Priser (`src/app/[locale]/priser/ClientPricingPage.tsx`, `PricingSection.tsx`)

- **Funn rettet:** Emoji 🏆 i KLT-tekst erstattet med Lucide `Trophy` + tekst.
- **Tokens:** SURFACE og tier-stiler brukes; priser har tabular-nums ✅.
- **Ikoner:** Tier-ikoner er Lucide (GraduationCap, TrendingUp, Award, Target, Crown) ✅.

### Dashboard, paper-trading, handel

- **Tokens:** Noen komponenter bruker BRAND/PortfolioDashboard; andre bruker fortsatt `from-blue-600 to-emerald`-gradient (f.eks. checkout, VelkommenContent, ChatWidget). Anbefaling: gradvis bytte til BRAND/HERO der det er primær handling.
- **tabular-nums:** Brukes i PortfolioDashboard, PulseHeaderStats, PaperTradingList, Kalkulator ✅. Ev. bruk TABLE.cellNumeric i admin-tabeller.

### Andre komponenter med emojis (lav/medium prioritet)

| Fil                                  | Funn                       | Anbefaling                                           |
| ------------------------------------ | -------------------------- | ---------------------------------------------------- |
| `BotWizard.tsx`                      | icon: "📈", "🎯"           | Erstatt med Lucide TrendingUp, Target                |
| `strategies-data.ts`                 | emoji på strategier        | Vurder Lucide-ikoner for konsistens                  |
| `UnifiedTradingDashboard.tsx`        | icon: "📈"                 | Lucide TrendingUp                                    |
| `KLTWallet.tsx`                      | 🏆 i tekst                 | Erstatt med Trophy + tekst (som PricingSection)      |
| E-post (lib/email, resend/templates) | Emojis i subject/innhold   | Kan beholdes for åpningsgrad; vurder nøktern variant |
| `SpeedOnboarding.tsx`                | Emojis på risikonivå/coins | Lav prioritet; brukererfaring er tydelig             |

---

## Konkrete forslag (prioritert)

### Høy

1. ~~**PricingSection:** Erstatt 🏆 med Lucide Trophy~~ ✅ Utført.

### Medium

2. **TrustBar / FinalCTASection:** Bruk `BRAND.link` eller tokens for lenkefarge i stedet for `text-[#0052FF]`.
3. **Checkout / VelkommenContent / ChatWidget:** Bytt `from-blue-600 to-emerald-600` (og lignende) til `BRAND.gradient` eller `HERO.ctaPrimary` der det er primær CTA.
4. **BotWizard / UnifiedTradingDashboard / strategies:** Erstatt emoji-ikoner med Lucide (TrendingUp, Target, etc.).

### Lav

5. **Tabeller:** Import og bruk `TABLE.cellNumeric` og `TABLE.row` fra tokens i nye eller refaktorerte tabeller.
6. **KLTWallet:** «🏆 {t("monthlyPrize")}» → `<Trophy />` + t("monthlyPrize") for konsistens med priser.

---

## Referanser

- Designvurdering: `docs/design-assessment-2026.md`
- Konkurranseanalyse: `docs/design-konkurranse-analyse-2026.md`
- Tokens: `src/lib/design/tokens.ts`
- Premium-regel: `.cursor/rules/design-ux-premium.md`
