# Klarpakke Masterplan: Linear + Antigravity

**Perspektiv:** Superselger × Kryptoprogrammer × Markedsfører  
**Dato:** Februar 2026  
**Mål:** 1000 aktive brukere innen 90 dager

---

## 🧠 Strategisk analyse: Tre hjerner, én plan

### Superselgeren sier:

Klarpakke har **én killer-fordel** som ingen andre har: du lar nordmenn lære krypto uten å tape penger, med AI som forklarer *på norsk*. Det er ikke en feature — det er hele pitchen.

Problemet med eToro, Bybit og Robinhood er at de alle *later som* de bryr seg om opplæring, men inntektsmodellen deres er avhengig av at folk taper penger på ekte handler. Klarpakke er den eneste plattformen der suksessen din er **aligned** med brukerens suksess. Det er en fortelling som selger seg selv.

**Salgspitch i én setning:**  
*"Lær krypto-trading med ekte markedsdata og null risiko — AI-en din forklarer hver eneste handel på norsk."*

Fokuser salget på tre smertepunkter:
1. "Jeg vil inn i krypto, men tør ikke" → Paper trading eliminerer risiko
2. "Jeg forstår ikke hva som skjer" → AI-treneren forklarer alt
3. "De andre plattformene er for kompliserte" → Norsk, enkelt, mobilfirst

### Kryptoprogrammereren sier:

Arkitekturen med felles cron-motor for paper og live er **teknisk sjelden** og gir ekte paritet. Men det som mangler er *synligheten* av dette i UI. Brukeren må **føle** at paper og live er tvillinger, ikke to separate apper.

Prioriter teknisk:
1. **WebSocket-feed for sanntidshandler** — brukere må se trades fire i sanntid, ikke poll hvert 30. sekund
2. **Strategy backtesting** — vis historisk performance for DCA/trend/grid-strategier *før* brukeren aktiverer dem
3. **Copy trading med risikobremser** — ikke bare kopier blindt, men sett maks-tap og bekreft manuelt i lær-modus
4. **Leaderboard med Sharpe ratio** — ikke rå avkastning, men risikojustert. Dette filtrerer ut gambling-tradere

### Markedsføreren sier:

Glem feature-lister. Selg **transformasjonen**: "Fra usikker til informert krypto-investor på 7 dager."

Kanaler prioritert etter CAC (customer acquisition cost):
1. **TikTok/Reels** (gratis → lav CAC): 30-sekunders "Jeg startet paper trading i dag, her er hva som skjedde"-video
2. **Reddit r/norge + r/cryptocurrency** (gratis): "Bygget en norsk paper trading-plattform — AMA"
3. **Studentorganisasjoner** (lav CAC): Pitch Klarpakke som gratis læringsverktøy til BI, NHH, NTNU
4. **Google Ads** (medium CAC): "krypto trading norge", "lære bitcoin trading"
5. **Influencer-samarbeid** (høy CAC, høy konvertering): Norske finans-YouTubere

**Growth hack:** Leaderboardet ER markedsføringen. Gi topp 10 tradere en "Klarpakke Pro Trader"-badge de kan dele på sosiale medier. Gratis viralitet.

---

## 📋 Linear-oppsett: Sprint-basert med 2-ukers sykluser

### Prosjektstruktur

```
Klarpakke Workspace
├── 🔴 KLA - Core Platform (hovedprosjekt)
│   ├── Cycle 1: Foundation (Uke 1-2)
│   ├── Cycle 2: Engagement (Uke 3-4)
│   ├── Cycle 3: Growth (Uke 5-6)
│   └── Backlog
├── 🎨 ANI - Antigravity Animations (sub-prosjekt)
│   └── Issues tagget med "antigravity"
└── 📣 MKT - Marketing & Launch
    └── Go-to-market tasks
```

### Labels

| Label | Farge | Bruk |
|-------|-------|------|
| `antigravity` | 🟣 Lilla | Bygges i Antigravity IDE |
| `frontend` | 🔵 Blå | UI/UX arbeid |
| `backend` | 🟢 Grønn | Supabase/Edge Functions |
| `marketing` | 🟠 Oransje | Innhold, kampanjer |
| `sales-critical` | 🔴 Rød | Blokkerer brukerkonvertering |

---

## 🔴 Cycle 1: Foundation (Uke 1-2) — "Få det til å virke perfekt"

> **Selgerens mål:** En demo som closer.  
> **Devens mål:** Null bugs i kritisk path.  
> **Marketerens mål:** Screenshot-klar UI.

### KLA-1: Paper/Live tvillingmodus — synlig toggle i header
**Prioritet:** P0 Urgent | **Label:** `frontend`, `sales-critical`  
**Beskrivelse:**  
Legg til en prominent toggle øverst i dashboardet: `📄 PAPER` ↔ `💰 LIVE`. Identisk layout i begge modi. Toggling skal føles som å flippe en bryter, ikke som å navigere til en ny app.

**Acceptance criteria:**
- Toggle er synlig på alle dashboard-sider
- Samme komponent-tre rendres i begge modi (bare datakilde endres)
- Visuell indikator (fargekode) viser hvilken modus man er i
- Smooth overgangsanimasjon (Antigravity-kandidat)

**Antigravity-prompt:**  
`"Create a toggle switch component that smoothly transitions between 'Paper' and 'Live' modes. Paper mode has a blue/teal color scheme, Live mode has a green/gold scheme. Use spring animation on the toggle knob and cross-fade the background colors. Include a subtle paper texture overlay in Paper mode."`

---

### KLA-2: Dashboard viser sanntids cron-handler
**Prioritet:** P0 Urgent | **Label:** `backend`, `frontend`  
**Beskrivelse:**  
Dashboard skal vise faktiske handler som cron-motoren utfører, ikke mock-data. Hver trade vises som et animert kort som glir inn fra høyre.

**Teknisk:**
- Supabase Realtime subscription på `trades`-tabellen
- Ny Edge Function: `get-recent-trades` med pagination
- Frontend: Trade cards med live-oppdatering

**Acceptance criteria:**
- Handler dukker opp innen 2 sekunder etter utførelse
- Viser: par (BTC/USDT), retning (kjøp/salg), beløp, strategi, tidspunkt
- Profitable handler har grønn indikator, tap har rød

---

### KLA-3: Trade card-animasjon med konfetti
**Prioritet:** P1 High | **Label:** `antigravity`, `frontend`  
**Beskrivelse:**  
Når en ny auto-trade fires, vis et animert kort med spring physics. Profitable handler utløser en konfetti-burst.

**Antigravity-prompt:**  
`"Create an animated trade notification card using Framer Motion. The card should spring in from the right side with overshoot. Show trade pair, amount, and P&L. If the trade is profitable, trigger a react-confetti burst from the card's position. Include a progress bar showing position size relative to portfolio. Use the existing Tailwind dark theme."`

---

### KLA-4: Onboarding — 5-stegs paper trading kurs
**Prioritet:** P0 Urgent | **Label:** `frontend`, `sales-critical`  
**Beskrivelse:**  
Ny bruker MÅ gjennom 5 oppdrag før de kan gå live. Dette er ikke valgfritt — det er produktet. Selgeren i meg sier: dette ER Klarpakke. Ingen andre har dette.

**De 5 oppdragene:**
1. ✅ Start din første auto-trading-sesjon (velg strategi + beløp)
2. ✅ La strategien kjøre i 3 dager (push-notification etter 3 dager)
3. ✅ Forstå en vinnerhandel (AI forklarer hvorfor den var lønnsom)
4. ✅ Forstå en tapshandel (AI forklarer hva som gikk galt)
5. ✅ Sammenlign med en annen trader på leaderboard

**Acceptance criteria:**
- Progress bar viser 0/5 → 5/5
- Hvert oppdrag har en kort forklaring + action-knapp
- Fullført oppdrag gir en badge-animasjon
- Etter 5/5: "🎉 Du er klar for live trading"-skjerm med konfetti

---

### KLA-5: AI-trener MVP — norsk forklaring på handler
**Prioritet:** P1 High | **Label:** `backend`  
**Beskrivelse:**  
Edge Function som kaller GPT-4o mini med trade-kontekst og returnerer en norsk forklaring.

**Input:** Trade-data (par, retning, strategi, markedsforhold)  
**Output:** 2-3 setninger på norsk som forklarer handelen

**Eksempel:**  
> "BTC falt 3,2% under 60-dagers glidende snitt. DCA-strategien din kjøpte automatisk for 200 kr. Historisk har denne regelen gitt +12% over 30 dager i lignende situasjoner."

**Teknisk:**
- Ny Edge Function: `explain-trade`
- System prompt med norsk instruks + trading-kontekst
- Cache forklaringer for identiske trade-mønstre
- Kostnad: ~$0.001 per forklaring med GPT-4o mini

---

## 🟠 Cycle 2: Engagement (Uke 3-4) — "Få dem til å komme tilbake"

> **Selgerens mål:** 7-dagers retention over 60%.  
> **Devens mål:** Gamification som ikke føles cringe.  
> **Marketerens mål:** Delbar innhold fra appen.

### KLA-6: Risikojustert leaderboard
**Prioritet:** P1 High | **Label:** `frontend`, `backend`  
**Beskrivelse:**  
Leaderboard som viser både avkastning OG risiko. Sorter default på risikojustert score (Sharpe-lignende), ikke rå avkastning.

**Kolonner:**
| Plass | Trader | Avkastning | Risikoscore | Maks drawdown | Strategi |
|-------|--------|-----------|-------------|---------------|----------|
| 🥇 | Ola | +18% | ⭐⭐⭐ Lav | -4% | DCA |
| 🥈 | Kari | +31% | ⚠️ Høy | -22% | Grid Bot |

**Unikt salgspoeng:** "Se ikke bare hvem som tjener mest — se hvem som er trygge å lære av."

**Antigravity-prompt:**  
`"Build an animated leaderboard where rank positions slide smoothly with spring physics when they change. Each row is a card with trader name, return %, risk stars, and a sparkline chart. When a trader moves up, their card glows briefly green. Moving down shows a subtle red pulse. Use the existing recharts for sparklines."`

---

### KLA-7: Streak-system og daglige mål
**Prioritet:** P1 High | **Label:** `frontend`, `backend`  
**Beskrivelse:**  
Implementer et enkelt streak-system med daglige/ukentlige mål.

**Mekanikk:**
- 🔥 **Daglig streak:** "Åpnet appen X dager på rad" — vis flammeanimasjon
- 🎯 **Ukentlig mål:** Roterende mål som "Analyser 3 handler denne uken"
- 🏅 **Badges:** Permanente achievements lagret i Supabase

**Badge-liste v1:**
| Badge | Trigger | Ikon |
|-------|---------|------|
| Første handel | Start første auto-trading | 🌱 |
| 7-dagers streak | 7 dager på rad | 🔥 |
| Overlevde krakk | Portefølje ned >10%, men holdt strategien | 💪 |
| Konsistent trader | 30 dager aktiv strategi | ⭐ |
| Topp 10 | Leaderboard-plassering | 🏆 |

**Antigravity-prompt:**  
`"Create a badge unlock animation: when a user earns a badge, show a golden circle expanding from the center with particle effects, then the badge icon materializes with a spring bounce. Include a streak counter with an animated fire emoji that grows larger the longer the streak. Use Framer Motion with spring physics."`

---

### KLA-8: Copy trading med sikkerhetsbremser
**Prioritet:** P1 High | **Label:** `backend`, `frontend`, `sales-critical`  
**Beskrivelse:**  
La brukere kopiere andre tradere, men med innebygde sikkerhetsmekanismer.

**Tre modi:**
1. **Lær-modus** (default): Se hva trader gjør, bekreft manuelt hver handel
2. **Semi-auto:** Kopier automatisk, men med maks beløp per handel
3. **Full kopi:** Alt kopieres, men automatisk stopp ved X% tap

**Parametre brukeren setter:**
- Maks beløp per kopiert handel (slider: 50-5000 kr)
- Maks total eksponering mot én trader (slider: 10-50% av portefølje)
- Stop-loss: Stopp kopiering hvis trader taper mer enn X% (default 15%)

---

### KLA-9: Nivåsystem med progressjon
**Prioritet:** P2 Medium | **Label:** `frontend`  
**Beskrivelse:**  
Visuelt nivåsystem som gir brukeren en følelse av fremgang.

**Nivåer:**
```
🌱 Nybegynner (0-100 XP)     → Har registrert seg
📊 Sparer (100-500 XP)        → Fullført onboarding
📈 Trader (500-2000 XP)       → 30 dager aktiv + 3 badges
🏆 Pro (2000+ XP)             → Topp 20% på leaderboard
👑 Mentor (5000+ XP)          → Andre kopierer deg
```

**XP-kilder:**
- Daglig innlogging: 10 XP
- Fullføre onboarding-steg: 50 XP
- Lese AI-forklaring: 5 XP
- 7-dagers streak: 100 XP
- Topp 10 leaderboard: 200 XP/uke

---

## 🟡 Cycle 3: Growth (Uke 5-6) — "Få dem til å ta med venner"

> **Selgerens mål:** Organisk vekst via sosialt.  
> **Devens mål:** Skalerbar infrastruktur.  
> **Marketerens mål:** Viralitetsmekanikk innebygd i produktet.

### KLA-10: Delbare profil-kort
**Prioritet:** P2 Medium | **Label:** `frontend`, `marketing`  
**Beskrivelse:**  
Generer et visuelt "trading card" for hver bruker som kan deles på sosiale medier.

**Kortet viser:**
- Brukernavn + nivå
- Topp 3 badges
- 30-dagers avkastning (paper) med sparkline
- Strategi-type
- QR-kode/link til Klarpakke

**Antigravity-prompt:**  
`"Create a shareable profile card component (1080x1080px for Instagram). Dark theme with glassmorphism. Show user level, top badges as metallic icons, a small performance sparkline, and a 'Trade with me on Klarpakke' CTA with QR code. Add subtle animated gradient border. Export as PNG on button click."`

---

### KLA-11: Inviter-en-venn med dobbel XP
**Prioritet:** P2 Medium | **Label:** `backend`, `marketing`  
**Beskrivelse:**  
Referral-system: inviter en venn → begge får 200 XP + "Rekrutt"-badge.

**Teknisk:**
- Unik invite-kode per bruker (lagret i Supabase)
- Tracking av hvem som inviterte hvem
- XP utbetales når invitert bruker fullfører onboarding (ikke bare registrering)

---

### KLA-12: Scroll-basert landingsside med Antigravity
**Prioritet:** P2 Medium | **Label:** `antigravity`, `marketing`, `sales-critical`  
**Beskrivelse:**  
Ny landingsside for klarpakke.no bygget med Antigravity. Apple-stil scroll-animasjoner.

**Seksjon-flow:**
1. **Hero:** "Lær krypto uten risiko" — stor tekst som fader inn med parallax
2. **Problem:** "89% av nye krypto-investorer taper penger" — dramatisk tall-animasjon
3. **Løsning:** Paper trading demo som animerer mens du scroller
4. **Bevis:** Leaderboard-preview med animerte rangeringer
5. **CTA:** "Start gratis paper trading nå" — sticky button

**Antigravity-prompt:**  
`"Build a 5-section scroll-animated landing page for a Norwegian crypto paper trading platform called Klarpakke. Section 1: Large hero text 'Lær krypto uten risiko' with parallax background of abstract trading charts. Section 2: Counter animation showing '89% av nye krypto-investorer taper penger' with dramatic number count-up. Section 3: Interactive paper trading demo mockup that activates on scroll. Section 4: Animated leaderboard preview. Section 5: Sticky CTA button 'Start gratis'. Use dark theme, Framer Motion scroll animations, and Norwegian language throughout."`

---

## 🎯 Antigravity Workflow — Steg for steg

### Daglig rutine

```
1. Åpne Linear → Velg neste issue tagget "antigravity"
2. Kopier Antigravity-prompten fra issue-beskrivelsen
3. Åpne Antigravity → Last inn Klarpakke-prosjektet
4. Lim inn prompt → La Antigravity generere kode
5. Review → Tweak i Antigravity eller manuelt
6. Commit med melding: "feat: trade card animation KLA-3"
7. Push → Vercel preview deploy → Test
8. Flytt issue til "Done" i Linear
```

### Antigravity vs Claude Code — Når bruker du hva?

| Oppgave | Verktøy | Hvorfor |
|---------|---------|--------|
| Framer Motion-animasjoner | **Antigravity** | Dual-agent visuell forståelse |
| Scroll-baserte interaksjoner | **Antigravity** | Canvas + scroll-sync er native |
| Supabase Edge Functions | **Claude Code** | Ren backend-logikk |
| Database-migrering | **Claude Code** | SQL/schema-arbeid |
| Bug-fixing i eksisterende kode | **Claude Code** | Forstår codebase-kontekst |
| Nye UI-komponenter med animasjon | **Antigravity** | Raskere enn manuell FM-config |
| Gamification-elementer | **Antigravity** | Badges, konfetti, streaks = visuelt |
| API-integrasjoner | **Claude Code** | HTTP/auth/data-logikk |

---

## 📣 Marketing-tidslinje (parallelt med dev)

### Uke 1-2: Forbered

- [ ] Lag 5 TikTok/Reels-konsepter: "Dag 1 som paper trader", "AI-en min forklarer krypto", etc.
- [ ] Skriv Reddit-post for r/norge: "Jeg bygger en norsk krypto-læringsplattform — AMA"
- [ ] Kontakt 3 studentorganisasjoner (BI Finans, NHH Investment Club, NTNU Finans)
- [ ] Sett opp Klarpakke-konto på TikTok, Instagram, LinkedIn

### Uke 3-4: Soft launch

- [ ] Inviter 50 beta-brukere (venner, studentkontakter)
- [ ] Publiser første TikTok-video
- [ ] Reddit-post live
- [ ] Samle feedback, fiks top 3 issues

### Uke 5-6: Push

- [ ] Landingsside live (Antigravity-bygget)
- [ ] Start Google Ads-kampanje med 100 kr/dag
- [ ] Pitch til 2-3 norske finans-influencere
- [ ] Referral-system live → "Inviter en venn, begge får Pro Trader-badge"

---

## 💰 Suksessmetrikker

| Metrikk | Mål (90 dager) | Hvorfor det betyr noe |
|---------|----------------|----------------------|
| Registrerte brukere | 1000 | Bevis på produkt-markedsfit |
| Fullført onboarding (5/5) | 40% | Produktet leverer verdi |
| 7-dagers retention | 60% | Streaks og gamification virker |
| 30-dagers retention | 35% | Ekte engasjement |
| Paper → Live konvertering | 10% | Revenue-potensial |
| NPS-score | >50 | Brukere anbefaler videre |
| Gjennomsnittlig streaks | 5+ dager | Vanedannelse fungerer |

---

## ⚡ TL;DR — De 5 tingene som betyr mest

1. **Tvillingmodus-toggle** er den første tingen brukeren ser. Den MÅ være perfekt.
2. **Onboarding-kurset** er produktet, ikke en feature. 5 steg til live trading.
3. **AI-treneren** er det som skiller Klarpakke fra alt annet. Norsk, enkel, personlig.
4. **Leaderboard med risikoscore** = ansvarlig copy trading. PR-vennlig og unikt.
5. **Landingssiden** er selgeren din 24/7. Bygget med Antigravity for wow-faktor.

*Alt annet er nice-to-have. Disse fem er must-have.*
