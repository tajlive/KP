# Microcopy, i18n og observabilitet — operativ guide (2026)

**Målgruppe:** [`TARGET-AUDIENCE.md`](./TARGET-AUDIENCE.md) (småsparere, enkel språkføring).

---

## 1. Microcopy (tone-of-voice)

| Prinsipp                           | Eksempel                                                             |
| ---------------------------------- | -------------------------------------------------------------------- |
| Korte setninger                    | «Du handler med lekepenger» før «Paper trading session».             |
| Forklar før forkortelse            | Første gang: «USDT (stablecoin knyttet til dollar)» der plass.       |
| Unngå «pro»-sjargong uten kontekst | Bytt «slippage» med kort forklaring i brukerrettet tekst.            |
| Feil                               | Hva skjedde + hva brukeren kan gjøre + lenke til hjelp der relevant. |

**Teknisk:** Alle brukerstrenger via **next-intl** (`messages/*.json`); ingen hardkodet norsk i `src/` unntatt der allerede tillatt av prosjektregler.

**Agent-forslag (roster):** Dedikert «content & microcopy»-runde ved store lanseringer — se [`.agent/KLARPAKKE-AGENT-ROSTER.md`](../.agent/KLARPAKKE-AGENT-ROSTER.md).

---

## 2. i18n — `th` / `zh` paritet

| Steg | Handling                                                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1    | Ved nye nøkler i `messages/no.json` og `messages/en.json`, legg til placeholder i `th.json` / `zh.json` (eller eksplisitt «TODO» i PR-beskrivelse). |
| 2    | Kvartalsvis: sammenlign nøkkelantall `jq 'keys                                                                                                      | length'` per fil. |
| 3    | Prioriter synlige flyter: landing, priser, innlogging, checkout.                                                                                    |

**Linear:** Knytt store i18n-løft til egne issues (epic etter behov).

---

## 3. Observabilitet (Sentry → handling)

| Element         | Beskrivelse                                                                             |
| --------------- | --------------------------------------------------------------------------------------- |
| **Sentry**      | DSN i prod — se [`docs/SENTRY-PROD.md`](./SENTRY-PROD.md), [`AGENTS.md`](../AGENTS.md). |
| **Korrelasjon** | Ved gjentatte feil: opprett Linear-issue med lenke til Sentry-event / release.          |
| **Logger**      | Strukturerte serverlogger for API-feil der det mangler (unngå PII).                     |

**Agent-forslag:** «Observability»-gjennomgang kvartalsvis — se agent-roster § ytterligere forslag.

---

## 4. Release train (lettvekts sjekkliste)

Før merge til `main` ved større release:

1. `npm run lint` + `npm run type-check` (eller forståelse av kjente unntak).
2. `npm run verify` mot relevant miljø der mulig.
3. Playwright kritisk suite grønn (med secrets i CI).
4. Kort notat i Linear (release) + eventuell changelog-oppføring.

**Cron / deploy:** [`docs/CRON-SOURCE-OF-TRUTH.md`](./CRON-SOURCE-OF-TRUTH.md), [`docs/FULL-AUTOMATION-PLAYBOOK.md`](./FULL-AUTOMATION-PLAYBOOK.md).

---

_Oppdatert: mars 2026._
