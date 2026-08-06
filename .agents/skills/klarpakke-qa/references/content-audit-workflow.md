# Innholdsrevisjon — Redaktørgjennomgang

Systematisk gjennomgang av alle nettsider for faktafeil, navnekonvensjoner,
utdatert branding og uverifiserbare påstander.

## Workflow

1. **`web_extract` alle nøkkelsider:** `/no`, `/no/priser`, `/no/vanlige-sporsmal`,
   `/no/om-oss`, `/no/dashboard` (autentisert)
2. **Kryssreferer mot produktfakta** (`.hermes.md` → Produktfakta-seksjonen)
3. **Skille CMS fra kode:** Sider som bruker Sanity CMS (`safeFetch`, `PortableText`)
   har innhold i CMS — IKKE i i18n-filer. Fiks i Sanity admin, ikke kode.
4. **Prioriter:** Røde feil (faktafeil, utdatert branding, uverifiserbare tall) →
   gule (manglende innhold, duplikater, død tekst)

## CMS vs i18n — rask avgjørelse

| Side | Kilde | Kan fikses i kode? |
|---|---|---|
| Landingsside (`/no`) | Sanity CMS | Nei — Sanity admin |
| Om-oss (`/no/om-oss`) | Sanity CMS | Nei — Sanity admin |
| Priser (`/no/priser`) | Statisk TSX-komponent | Ja |
| FAQ (`/no/vanlige-sporsmal`) | i18n + komponent | Ja |
| Dashboard | Klient-rendret med i18n | Ja |

## Sjekkpunkter

- [ ] «JokerTrade» → «Pilot» / «Folkets AI-pilot» (utfaset navn 2026-08-01)
- [ ] «Klarpakke Universitet» → «Klarpakke» (utfaset navn)
- [ ] «Tom Jensen» → «Tom Arne Jensen» (feil navn)
- [ ] Uverifiserbare tall («over 100 tradere», «5000+ brukere») → fjern eller myk opp
- [ ] «de 100 første får 5000 KLT» — bekreftet av Tom? Sjekk mot faktisk utdeling
- [ ] «Ingen norske kryptobørser lar deg trene med lekepenger» — fortsatt sant?
- [ ] Priser: alle plan-nivåer vises med riktige features og priser

## Pitfalls

- **CMS-rendrede sider vises OK i `web_extract` men er duplisert** — SSR + CSR
  hydration. Teksten er korrekt men vises to ganger i extraktet. Ikke en reell feil.
- **«Laster...» i web_extract betyr IKKE at siden er tom** — det er en 
  client-side rendered side. Verifiser med Browserbase eller Playwright.
- **`sed`-basert find-replace kan lage ødelagte ord** — «Klarpakke Universitetet» →
  «Klarpakkeet» (fjerner «Universitet» men etterlater «et»). Sjekk ALLTID for
  varianter av målstrengen: `Universitet`, `Universitetet`, `University`.
