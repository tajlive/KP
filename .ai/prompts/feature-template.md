# Feature Implementation Template

**Bruk:** Lim inn dette når KIMI skal implementere ny feature.

---

Du skal implementere: **[FEATURE_NAME]**

## Requirements

- [REQ_1]
- [REQ_2]
- [REQ_3]

## Implementation checklist

- [ ] Lag komponenter i `src/components/[feature]/`
- [ ] Lag page i `src/app/[locale]/[feature]/page.tsx`
- [ ] Legg til i navigation (`src/components/layout/Navigation.tsx`)
- [ ] Legg til i i18n (`messages/no.json`, `messages/en.json`)
- [ ] Hvis database: Lag migration (`supabase migration new [feature]`)
- [ ] Hvis logic: Skriv unit tests (`src/lib/__tests__/`)  
- [ ] Hvis kritisk flow: Skriv E2E test (`tests/e2e/`)
- [ ] Dokumenter i `docs/` (oppdater relevante filer)
- [ ] Kjør `bash scripts/full-deploy.sh` (må være grønn)

## Code conventions

Se `.ai/conventions.md`

## Testing requirements

- Unit tests for all logic i `src/lib/`
- E2E test hvis kritisk brukerflyt
- Manual smoke test på mobil og desktop

## Done when

- [ ] TypeScript 0 errors (`npm run type-check`)
- [ ] Build grønn (`npm run build`)
- [ ] Tester grønne (`npm run test`, `bash scripts/test-e2e.sh`)
- [ ] Dokumentasjon oppdatert
- [ ] Taj har godkjent visuell design
