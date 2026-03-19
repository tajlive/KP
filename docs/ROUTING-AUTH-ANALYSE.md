# Routing, resultatsider og innloggingslogikk — analyse

## 1. Hvorfor mange «resultatsider» / signal-sider?

### Overlappende handel/historikk-ruter
- **`/handelshistorikk`** — hovedside for handelshistorikk (trades fra `trades`-tabellen)
- **`/dashboard`** — viser nylige trades i PortfolioDashboard
- **`/dashboard/activity`** — redirect til handelshistorikk (dødslenke)
- **`/dashboard/trading`** — redirect til paper-trading (dødslenke)
- **`/trade`** — redirect til paper-trading (alias)
- **`/paper-trading`** — hovedside for paper trading
- **`/dashboard/auto-trade`** — auto-trading med BotWizard

**Årsak:** Flere ruter viser samme type innhold (trades, resultater) eller redirecter videre. Brukere ser «mange sider» fordi det finnes flere innganger til samme funksjonalitet.

### Duplikate innstillinger/innlogging
- **`/innstillinger`** — standalone (PROTECTED)
- **`/dashboard/innstillinger`** — redirect til `/dashboard/settings`
- **`/dashboard/settings`** — faktisk innstillinger
- **`/innlogging`** — hovedlogin
- **`/login`** — redirect til innlogging
- **`/signup`** — registrering
- **`/registrer`** — redirect til signup

---

## 2. Sider som ikke blir brukt / ligger øverst

### Sidebar (DashboardSidebar)
| Lenke       | Brukt? | Merknad                                |
|------------|--------|----------------------------------------|
| Hjem       | ✅     | Dashboard                              |
| Lær        | ✅     | /kurs                                  |
| Handle     | ✅     | /paper-trading                         |
| Historikk  | ✅     | /handelshistorikk                      |
| Auto-trade | ✅     | /dashboard/auto-trade                  |
| Profil     | ✅     | /profile                               |
| Innstillinger | ✅  | /dashboard/settings                    |

### Mobil-tabs (DashboardTabs)
Kun 4 faner: **Hjem, Lær, Handle, Profil** — **Historikk** mangler på mobil.

### Konsoliderte redirects (middleware)
- `/dashboard/activity` → handelshistorikk
- `/dashboard/trading` → paper-trading  
- `/dashboard/innstillinger` → settings
- `/trade` → paper-trading
- `/auto-trading` → dashboard/auto-trade
- `/auto-trading-ai` → dashboard/auto-trade
- `/login` → innlogging
- `/registrer` → signup

**Implementert mars 2026:** Disse redirects håndteres i middleware; separate page-filer er slettet.

---

## 3. Sider som ber om login/registrering etter innlogging

### Problem
**Middleware redirecter ikke innloggede brukere bort fra auth-sider.** Innlogget bruker som går til `/innlogging` eller `/signup` ser fortsatt innloggings-/registreringsskjema.

### Løsning (implementert i middleware)
```ts
const AUTH_PATHS = ["/innlogging", "/signup", "/registrer", "/login", "/glemt-passord"];
if (user && isAuthPage) {
  return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
}
```

### Sider som viser login/register-oppfordring
| Side            | Viser «Logg inn» når | Korrekt? |
|-----------------|----------------------|----------|
| Paper-trading   | `!user`              | ✅ Kun for uinnloggede |
| Kurs (modul)    | `!user`              | ✅ Kun for uinnloggede |
| Kurs (leksjon)  | `!user`              | ✅ Kun for uinnloggede |
| Marketing-nav   | `!user`              | ✅ Viser Min side/Logg ut når innlogget |
| Priser          | `!user` ved betalt   | ✅ |
| Innlogging      | Alltid skjema       | ❌ Bør redirecte innloggede |
| Signup          | Alltid skjema       | ❌ Bør redirecte innloggede |

---

## 4. Design- og logikkvurdering

### Rute-redundans
- **6+ ruter** peker til handel/resultater (handelshistorikk, activity, trading, trade, paper-trading, dashboard)
- **4+ auth-ruter** (innlogging, login, signup, registrer)

### Anbefalinger
1. **Middleware:** Redirect innloggede brukere fra `/innlogging`, `/signup`, `/registrer`, `/login`, `/glemt-passord` til `/dashboard`.
2. **Client-side backup:** I `InnloggingClient` og `SignupClient`, bruk `useAuth()` og redirect til dashboard hvis `user` finnes.
3. **Historikk på mobil:** Legg til «Historikk» i `DashboardTabs` (NAV_ITEMS) for konsistens med desktop.
4. **Konsolider navigasjon:** Vurder å fjerne `/dashboard/activity` og `/dashboard/trading` som egne ruter og bruke kun redirect, eller fjern dem helt hvis ingen lenker dit.
5. **Dokumenter alias:** Behold `/login` → innlogging og `/registrer` → signup for bakoverkompatibilitet; oppdater lenker til kanoniske ruter der det er mulig.

---

## 5. Signaler / «resultatsider» — tolkning

«Resultatsider» kan bety:
- **A)** Sider som viser trading-resultater (handelshistorikk, dashboard) — mange fordi funksjonaliteten er spredt
- **B)** UX-signaler (knapper, meldinger) som ber om login når bruker allerede er innlogget
- **C)** Sider øverst i navigasjon som brukeren opplever som ubenyttet

Denne analyse dekker alle tre: redundante ruter (A), login-prompt for innloggede (B), og sidebruk i navigasjon (C).
