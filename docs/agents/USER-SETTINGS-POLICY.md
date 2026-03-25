# User & Settings Policy (Klarpakke)

Formål: én fast policy for produktvalg rundt brukere, onboarding, innstillinger, sikkerhet og KPI-prioritering.

Denne policyen er bindende for Cursor Auto-oppsett og agent-routing i Klarpakke.

## 1) Målgruppe og produktretning

- Primær målgruppe: småsparere med medium IT-kunnskap.
- Alder: 30-50.
- Typisk risikoprofil: balanced majority.
- Typisk budsjett: 500-2000 NOK per måned.
- Primært mål i appen: automatisere små beløp trygt.

## 2) UX/UI-standard

- Designretning: Coinbase-inspirert (nær), men med Klarpakke-identitet.
- Mobil først.
- Standard grafer: enkle som default, avansert visning bak toggle.
- CTA-regel: maks én primær CTA per skjerm.
- Tone: motiverende, men tydelig på risiko.
- Dashboard-prioritet: "next best action" øverst, deretter balanse og status.

## 3) Bruker, auth og onboarding

- Auth-metoder:
  - E-post + passord
  - Google OAuth
  - Microsoft (eksisterende; beholdes)
- Kontomodell: personal nå, team senere.
- Onboarding: medium lengde (3-5 steg), med branching etter erfaring.
- Språk ved første besøk: norsk default.
- Standard trading-modus etter signup: paper.

## 4) Tier-modell og gating

- Aktive tier-nivåer:
  - free
  - bachelor
  - master
  - phd/professor
- Gating skal dekke:
  - live trading
  - exchange connect
  - advanced analytics
  - signals

## 5) Exchange policy (MVP+)

- Multi-exchange scope: Binance + Kraken.
- Kraken i MVP+: read-only først.
- Kraken permissions i første steg:
  - balances
  - trade history
- API secrets:
  - aldri vis secret etter lagring
  - ingen client-side eksponering av sensitive nøkler

## 6) Risiko, bekreftelse og friksjon

- Risk acknowledgement: alltid synlig risiko-banner + lagret aksept.
- Safety-friksjon: smart friksjon (mer friksjon ved høy risiko).
- Trade confirmation UI: full modal summary (default).
- Fee visibility: vises etter trade (etter valgt policy).
- Guardrail i MVP+: max daily loss.

## 7) Varsler, support og observability

- Varselkanaler:
  - in-app
  - e-post
  - push
- Viktigste varseltyper:
  - trade executed
  - bot status
  - weekly digest default
- Push-opt-in: etter første verdi-opplevelse.
- Error recovery:
  - handlingsorienterte steg
  - auto-retry der det passer
  - support-ticket flow (Sentry + in-app feedback)

## 8) Privacy, data retention og admin

- Privacy default: private profile.
- Data retention: behold anonymiserte trading-events for audit/statistikk.
- Admin-scope: full admin-surface (users, tiers, flags, audits).

## 9) Data- og backendpolicy

- Golden source: Supabase (`trading_sessions` + `trades`).
- DB-endringer: migrations-only i repo.
- Ingen snarveier som bryter RLS-modellen.

## 10) Kvalitetskrav for leveranser

- Default kvalitetsport:
  - `npm run lint`
  - `npm run type-check`
  - `npm run test:unit`
- Ved trading-endringer:
  - `npm run test:e2e:critical:chromium`
- Dokumentasjon:
  - oppdater relevante SoT-dokumenter i samme leveranse.

## 11) KPI-styring

- Primær KPI: upgrade conversion.
- Sekundære støtte-KPIer:
  - activation
  - safe trading rate
  - retention 30d
