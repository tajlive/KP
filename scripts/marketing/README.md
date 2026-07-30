# Klarpakke Marketing Automation

Dette mappesystemet automatiserer innholdsgenerering, nyhetsbrev og (delvis) publisering for Klarpakkes markedsføring.

## Arkitektur

```
REDAKTØRPLAN-V2.md ──► content-engine.ts ──► content/marketing/queue/
                                                  │
                                                  ├─ YYYY-MM-DD-linkedin.md
                                                  ├─ YYYY-MM-DD-facebook.md
                                                  ├─ YYYY-MM-DD-newsletter.html
                                                  └─ YYYY-MM-DD-report.json

send-newsletter.ts ◄── newsletter.html ──► Resend (e-post)
```

## Kommandoer

```bash
# Generer ukens innhold (kjøres automatisk mandager 09:00)
npm run marketing:content

# Tørrkjør uten å skrive filer
npm run marketing:content:dry

# Send nyhetsbrev (manuell eller via cron)
npm run marketing:newsletter -- --file=content/marketing/queue/YYYY-MM-DD-newsletter.html --audience=<AUDIENCE_ID>

# Send test til NEWSLETTER_TEST_EMAIL
npm run marketing:newsletter -- --file=content/marketing/queue/YYYY-MM-DD-newsletter.html --dry-run
```

## Kanaler

| Kanal | Status | Kommentar |
|---|---|---|
| **E-post / nyhetsbrev** | 🟢 Fullt automatisert | Via Resend. Krever `RESEND_API_KEY` og `NEWSLETTER_AUDIENCE_ID`. |
| **LinkedIn bedriftsside** | 🔴 Manuell | Automatisjon er blokkert på alle nivåer (CUA, AppleScript, Voyager API, modal-DOM). Kopier tekst fra `*-linkedin.md` og lim inn manuelt. |
| **LinkedIn Tom privat** | 🔴 Manuell | Samme begrensning. Tom reposter bedriftssiden med 1–2 personlige setninger. |
| **Facebook** | 🟡 Delvis | Kan automatiseres med Browserbase/CDP, men er skjørt. Anbefalt: kopier fra `*-facebook.md` manuelt inntil stabil løsning er verifisert. |
| **Instagram** | 🟡 Delvis | Crosspost fra Facebook når kontoene er koblet. |

## Faktaregler

Alle genererte tekster følger reglene i `REDAKTØRPLAN-V2.md`:

- Tall først, alltid.
- Kun faktagodkjente påstander.
- Ingen gevinstløfter.
- Ingen «Norges første/beste».
- Plassholdere som `[TALL FRA DASHBOARD]` fylles automatisk fra Supabase.

## Miljøvariabler

Disse leses fra `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=re_...
NEWSLETTER_FROM_EMAIL=hei@klarpakke.no      # valgfri
NEWSLETTER_FROM_NAME=Klarpakke               # valgfri
NEWSLETTER_TEST_EMAIL=tomarnejensen@gmail.com # valgfri
```

## Cron-jobber

| Jobb | Tid | Oppgave |
|---|---|---|
| `Klarpakke weekly content generation` | Mandag 09:00 | Genererer 2 LinkedIn-poster, 2 Facebook-poster og 1 nyhetsbrev. Rapporterer til chat. |
| `Klarpakke weekly newsletter draft` | Tirsdag 09:00 | Sørger for at innhold finnes og rapporterer sendekommando. |

## Godkjenningsflyt

1. **Mandag morgen:** Agent genererer utkast.
2. **Tom sier `OK`:** Agent (eller Tom) kopierer LinkedIn/Facebook-tekster manuelt.
3. **Tirsdag morgen:** Agent klargjør nyhetsbrev.
4. **Tom sier `OK`:** Agent sender nyhetsbrev til konfigurert audience.

For å gjøre LinkedIn/Facebook helt automatiske må vi enten:
- Få tilgang til Meta Graph API (app-godkjenning, business verification), eller
- Akseptere risikoen ved Browserbase-CDP-publisering og bygge en dedikert publisher.
