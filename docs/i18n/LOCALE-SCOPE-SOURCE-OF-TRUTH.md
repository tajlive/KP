# Locale og oversettelser — source of truth (Klarpakke)

**Formål:** Én policy for hvilke språk som er **aktiv kilde** for produktet: all brukerrettet tekst (microcopy, UI, e-post der relevant, priser i grensesnitt, osv.).

| Status        | Locale           | Krav til vedlikehold                                                                                                                |
| ------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Aktiv SoT** | **no** (Norsk)   | Full `messages/no/*` (og rotnavn der prosjektet bruker det). Nye features eller tekstendringer skal lande her.                      |
| **Aktiv SoT** | **en** (English) | Samme innhold som **no** der det er produktkanon — **alltid** oppdatert parallelt med **no** ved endring.                           |
| **Avventer**  | **th** (Thai)    | Ingen krav om å oppdatere `messages/th/*` ved release eller SoT-endring. Eksisterende filer kan være ufullstendige eller utdaterte. |
| **Avventer**  | **zh** (中文)    | Samme som **th**.                                                                                                                   |

**Konsekvens for arbeidsflyt**

- Ved ny nøkkel eller endret streng: **no + en** er obligatorisk før merge når teksten er brukervendt.
- **th/zh** oppdateres ikke som ledd i vanlig leveranse; unntak kun hvis produktet eksplisitt åpner disse språkene på nytt (oppdater da dette dokumentet + `AGENTS.md` + `.cursorrules`).

**Teknisk (kort)**

- **next-intl**-routing i app: `locales` = **no**, **en** (`src/i18n/routing.config.ts`).
- Middleware kan fortsatt kjenne **th/zh** for eldre URL-er og Accept-Language-håndtering; preferanse for th/zh kan mappes til **en** (se `src/middleware/i18n.ts`). Det endrer ikke policyen over: th/zh er ikke aktiv oversettelses-SoT.

**Priser, Stripe og plan-tabeller**

- Tall, plan-slugs og checkout: `docs/pricing/PRICING-PLAN-SOURCE-OF-TRUTH.md` (Linear **KLA-236**). Samme **no + en** vs **th/zh avvent** gjelder pris-copy i UI.

**Relaterte dokumenter**

- `docs/MICROCOPY-I18N-OBSERVABILITY-2026.md` — tone og operativ i18n.
- `docs/DECISIONS-2026.md` — beslutning #7 (oppdatert til å speile dette dokumentet).

---

## Endringslogg (repo)

| Dato       | Endring                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-03-20 | Første versjon: **hele produktet** — aktiv SoT **no + en**; **th/zh avvent** for alle oversettelser og brukertekst (ikke bare pris). |
