# Paper Trading – analyse av /paper-trading (f.eks. /en/paper-trading)

**URL:** https://www.klarpakke.no/en/paper-trading  
**Formål:** Full analyse av flyt, auth, innhold og anbefalinger.

---

## Hvorfor var /paper-trading beskyttet?

Siden viste **brukerspesifikke data** (liste over egne sessions, lekepengesaldo). Da appen ble satt opp, ble alle slike «app-områder» lagt i `PROTECTED_PATHS` i middleware – kun innloggede brukere fikk tilgang. Det ga enkel og konsistent regel: «alt som krever brukerdata er beskyttet».

**Nå (mars 2026):** `/paper-trading` er **ubeskyttet**. Uinnloggede får en offentlig teaser med CTA «Logg inn» / «Opprett konto»; innloggede får den vanlige listen over sessions og saldo. Dermed kan besøkende se tilbudet før de registrerer seg.

---

## 1. Hva brukeren ser

| Tilstand       | Resultat                                                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Uinnlogget** | Offentlig teaser: «Øv trading med 100 000 kr lekepenger», knapper «Logg inn» og «Opprett konto» (lenket til innlogging/signup med redirect tilbake til paper-trading). |
| **Innlogget**  | Paper trading-oversikt: tilgjengelig saldo (lekepenger), liste over sessions, knapp «Ny session», realtime-oppdatering.                                                |

---

## 2. Routing og middleware

- **Middleware** (`src/middleware.ts`): `/paper-trading` står i `PROTECTED_PATHS`. Uinnlogget → redirect til `/${locale}/innlogging` med `next=${pathname}` (f.eks. `next=/en/paper-trading`).
- **Layout** (`src/app/[locale]/paper-trading/layout.tsx`): Client-side: `AuthProvider`, `ToastProvider`, `TradingModeProvider`, `ClientSideProviders`, `ErrorBoundary`. Ingen felles navigasjonsbar her; layouten er minimal (wrapper med `pt-16`).
- **Sider:**
  - `page.tsx` → liste over paper trading-sessions (krever auth via `requireAuth`).
  - `[session_id]/page.tsx` → detalj for én session (krever auth + at session tilhører bruker).

---

## 3. Auth-flyt (redirect tilbake til paper-trading)

1. Bruker åpner `/en/paper-trading` uten session.
2. Middleware: `isProtected && !user` → redirect til `/en/innlogging?next=/en/paper-trading`.
3. **InnloggingClient** leser `searchParams.next` → `safeRedirectTo = sanitizeClientRedirect("/en/paper-trading", "en")` → tillatt relativ sti, så `safeRedirectTo = "/en/paper-trading"`.
4. Etter vellykket innlogging: `router.push(safeRedirectTo)` → bruker havner på `/en/paper-trading`.

`sanitizeClientRedirect` tillater alle relative stier som ikke inneholder `/innlogging` og ikke er `//`. Så redirect tilbake til paper-trading fungerer som tenkt.

---

## 4. Data og API

**Side `page.tsx` (liste):**

- **Supabase:**
  - `trading_sessions`: `user_id`, `mode = 'paper'`, sortert nyeste først; felter: id, mode, status, trading_pair, strategy_id, current_capital_nok, starting_capital_nok, total_pnl, winning_trades, total_trades, created_at.
  - `user_profiles`: `paper_balance` for bruker (default 100_000).
- **Komponent:** `PaperTradingList` får `sessions`, `balance`, `locale`, `userId`.

**Side `[session_id]/page.tsx` (detalj):**

- Session hentes med `user_id`-sjekk (RLS/eiersjekk).
- `trades` for session (siste 20).

**API-ruter brukt fra klient:**

- `POST /api/trading-sessions/create` – oppretter ny paper-session (trading_pair, starting_capital_nok).
- `GET /api/paper-trading/balance` – brukes andre steder (f.eks. PaperTradingCard).
- `POST /api/paper-trading/execute` – utfør paper trade (fra TradingInterface m.m.).
- `POST /api/paper-trading/init` – init/oppdater paper-oppsett.

---

## 5. Komponenter og funksjon

**PaperTradingList:**

- Viser tilgjengelig saldo (lekepenger) og knapp «Ny session».
- Modal for ny session: valg av handelspar (BTC/USDT, ETH/USDT, SOL/USDT), startkapital.
- Kall til `POST /api/trading-sessions/create` → redirect til `/${locale}/paper-trading/${data.session_id}`.
- Liste over sessions med status (active, paused, stopped, crashed), PnL, antall trades, lenke til session-detalj.
- **Realtime:** abonnement på `trading_sessions` med `user_id=eq.${userId}`; ved endring → `router.refresh()` og oppdatert «Sist oppdatert».

**PaperTradingSessionDetail** (session-detalj):

- Brukes på `/[locale]/paper-trading/[session_id]`.
- Får session + trades; bruker Realtime på den sessionen for live oppdateringer.

---

## 6. i18n og innhold

- Namespace `paperTrading` (f.eks. `messages/en/paperTrading.json` / `no`): titler, beskrivelser, «Ny session», «Tilgjengelig saldo», status-labels, «Sist oppdatert», «Oppdater liste», Binance-info osv.
- Kontekstbanner: «100 000 kr virtuelt – ingen ekte penger» (eller tilsvarende) vises øverst på både liste- og session-side.

---

## 7. Potensielle forbedringer

| Område                    | Anbefaling                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Uinnlogget opplevelse** | Nå: kun redirect til login. Alternativ: egen landingsside for `/paper-trading` (teaser, «100k virtuell kapital», CTA «Log in to start») som ikke krever innlogging; kun liste og session-sider forblir beskyttet. |
| **Redirect etter login**  | Allerede korrekt: `next` sendes og brukes. Verifiser at alle innloggingskanaler (e-post, Vipps, Google, osv.) respekterer `redirectPath`/`safeRedirectTo`.                                                        |
| **Layout**                | Paper-trading har egen layout uten dashboard-sidebar. Brukere som kommer fra «Handle» i sidebar får full liste; tydelig lenke «Tilbake til dashboard» eller bruk av felles shell kan strammes inn hvis ønskelig.  |
| **Feilhåndtering**        | `requireAuth` i page kaster redirect; ved feil i data returneres `PaperTradingErrorFallback` med lenker til paper-trading og dashboard. RLS og session-tilgang er begrenset til eier.                             |
| **Realtime**              | Realtime for `trading_sessions` krever at tabellen er i `supabase_realtime`-publikasjonen; hvis ikke, oppdateres listen kun ved manuell refresh eller navigering.                                                 |

---

## 8. Kort sjekkliste

- [x] Middleware: `/paper-trading` er beskyttet og sender `next` til innlogging.
- [x] Innlogging: `next` leses og sanitizes; redirect til `/en/paper-trading` etter login er tillatt.
- [x] Liste-side: henter sessions og paper_balance; viser PaperTradingList med mulighet for ny session.
- [x] Session-side: eiersjekk, henter trades, viser PaperTradingSessionDetail.
- [x] API: create session, execute, balance, init – brukes der det skal.
- [ ] Valgfritt: public landing for `/paper-trading` uten auth (teaser + CTA).
- [ ] Valgfritt: verifiser at Realtime er aktivert for `trading_sessions` i Supabase.

---

_Sist oppdatert: mars 2026._
