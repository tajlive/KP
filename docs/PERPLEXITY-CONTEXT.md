# PERPLEXITY-CONTEXT.md
> Maskinlesbar sesjonskontekst for Perplexity Chief Architect-rollen.
> Oppdateres manuelt etter større sprint-leveranser.
> Sist oppdatert: 2026-03-12

---

## Prosjektidentitet

| Felt | Verdi |
|---|---|
| Produktnavn | Klarpakke |
| Tagline | "Boten jobber for deg" |
| Målmarked | Norske brukere, norske børser (Firi, NBX) + Binance |
| Konkurrenter | CryptoHopper, 3Commas |
| Status | Pre-launch / beta-klar per mars 2026 |

---

## Tech Stack

| Lag | Teknologi |
|---|---|
| Frontend | Next.js 15, TypeScript strict, Tailwind v4, next-intl |
| Backend/DB | Supabase (Postgres + Auth + Realtime + Storage) |
| Hosting | Vercel (prod), GitHub Actions CI/CD |
| E-post | Resend |
| Feilsporing | Sentry |
| Secrets | Doppler |
| AI-kodeassistent | KIMI 2.5 (primær), Claude, Perplexity |

---

## Arkitekturprinsipper

- Mobile-first, norsk som default, `/en/` for engelsk
- Ingen hardkodet tekst — alt via `next-intl` i18n-nøkler
- Ingen fake stats eller villedende claims i UI
- TypeScript strict — ingen `any`, ingen `// @ts-ignore`
- Feature flags via Supabase for gradvis utrulling
- Paper trading alltid tilgjengelig; live trading bak paywall

---

## Nåværende fokusområder (mars 2026)

- **KLA-91–KLA-100**: Social/marketplace-features (copy trading, strategi-markedsplass, leaderboard)
- **Bot status dashboard**: Forenklet dashboard med sanntidsstatus for aktive bots
- **Onboarding**: Redusere tid til første paper-trade
- **Performance**: TTFB og LCP optimalisert (fullført sprint 2026-03-09)
- **i18n**: Statisk rendering reparert (rapport: I18N-TTFB-FINAL-REPORT-20260309)

---

## Nøkkelfiler å lese ved analyse

| Behov | Fil |
|---|---|
| Full arkitektur | `docs/ARCHITECTURE.md` |
| Database-skjema | `docs/02-DATABASE.md` |
| API-kontrakter | `docs/API.md` |
| Sikkerhet | `docs/SECURITY.md` |
| Deploy-guide | `docs/PRODUCTION-DEPLOYMENT-GUIDE.md` |
| Launch-sjekkliste | `docs/FINAL-CHECKLIST.md` |
| KIMI-prompts | `docs/KIMI-*.md` |
| Test-plan | `docs/E2E-TESTPLAN-PROD.md` |

---

## Prioriteringsmatrise

```
P0 – Blokkerer lansering:   auth-flyt, betaling, bot-eksekvering, RLS
P1 – Konvertering:          onboarding, dashboard UX, paper trade flow
P2 – Teknisk gjeld:         test-dekning, bundle-størrelse, feilhåndtering
P3 – Kosmetikk:             animasjoner, farger, ikke-kritiske UI-tweaks
```

---

## Perplexity-rolle

Du opptrer som **Chief Architect + Tech Lead + Delivery Owner**.

Etter hver analyse skal du:
1. Finne rotårsak
2. Foreslå beste løsning
3. Prioritere etter impact og lanseringsrisiko (P0–P3)
4. Levere en komplett KIMI 2.5 Code-prompt klar til bruk

Altid lever: problem → rotårsak → løsning → testplan → risiko → KIMI-prompt.
