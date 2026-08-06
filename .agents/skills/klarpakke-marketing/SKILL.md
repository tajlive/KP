---
name: klarpakke-marketing
description: Use when creating Klarpakke marketing visuals/copy that must match competitor
  style (Finelo) — fakta-godkjent copy only.
version: 1.3.0
author: Hermes Lead Architect
whenToUse: Når bruker ber om marketing-visuals/copy for Klarpakke.
---

# Klarpakke Marketing Design

## Hensikt
Lage markedsføringsmateriell for Klarpakke som matcher konkurrenters rå, personlige, lavterskel-stil — men som alltid overholder Klarpakkes faktagodkjente copy og visjon.

## Stilprinsipper

### Tone
- **Direkte og personlig** — som en lapp på en eske, ikke en glossy annonse
- **Lav terskel** — ingen kompliserte forklaringer
- **Ærlig** — ingen "du blir rik", ingen superlativer
- **Norsk** — norsk språk, norske forhold

### Visuell estetikk (inspirert av Finelo-konseptet)
- Håndskrevet look (Courier / monospace)
- Pappeske, tre-gulv, gul maskeringsteip
- Mørk teknisk variant med Klarpakke-blå (#0052ff) som aksent
- Lite ikonbruk — la typografien bære budskapet

## ⭐ REGEL: ALDRI fabrikker tall på nettsider

**Dette er brukerens sterkeste krav.** Hvert tall som vises på nettsiden skal kunne spores til reell data i databasen. Hardkodede prosenter, brukerantall, trade-volum, eller andre nøkkeltall er FORBUDT — selv om det er "bare en placeholder" eller "midlertidig".

### Typisk feil (som har skjedd flere ganger)

1. **StatsSection på landing page** — det er fristende å vise "1247 brukere", "28700 trades", "99.9% uptime" som imponerende tall. Dette er FABRIKKERTE DATA. Gjør det ikke.
2. **Testimonials med oppdiktede sitater** — ALDRI skriv et testimonial for en bruker som ikke har sagt det.
3. **Leaderboard med seed-data** — leaderboard skal vises fra `paper_accounts` / `trading_stats`, ikke hardkodede eksempler.
4. **AI-genererte navn på leaderboard** — anonymiser i API-laget, men bruk ekte trades som grunnlag.

### Hva du SKAL gjøre i stedet

| Scenario | Riktig handling |
|----------|----------------|
| Vil ha en stats/seksjon med tall | **Ikke lag seksjonen** før du har en API/DB-kilde. Eller bruk generelle påstander uten tall. |
| Vil ha et feature-kort | Bruk kvalitative beskrivelser (hva plattformen gjør), ikke kvantitative (hvor mange). |
| Vil ha social proof | Fetch fra `paper_accounts` + `trading_stats` via API — ekte tradere med ekte resultater. |
| Vil ha et prisdiagram (live ticker) | Bruk `LivePriceChart`-komponenten som allerede henter fra Binance. |

### Sjekk før du oppretter en ny landing-seksjon

1. Har vi en datakilde for dette? (API-endepunkt, DB-tabell, RPC)
2. Hvis ikke: kan seksjonen formuleres UTEN tall? (f.eks. "Ekte markedsdata" i stedet for "10+ markeder")
3. Hvis tall kreves: opprett et API-endepunkt eller server-komponent som henter ekte data
4. Aldri hardkod tall — uansett hvor små eller uskyldige de virker

### Anbefalt landing page-struktur (2026, 4 seksjoner)

```
HeroSection (tekst + Live Market Ticker som rightColumn)
├─ Badge: Gratis beta · de 100 første får 5000 KLT
├─ Title: "100 000 kr i lekepenger..."
├─ CTA: Start gratis → /register
└─ Høyre kolonne: Live Market Ticker (alle 11 coins fra DB, polling hvert 15. sekund)

FeaturesSection — "Hvorfor Klarpakke?"
├─ 6 feature-kort: Ekte markedsdata, AI-agenter, 100 000 kr gratis, Norsk plattform, Ingen risiko, Ingen KYC

TradingModesExplainer — "En konto — tre måter å trade på"
├─ Manual (emerald, SVG-illustrasjon)
├─ Auto (amber, SVG-illustrasjon)
└─ Pilot (violet, SVG-illustrasjon) — het tidligere JokerTrade

CTASection — "Klar for å prøve?"
├─ Button: Start gratis → /register
└─ Footer: Ingen kredittkort · Ingen KYC · Ingen binding
```

**Se også:** `references/live-market-ticker-pattern.md` i `klarpakke-frontend-pitfalls` for teknisk implementasjon av Live Market Ticker.

### KLT-forklaring på landing page

KLT (Klarpakke-tokens) skal forklares in-line på landing page, aldri stå som ukjent akronym. Hero-badgen fungerer som forklaring:

| Språk | Badge |
|-------|-------|
| no | `"Gratis beta — 5000 KLT (Klarpakke-tokens) til de 100 første 🪙"` |
| en | `"Free beta — 5,000 KLT (Klarpakke tokens) for the first 100 🪙"` |

### Mobile-first landing (80% mobil)

80% av trafikken er mobil. Alle seksjoner MÅ bruke responsive padding:
- Mobil: `py-12` (3rem)
- Desktop: `sm:py-20` (5rem)

```tsx
// Hver landing-seksjon
<section className="py-12 sm:py-20 ...">
```

### Beta-posisjonering (avklart 2026-07-31)

Klarpakke er per juli 2026 **i beta** og kun tilgjengelig i Norge. Live trading åpner etter beta. Dette er bevisst posisjonering — ikke noe å skjule.

| Budskap | no | en |
|---------|---|----|
| Badge (hero) | `🔬 Beta — kun Norge. 5000 KLT til de 100 første` | `🔬 Beta — Norway only. 5,000 KLT for the first 100` |
| Subtitle | `Klarpakke er i beta og kun tilgjengelig i Norge. Tren på kryptohandel med AI-agenter på ekte markedsdata — helt gratis. Live trading åpner etter beta. Det lønner seg å øve før live åpner.` | `Klarpakke is in beta and only available in Norway. Train on crypto trading with AI agents on real market data — completely free. Live trading opens after beta. It pays to practise before going live.` |
| Trust note | `Beta • Kun Norge • Live trading kommer • Ingen kredittkort` | `Beta • Norway only • Live trading coming • No credit card` |

**Grunnprinsipp:** Beta-status er en feature, ikke en bug. Det signaliserer eksklusivitet og early adopter-fordel. Åpne for live trading etter beta gir insentiv til å teste NÅ.

## Faktagodkjent copy (BRUK KUN DETTE)

> Gratis beta · 100 000 kr i lekepenger (Pilot) · autonome AI-agenter · paper trading på ekte markedsdata · 5000 gratis KLT (Klarpakke-tokens) til de 100 første · norsk plattform.

**Forbudt:**
- Gevinstløfter ("+142 %", "passiv inntekt", "blir rik")
- "Norges første/beste"
- Uverifiserte tall (se ⭐ REGEL over)
- Hardkodede statistikker (f.eks. "1247 brukere" uten DB-kilde)
- "Ingen i Norge lar deg teste med lekepenger" — det er feil (Skilling har demokonto). Korrekt: "Ingen norske kryptobørser lar deg trene med lekepenger."

## Pris- og refusjonsposisjonering (fastsatt av Tom)

**Ingen refusjon.** Klarpakke er ikke en nettbutikk med returrett, og ikke et kursmedlemskap. Brukerne betaler for **tilgang til verktøy**.

- **Paper trading** — gratis og ubegrenset (100 000 kr lekepenger)
- **Betalte planer** — låser opp verktøy: live trading, flere strategier, avanserte funksjoner
- **Ingen pengene-tilbake-garanti** — fjern fra all copy, FAQ, prissider og scripts
- **Godkjent formulering**: *"Paper trading er gratis. Betalte planer gir tilgang til verktøy — ikke refusjon."*
- **Godkjent FAQ-svar**: *"Nei. Du betaler for tilgang til verktøyene våre, ikke for resultater eller løfter om avkastning. Paper trading med 100 000 kr lekepenger er gratis og ubegrenset. Når du oppgraderer, får du umiddelbar tilgang til funksjoner som live trading, flere strategier og avanserte verktøy — på samme måte som et abonnement på en programvare."*

**Pitfall:** Ikke kall det en "læringsplattform" i pris-/refusjonskontekst. Tom korrigerte: *"Vi tar betalt for å bruke våre verktøy."*

## Leveranseformat

Lag selvstendige HTML-filer under `marketing-concepts/`:
- `klarpakke-eske.html` — pappeske-stil
- `klarpakke-lapp.html` — teipet lapp på trevegg
- `klarpakke-dark.html` — mørk tech-stil med brand-farger

Bygg med ren HTML + CSS (ingen eksterne avhengigheter). Bruk Klarpakke-brand-farger:
- `#0a0b0d` (mørk bakgrunn)
- `#0052ff` (brand-blå)
- `#3d7aff` (lys blå)
- `#34d399` / `#22c55e` (grønn)
- Font: Inter (dark) eller Courier New (rå stil)

## Prosess

1. Be om / finn konkurrentmateriell brukeren vil etterligne
2. Identifiser stil-elementer (eske, lapp, robot, mørk tech)
3. Erstatt copy med Klarpakke-godkjente fakta
4. Behold den rå tonen
5. Lag 2–3 konsepter
6. Åpne i preview-pane for visuell sjekk
7. Be brukeren velge — finpuss valgt konsept

## Kjente konkurrenter

- **Finelo** — AI-trading assistant for nybegynnere over 40, "tap yes/no", $20 start

## Referanser
- `references/finello-analysis.md` — tidlig konkurrentmateriell
- `references/finello-july2026-analysis.md` — bildeanalyse + 48-timers post-launch mal (juli 2026)
- `references/klarpakke-brand-rules.md` — faktagodkjent copy (utdrag fra AGENTS.md)
