# i18n Knowledge

## Namespace-arkitektur
- Alle meldinger: `messages/no.json` + `messages/en.json`
- Namespace = toppnivå JSON-nøkkel (f.eks. `trading`, `dashboard`, `toasts`)
- Komponent bruker `useTranslations("namespace")`
- Se `messages/NAMESPACE_MAPPING.md` for full oversikt

## Kjente feller
- `toasts` namespacen manglet helt frem til 2026-04-13 — BotWizard viste råe nøkler
- Når du legger til ny komponent med toast: sjekk at namespacen eksisterer i BEGGE språkfiler
- `tToast("paperBot.startFailedTitle")` → krever `toasts.paperBot.startFailedTitle` i JSON

## Kun 2 språk aktive
- `no` (norsk) — primær
- `en` (engelsk) — sekundær
- `th` og `zh` er planlagt men IKKE implementert ennå

## i18n-testing
- Vitest-tester sjekker at nøkler finnes i begge filer
- `scripts/check-translations.js` — finn manglende nøkler
- `scripts/i18n-audit.mjs` — full audit

## Vanlige mønstre
```tsx
const t = useTranslations("trading");
const tToast = useTranslations("toasts");
```
