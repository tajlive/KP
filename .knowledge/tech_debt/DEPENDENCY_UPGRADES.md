# Gjenværende avhengighetsoppgraderinger

> Oppdatert: 2026-06-24  
> Etter: `deps: safe patch/minor dependency updates` (ec10cac0f)

## Hva ble gjort

### Runde 1: safe patch/minor update
- `npm update --save` ble kjørt for alle pakker innenfor eksisterende semver-ranges.
- `eslint.config.mjs` fikk `**/.open-next/**` i ignore-listen for å unngå linting av build-artifakter.
- `stripe` ble pinnnet til `22.1.0` (eksakt) midlertidig fordi `22.2.3` introduserer ny default API-versjon.
- `svix` ble lagt til som direkte avhengighet (var tidligere kun transitiv).
- Verifisering: `lint:gate`, `type-check`, `test:unit`, `build:local` og `verify` alle grønne.

### Runde 2: stripe API-versjon
- `stripe` oppgradert fra `22.1.0` til `^22.2.3`.
- `apiVersion` oppdatert fra `"2026-04-22.dahlia"` til `"2026-05-27.dahlia"` i:
  - `src/lib/stripe.ts`
  - `src/lib/stripe/config.ts`
  - `src/lib/stripe/verify-webhook.ts`
  - `src/app/api/stripe/customer-portal/route.ts`
  - `src/app/api/webhooks/stripe/route.ts`
- Commit: `deps(stripe): upgrade to 22.2.3 and update API version` (`263aa1cc3`).
- Deployet manuelt til Cloudflare Workers og verifisert med `npm run verify`.

## Major / breaking oppgraderinger som gjenstår

### Høy prioritet / lav risiko

| Pakke | Fra | Til | Kommentar |
|-------|-----|-----|-----------|
| `@playwright/mcp` | `0.0.70` | `0.0.76` | MCP-server for Playwright; sjekk endringer i verktøy-liste. |
| `@types/node` | `25.6.0` | `26.0.0` | Sannsynligvis breaking types; test `type-check` og bygg. |
| `cssnano` | `7.1.9` | `8.0.2` | PostCSS-optimizer; sjekk at CSS-output forblir lik. |
| `csv-parse` | `6.2.1` | `7.0.0` | Sjekk parser-API og CSV-import i admin/seed. |
| `lint-staged` | `16.4.0` | `17.0.8` | Kan endre konfigurasjonsformat; test pre-commit. |

### Medium prioritet / potensiell breaking

| Pakke | Fra | Til | Kommentar |
|-------|-----|-----|-----------|
| `@coinbase/cds-web` | `8.69.0` | `9.4.3` | Major; sjekk Coinbase Design System-komponenter og tema. |
| `@linear/sdk` | `81.0.0` | `87.0.0` | Major; brukes i automasjon/Linear-integrasjon. |
| `opik` | `1.11.14` | `2.0.77` | Major; brukes til AI-evaluering. Sjekk import/endepunkt. |
| `react-day-picker` | `9.14.0` | `10.0.1` | Major; kan endre props/API. Søk etter `<DayPicker`. |
| `ts-morph` | `27.0.2` | `28.0.0` | Major; brukes i kodegenereringsscripts. |

### Høy prioritet / høy risiko

| Pakke | Fra | Til | Kommentar |
|-------|-----|-----|-----------|
| `eslint` | `9.39.4` | `10.5.0` | **Major**. Kan kreve endringer i flat config (`eslint.config.mjs`). Gjør denne oppgraderingen isolert. |
| `@eslint/js` | `9.39.4` | `10.0.1` | Følger `eslint` major. |
| `eslint-config-next` | `16.2.4` | `16.2.9` | Minor, men sørg for kompatibilitet med eslint 10 hvis oppgraderes samtidig. |
| `sanity` | `5.24.0` | `6.1.0` | **Major**. Kan påvirke Studio, schema og GROQ. Test Studio grundig. |
| `@sanity/vision` | `5.24.0` | `6.1.0` | Følger `sanity` major. |
| `next-sanity` | `12.4.3` | `13.1.1` | **Major**. Sjekk opp mot Next.js 16 og Sanity 6. |
| `@supabase/ssr` | `0.10.2` | `0.12.0` | Pre-1.0 minor, men kan være breaking for auth/cookies. Test auth-flow. |
| `chrome-devtools-mcp` | `0.20.3` | `1.4.0` | Major; MCP-server for DevTools. Sjekk om config må oppdateres. |

## Anbefalt fremgangsmåte

1. **Én major om gangen** – isoler hver oppgradering i egen branch.
2. **Les changelog** – sjekk `CHANGELOG.md` eller GitHub-releases for breaking changes.
3. **Kjør full verifikasjon** før merge:
   ```bash
   npm run lint:gate && npm run type-check && npm run test:unit && npm run build:local && npm run verify
   ```
4. **For `eslint` + `sanity`** – vurder å oppgradere disse sist, og gjerne i samme deploy-vindu som relaterte pakker (`eslint-config-next`, `@sanity/vision`, `next-sanity`).

## Sjekkliste før neste major-runde

- [ ] Opprett branch `deps/major-<pakke>-<dato>` fra `main`.
- [ ] Oppdater aktuell pakke i `package.json` (ikke `npm update` for major).
- [ ] `npm install` og sjekk `npm ls --depth=0`.
- [ ] Kjør `npm run lint:gate`, `npm run type-check`, `npm run test:unit`.
- [ ] Kjør `npm run build:local`.
- [ ] Kjør `npm run verify`.
- [ ] Dokumenter eventuelle nye avhengigheter eller tilbakestilte oppdateringer.
