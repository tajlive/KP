# Mobil og UA — sweep-sjekkliste (2026)

**Målgruppe:** [`TARGET-AUDIENCE.md`](./TARGET-AUDIENCE.md) (ca. 70–75 % mobil, enheter nyere enn 2023 som baseline).

**Referanser:** [`design-assessment-2026.md`](./design-assessment-2026.md), [`src/lib/design/tokens.ts`](../src/lib/design/tokens.ts), [`.agent/agents/klarpakke-accessibility-lead.md`](../.agent/agents/klarpakke-accessibility-lead.md).

---

## Skjermer (prioritert rekkefølge)

| #   | Rute / komponent                          | Sjekk                                                 |
| --- | ----------------------------------------- | ----------------------------------------------------- |
| 1   | Landing `/`                               | LCP, hero ikke blokkerende, touch-friendly CTA        |
| 2   | `/priser`                                 | Lesbarhet, tier-kort, ingen horisontal scroll         |
| 3   | `/innlogging`, `/signup`                  | Skjema full bredde, knapper min. 44px høyde der mulig |
| 4   | `/dashboard`                              | Sidebar/mobil meny, ikke overlesset første skjerm     |
| 5   | `/paper-trading`                          | Modus tydelig; tier-gate ved live                     |
| 6   | `/kurs`                                   | Liste/kort skannbare på smal skjerm                   |
| 7   | `/profile` eller `/konto`                 | Primærinfo øverst                                     |
| 8   | `/innstillinger` vs `/dashboard/settings` | Tydelig forskjell i språk (varsler vs API)            |

---

## UA (tilgjengelighet)

- [ ] Kontrast tilstrekkelig på knapper og lenker (mørkt tema).
- [ ] Fokus synlig ved tastaturnavigasjon på primære flyter.
- [ ] `prefers-reduced-motion` respekteres der animasjoner brukes.
- [ ] Touch targets: min. **44×44 px** for primære handlinger (juster der avvik finnes).

---

## Automatiserte tester

- Playwright **mobile**-prosjekter: `e2e/mobile/*.spec.ts` (se [`playwright.config.ts`](../playwright.config.ts)).
- Kritisk flyt for innlogget bruker: `e2e/mobile/critical-journey.spec.ts` (kjører med `.auth/user.json` når E2E-miljø er komplett).

---

_Oppdatert: mars 2026._
