# Klarpakke – beslutninger 2026 (Cursor-arkitekt)

Dokumenterer svar på arkitekt-spørsmål 2026-03-13. Kilde til sannhet for prioriteringer og arbeidsmåte.

## Prioriteringer og policy

| #   | Spørsmål                      | Valg      | Implikasjon                                                                                                                                                                |
| --- | ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Viktigst neste 2 uker         | **B + C** | Rydde tech-gjeld før lansering **og** fokus på features som øker konvertering/vekst                                                                                        |
| 2   | Risiko i trading-core         | **B**     | Balansert: små refaktorer hvis de åpenbart gjør ting tryggere                                                                                                              |
| 3   | TypeScript etter lansering    | **C**     | TS som veiledning – fokus på features og runtime-feil først                                                                                                                |
| 4   | Analytics (Plausible/PostHog) | **A**     | Ikke prioriter nå – ta det rolig etter lansering                                                                                                                           |
| 5   | Onboarding-flyt               | **B**     | Good enough – feil må ikke blokkere brukeren helt                                                                                                                          |
| 6   | Dokumentasjon vs. kode        | **A**     | Kode først; docs kun for kritiske ting (schema, RLS, runbooks)                                                                                                             |
| 7   | i18n (no/en vs. th/zh)        | **A**     | **Aktiv SoT:** norsk + engelsk for _alt_ brukervendt innhold. **th/zh avvent** — ingen leveransekrav på oversettelser der. Se `docs/i18n/LOCALE-SCOPE-SOURCE-OF-TRUTH.md`. |
| 8   | Infra (Vercel/Cloudflare)     | **A**     | Hold Vercel for app; **domenet ligger på Cloudflare**                                                                                                                      |
| 9   | Feature flags                 | **B**     | Kun større features bak flag; småting rett i prod                                                                                                                          |
| 10  | Cursor sin rolle              | **B**     | Senior pair-programmer: du leder, jeg forsterker                                                                                                                           |

## Operativt

- **Arkitekt-assistent:** Jeg forsterker dine beslutninger og foreslår konkrete grep/endringer; du godkjenner retning.
- **Tech-gjeld:** Ryddes før lansering der det ikke kolliderer med konverteringsfokus.
- **TS:** Ingen rush på å slå på strict-bygg; fokus på at koden kjører og at runtime-feil fanges (Sentry).
- **Dokumentasjon:** Kun når det er kritisk (schema-endringer, RLS, deploy-runbooks).

Sist oppdatert: 2026-03-20 (rad 7 — full i18n-scope for no/en, th/zh avvent).
