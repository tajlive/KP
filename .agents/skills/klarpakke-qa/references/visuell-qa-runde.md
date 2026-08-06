# Visuell QA-runde — sjekkpunkter fra gjennomgang 24.07.2026

Sjekkpunkter som avdekket reelle feil under side-for-side visuell gjennomgang
med Tom (landing → dashboard → trade → portfolio → historikk + empty states).

## 1. Rå i18n-nøkler i UI

Feilklasse funnet to ganger: komponent viser rå nøkkel (f.eks.
`tradeHistory.errorTitle`) ved fetch-feil fordi nøkkelen manglet i messages/.
- Søk etter `useTranslations("X")` + `t("nøkkel")` og verifiser mot
  `messages/no.json`/`en.json` — ikke stol på at `npm run i18n:validate`
  fanger alt (den sjekker par-synk, ikke at komponentens nøkler finnes).
- Fiks: legg til nøkkel i begge språkfiler + fjern ubrukte
  `useTranslations`-kall. Test: `npm run i18n:validate` + `npx tsc --noEmit`.

## 2. Fabrikkerte tall og "live"-data på landing

Toms fakta-regel gjelder OGSÅ markedsføring. Funnet og fjernet:
- "12 000+ aktive tradere" (ikke verifiserbart) → erstattet med fakta:
  "100 000 kr lekepenger" (DB-verifisert: `paper_balance DEFAULT 100000.00`),
  "Live sanntidskurser", "0 kr innskudd".
- `LivePriceChart.tsx`: "Live"-badge over `Math.random()`-generert historikk
  (kun siste pris var ekte). Erstattet med ekte produkt-screenshot i
  telefonramme — selger produktet, ikke markedet.
- Ved nye stats: verifiser tallet mot DB/kode FØR det skrives inn.

## 3. Produkt-preview > markedsgraf i hero

Beslutning: hero-visualet skal vise appen (dashboard-screenshot i
telefonramme), ikke BTC-graf. Begrunnelse: Finelo/Revolut-mønster, 100 %
fakta, og på røde markedsdager viser en live-graf et krasj på forsiden.
Bildet ligger i `public/screenshots/hero-dashboard.png`.

## 4. Post-signup-flyt

Registrering viste e-post-vegg ("sjekk e-posten") — trakt-dreper.
Løsning: `mailer_autoconfirm` via Management API (se klarpakke-dev
references/supabase-management-api.md) + `hasSession`-redirect i
RegisterClient. Verifiser alltid hele flyten: register → (ev. e-post) →
callback → dashboard. PKCE-felle: e-postlenke må åpnes i samme nettleser.

## 5. Screenshots til offentlig bruk

Før et app-screenshot brukes på landing/manifest: sjekk at det ikke viser
personnavn/personlig info. "Godt jobbet, Trader" er OK (generisk).
Testbrukere: `test+tricky+123@klarpakke.no` (riktig brukernavn vises ikke).
