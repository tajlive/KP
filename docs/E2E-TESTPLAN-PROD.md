# E2E Manuell Testplan: Klarpakke Prod

**Dato:** 10. mars 2026  
**Miljø:** Produksjon (https://www.klarpakke.no)  
**Versjon:** Commit 9ee6fe2ea  
**Tester:** Kimi 2.5 + manuell verifikasjon

---

## Forberedelser

1. Åpne ny inkognito-fane (Chrome/Edge/Firefox)
2. DevTools åpen (F12) → Network tab → Preserve log
3. Klar til screenshot ved feil
4. Test-email: `klarpakke.test{timestamp}@gmail.com` (f.eks. klarpakke.test1003@gmail.com)

---

## FLYT 1 — Ny bruker onboarding (Kritisk) ⭐⭐⭐

| Steg | Handling | Forventet resultat | Status |
|------|----------|-------------------|--------|
| 1.1 | Gå til https://www.klarpakke.no | Landingsside laster, hero-visning | ⬜ |
| 1.2 | Klikk "Start nå" / "Registrer deg" | Redirect til /no/innlogging | ⬜ |
| 1.3 | Klikk "Opprett konto" | Skjema vises med email + passord | ⬜ |
| 1.4 | Fyll inn: `klarpakke.test{timestamp}@gmail.com` + passord (min 8 tegn) | Ingen valideringsfeil | ⬜ |
| 1.5 | Klikk "Opprett konto" | Loading state, deretter success | ⬜ |
| 1.6 | Verifiser email (sjekk Gmail) | Email mottatt med verifiseringslenke | ⬜ |
| 1.7 | Klikk verifiseringslenke | Redirect til /no/onboarding/step/1 | ⬜ |
| 1.8 | **Steg 1:** "Boten jobber for deg" vises | Side laster med CTA "Kom i gang" | ⬜ |
| 1.9 | Klikk "Kom i gang" | Progress bar oppdateres, redirect til steg 2 | ⬜ |
| 1.10 | **Steg 2:** Velg erfaringsnivå | 3 alternativer vises: Nybegynner/Erfaren/Proff | ⬜ |
| 1.11 | Velg "Nybegynner" + klikk "Fortsett" | Redirect til steg 3 | ⬜ |
| 1.12 | **Steg 3:** "Start med paper trading" | Virtuell saldo: 10 000 kr vises | ⬜ |
| 1.13 | Klikk "Start paper trading" | Redirect til steg 4 | ⬜ |
| 1.14 | **Steg 4:** Binance-tilkobling | "Gjør dette senere"-knapp er synlig | ⬜ |
| 1.15 | Klikk "Gjør dette senere" | Redirect til steg 5 | ⬜ |
| 1.16 | **Steg 5:** "Du er klar! 🎉" | Paper balance vises, "Gå til dashboard" aktiv | ⬜ |
| 1.17 | Klikk "Gå til dashboard" | Redirect til /no/dashboard | ⬜ |
| 1.18 | **Verifiser dashboard:** | | |
| | a) BotStatusCard vises | Enten aktiv bot eller "Ingen aktiv bot"-kort | ⬜ |
| | b) **INGEN rå nøkler** | Skal IKKE se "dashboard.botStatus.xxx" | ⬜ |
| | c) GetStartedCard vises | "Kom i gang"-seksjon synlig | ⬜ |
| 1.19 | Sjekk Console (F12) | Inneholder IKKE "Missing message"-feil | ⬜ |

**Notater Flyt 1:**
```
Testbruker: _______________________
Tid brukt: _______________________
Feil funnet: _______________________
```

---

## FLYT 2 — Paper Trading E2E (Kritisk) ⭐⭐⭐

| Steg | Handling | Forventet resultat | Status |
|------|----------|-------------------|--------|
| 2.1 | Fra dashboard: Sjekk BotStatusCard | Viser "Ingen aktiv bot" eller eksisterende | ⬜ |
| 2.2 | Klikk "Start paper trading" (eller fra EmptyBotState) | Redirect til /no/paper-trading | ⬜ |
| 2.3 | Verifiser /paper-trading side | | |
| | a) Banner vises | "📄 Paper Trading — Øv med virtuell kapital..." | ⬜ |
| | b) Liste over sesjoner (hvis noen) | Status, P&L%, tid siden start vises | ⬜ |
| | c) "Start ny sesjon"-knapp | Synlig og klikkbar | ⬜ |
| 2.4 | Klikk "Start ny sesjon" | Modal åpnes med skjema | ⬜ |
| 2.5 | Verifiser modal | | |
| | a) Trading pair dropdown | BTC/USDT, ETH/USDT, SOL/USDT | ⬜ |
| | b) Startkapital input | Default 10000, min 1000, max 1000000 | ⬜ |
| 2.6 | Velg: BTC/USDT + 10 000 kr | Verdier valgt | ⬜ |
| 2.7 | Klikk "Start" | Loading, deretter redirect | ⬜ |
| 2.8 | Verifiser redirect | URL: /no/paper-trading/{session_id} | ⬜ |
| 2.9 | **Sesjonsdetalj vises** | | |
| | a) Header | "BTC/USDT [Aktiv]" | ⬜ |
| | b) Kapital-kort | 10 000 kr (+0.0%) | ⬜ |
| | c) Win rate-kort | 0% (0/0 trades) | ⬜ |
| | d) P&L-kort | 0 kr | ⬜ |
| | e) "Pause"-knapp | Synlig og klikkbar | ⬜ |
| | f) "Stopp"-knapp | Synlig og klikkbar (rød) | ⬜ |
| | g) Trades-liste | "Ingen trades ennå" | ⬜ |
| 2.10 | Klikk "Pause bot" | | |
| | a) Button endres til "Fortsett" | ✅ | ⬜ |
| | b) Badge endres til "Pauset" | ✅ | ⬜ |
| 2.11 | Klikk "Fortsett" | | |
| | a) Button endres til "Pause" | ✅ | ⬜ |
| | b) Badge endres til "Aktiv" | ✅ | ⬜ |
| 2.12 | Klikk "Stopp sesjon" | | |
| | a) Bekreftelsesdialog (hvis impl) | Eller direkte stopp | ⬜ |
| | b) Redirect til /no/paper-trading | ✅ | ⬜ |
| 2.13 | Verifiser liste | Stoppet sesjon vises med "[Stoppet]"-badge | ⬜ |
| 2.14 | Klikk på stoppet sesjon | Redirect til detalj, men actions disabled | ⬜ |

**Notater Flyt 2:**
```
Session ID opprettet: _______________________
P&L etter test: _______________________
Feil funnet: _______________________
```

---

## FLYT 3 — Sikkerhet & Isolasjon (Kritisk) ⭐⭐⭐

| Steg | Handling | Forventet resultat | Status |
|------|----------|-------------------|--------|
| 3.1 | Kopier session_id fra URL | Lagre: _______________________ | ⬜ |
| 3.2 | Logg ut (hvis mulig) eller åpny ny inkognito | | ⬜ |
| 3.3 | Registrer NY bruker (Bruk B) | `klarpakke.testB{timestamp}@gmail.com` | ⬜ |
| 3.4 | Fullfør onboarding for Bruker B | Dashboard vises | ⬜ |
| 3.5 | Gå direkte til: | | |
| | URL: `/no/paper-trading/{session_id fra Bruker A}` | | ⬜ |
| 3.6 | **Verifiser sikkerhet** | 404-side eller "Ingen tilgang" | ⬜ |
| 3.7 | Sjekk Console | Ingen data fra Bruker A sin sesjon | ⬜ |
| 3.8 | Gå tilbake til /no/paper-trading | Liste viser kun Bruker B sine sesjoner | ⬜ |

**Notater Flyt 3:**
```
Bruker A session_id: _______________________
Bruker B email: _______________________
Resultat: _______________________
```

---

## FLYT 4 — i18n Engelsk (Konvertering-kritisk) ⭐⭐⭐

| Steg | Handling | Forventet resultat | Status |
|------|----------|-------------------|--------|
| 4.1 | Gå til https://www.klarpakke.no/en | Redirect til /en/ | ⬜ |
| 4.2 | Verifiser landingsside | ALL tekst på engelsk | ⬜ |
| 4.3 | Klikk "Get Started" / "Start now" | /en/innlogging | ⬜ |
| 4.4 | Logg inn med eksisterende bruker | Dashboard laster | ⬜ |
| 4.5 | Verifiser /en/dashboard | | |
| | a) BotStatusCard | Engelsk tekst: "Bot Status", "Active", etc. | ⬜ |
| | b) **INGEN rå nøkler** | Skal IKKE se "dashboard.botStatus.xxx" | ⬜ |
| | c) **INGEN norske strenger** | Alt på engelsk | ⬜ |
| 4.6 | Gå til /en/paper-trading | Side laster på engelsk | ⬜ |
| 4.7 | Klikk "Start new session" | Modal på engelsk | ⬜ |
| 4.8 | Verifiser modal-tekster | "Trading pair", "Starting capital", "Cancel", "Start" | ⬜ |
| 4.9 | Opprett sesjon | Redirect til detalj på engelsk | ⬜ |
| 4.10 | Verifiser detalj | "Capital", "Win rate", "Pause bot", "Stop session" | ⬜ |
| 4.11 | Gå til /en/dashboard/guide | Guide vises på engelsk | ⬜ |
| 4.12 | Verifiser steg-titler | "Choose mode: Paper or Live", etc. | ⬜ |
| 4.13 | Verifiser FAQ | "Can I lose real money in paper trading?" | ⬜ |

**Notater Flyt 4:**
```
Norske strenger funnet: _______________________
Rå nøkler funnet: _______________________
```

---

## FLYT 5 — Admin System Health (Intern) ⭐⭐

| Steg | Handling | Forventet resultat | Status |
|------|----------|-------------------|--------|
| 5.1 | Logg inn som admin | `admin@klarpakke.no` eller tilsvarende | ⬜ |
| 5.2 | Gå til /no/admin-dashboard | Admin-panel laster | ⬜ |
| 5.3 | Klikk "System Helse" / "System Health" | Dashboard viser metrics | ⬜ |
| 5.4 | Verifiser Cron-jobs | Liste med jobber vises | ⬜ |
| 5.5 | Verifiser Notification-kø | Pending/sent/failed counts | ⬜ |
| 5.6 | Verifiser RLS-status | "X tabeller har RLS aktivert" | ⬜ |
| 5.7 | Verifiser DB-oversikt | Tabell-rader vises | ⬜ |
| 5.8 | Verifiser System-sjekkliste | GitHub, Stripe, Supabase, Resend status | ⬜ |

---

## FLYT 6 — Real-time & Heartbeat (Teknisk) ⭐⭐

| Steg | Handling | Forventet resultat | Status |
|------|----------|-------------------|--------|
| 6.1 | Åpne /no/paper-trading/{aktiv_session} | Sesjon vises med status "Aktiv" | ⬜ |
| 6.2 | Åpne Supabase Dashboard (admin) | Sjekk last_heartbeat for session | ⬜ |
| 6.3 | Vent 5+ minutter uten aktivitet | | ⬜ |
| 6.4 | Refresh paper-trading side | "Bot ikke svarer"-varsel vises | ⬜ |
| 6.5 | Oppdater heartbeat i DB (hvis mulig) | | ⬜ |
| 6.6 | Refresh igjen | Status tilbake til "Aktiv" | ⬜ |

---

## RAPPORTERING

### Template for funn:

```markdown
### Funn #{nr}
**Flyt:** (1/2/3/4/5/6)
**Steg:** (f.eks. 2.8)
**Alvorlighet:** 🔴 Blokkerer / 🟠 Konvertering / 🟡 Kosmetikk
**Beskrivelse:**
(Hva skjedde?)

**Forventet:**
(Hva skulle skje?)

**Faktisk:**
(Hva skjedde faktisk?)

**Screenshots:**
(Beskrivelse av vedlagte bilder)

**Console errors:**
```
(paste fra DevTools)
```

**Network:**
- Request URL: 
- Status: 
- Response: 
```

---

## Oppsummering

| Flyt | Status | Kritiske feil | Kommentar |
|------|--------|---------------|-----------|
| 1 — Ny bruker | ⬜ | | |
| 2 — Paper Trading | ⬜ | | |
| 3 — Sikkerhet | ⬜ | | |
| 4 — i18n EN | ⬜ | | |
| 5 — Admin | ⬜ | | |
| 6 — Real-time | ⬜ | | |

**Samlet vurdering:**
- [ ] ✅ **GO** — Alle kritiske flyter passerer
- [ ] ⚠️ **GO med forbehold** — Mindre feil, ikke blokkerende
- [ ] ❌ **NO-GO** — Kritiske feil funnet

**Signert:** _______________________  
**Dato:** _______________________
