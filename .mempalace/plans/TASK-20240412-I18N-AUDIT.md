# Task Plan: TASK-20240412-I18N-AUDIT

**Status:** 🟡 PLANNING  
**Created:** 2024-04-12 18:20:00  
**Description:** Audit i18n keys - finn og fiks manglende oversettelser og legg til fallback-verdier

## Detected Agents
klarpakke-ux-ui-agent

## Plan (Genereres av Gemini/Antigravity)

### 1. Executive Summary
Utfør en full audit av i18n-nøkler i prosjektet:
- **Scanne** alle `.tsx` filer for `useTranslations` kall
- **Identifisere** nøkler som mangler i `messages/no/common.json`
- **Legge til** manglende nøkler med norske verdier
- **Legge til** fallback-verdier for å unngå `[MISSING:...]` i UI
- **Verifisere** at alle nøkler finnes i både NO og EN

**Bakgrunn:** Bygget viste mange `MISSING_MESSAGE` errors i console. Vi fikset `threeSteps` og `coursePreview`, men det er sannsynligvis flere.

### 2. Arkitektur
**Teknisk tilnærming:**
- Bruke eksisterende `scripts/validate-i18n.js` som utgangspunkt
- Skrive et audit-script som scanner kodebasen
- Finne nøkler brukt i kode men ikke i JSON-filer
- Generere rapport med forslag til oversettelser

**Filstruktur:**
- Kilde: `src/**/*.tsx` (React komponenter)
- NO: `messages/no/common.json` (hovedfil)
- EN: `messages/en/common.json` (oversettelse)
- Rapport: `i18n-audit-report.json` (midlertidig)

### 3. Files to Create/Modify
- [ ] `scripts/i18n-audit.mjs` - NY: Audit script
- [ ] `scripts/i18n-fix.mjs` - NY: Auto-fix script
- [ ] `messages/no/common.json` - MOD: Legg til manglende nøkler
- [ ] `messages/en/common.json` - MOD: Legg til manglende nøkler
- [ ] `src/i18n.ts` - MOD: Forbedre fallback håndtering (valgfritt)

### 4. Implementation Steps

#### Steg 1: Skriv i18n Audit Script
```javascript
// scripts/i18n-audit.mjs
// 1. Les alle .tsx filer
// 2. Finn alle useTranslations("namespace") kall
// 3. Finn alle t("key") kall
// 4. Les messages/no/common.json
// 5. Sammenlign og finn manglende nøkler
// 6. Generer rapport med forslag
```

#### Steg 2: Kjør Audit
```bash
node scripts/i18n-audit.mjs
```

**Forventet output:**
```json
{
  "missingInNo": ["helpPage.title", "metadata.description"],
  "missingInEn": ["helpPage.title", "metadata.description"],
  "orphanedKeys": ["old.key.no.longer.used"],
  "suggestions": {
    "helpPage.title": "Hjelp og support",
    "metadata.description": "Beskrivelse av siden"
  }
}
```

#### Steg 3: Skriv Auto-fix Script
```javascript
// scripts/i18n-fix.mjs
// 1. Les audit-rapport
// 2. Legg til manglende nøkler i NO.json
// 3. Legg til manglende nøkler i EN.json
// 4. Bruk fallback-verdier eller markér for manuell oversettelse
```

#### Steg 4: Fiks Manglende Nøkler
```bash
node scripts/i18n-fix.mjs
# Eller manuell redigering av JSON-filer
```

#### Steg 5: Verifiser
```bash
npm run i18n:validate
npm run build
# Sjekk at ingen MISSING_MESSAGE errors i console
```

#### Steg 6: Legg til Fallback i kode (valgfritt)
```tsx
// I komponenter som bruker i18n:
const t = useTranslations("namespace");
// Bruk defaultValue:
t("key", { defaultValue: "Fallback tekst" })
```

### 5. Testing Strategy
- [ ] Kjør audit script - finn alle manglende nøkler
- [ ] Verifiser at alle NO nøkler har EN oversettelse
- [ ] Kjør `npm run i18n:validate` - skal vise 0 errors
- [ ] Kjør `npm run build` - ingen MISSING_MESSAGE i output
- [ ] Manuel test - sjekk console på /no/dashboard

### 6. Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Auto-genererte verdier er dårlige | Markér for manuell review |
| Fjerner feil nøkler (orphaned) | Lag backup før fjerning |
| Breaker eksisterende funksjonalitet | Test etter hver endring |
| Nøkler brukt dynamisk misses | Sjekk template literals |

### 7. Audit Output Format
```json
{
  "summary": {
    "totalFilesScanned": 234,
    "totalKeysFound": 156,
    "missingInNo": 12,
    "missingInEn": 15,
    "orphanedKeys": 8
  },
  "missing": {
    "no": [
      { "key": "helpPage.title", "files": ["HelpPage.tsx"] },
      { "key": "metadata.description", "files": ["layout.tsx"] }
    ],
    "en": [
      { "key": "newFeature.button", "files": ["NewFeature.tsx"] }
    ]
  },
  "orphaned": [
    { "key": "old.feature", "lastUsed": "2024-01-15" }
  ]
}
```

### 8. Eksisterende Issues fra Build
Fra forrige build så vi disse manglende nøklene:
- `helpPage`
- `metadata`
- `pricing.metadata`
- `quizPage`

**Prioritet:** Fiks disse først, deretter full audit.

---

**Status:** ✅ READY FOR IMPLEMENTATION  
**Estimated Time:** 2-3 timer  
**Priority:** P2 (Viktig for profesjonell UX)  
**Next Action:** Kjør `npm run tell:kimi TASK-20240412-I18N-AUDIT.md`

---

## ✅ Implementation Complete

**Completed:** 2024-04-12  
**By:** KIMI CLI  
**Status:** All MISSING_MESSAGE errors resolved

### Files Created:
- `scripts/i18n-audit.mjs` - Audit script for scanning i18n keys
- `messages/no/quizPage.json` - Quiz page translations
- `messages/en/quizPage.json` - Quiz page translations (EN)
- `messages/no/strategyMarketplace.json` - Strategy marketplace translations
- `messages/en/strategyMarketplace.json` - Strategy marketplace translations (EN)
- `messages/no/pricing.json` - Pricing page translations
- `messages/en/pricing.json` - Pricing page translations (EN)
- `messages/no/metadata.json` - Metadata translations
- `messages/en/metadata.json` - Metadata translations (EN)

### Files Modified:
- `src/i18n.ts` - Added imports for quizPage, strategyMarketplace, pricing, metadata

### Issues Fixed:
- ✅ `helpPage` namespace - Mapped from help.json
- ✅ `quizPage` namespace - Created new JSON files
- ✅ `strategyMarketplace` namespace - Created new JSON files
- ✅ `pricing` namespace - Created new JSON files
- ✅ `metadata` namespace - Created new JSON files
- ✅ `metadata.contact.*` keys - Added contact section

### Build Results:
- Before: 100+ MISSING_MESSAGE errors
- After: 0 MISSING_MESSAGE errors ✅

### Verification:
- ✅ TypeScript: No errors
- ✅ ESLint: No new warnings
- ✅ npm run i18n:validate: NO/EN synchronized (2007 keys)
- ✅ npm run build: No i18n errors

### Next Steps:
- Consider adding TH translations for new namespaces
- Review auto-generated translations for accuracy
- Set up CI check to prevent future missing keys

