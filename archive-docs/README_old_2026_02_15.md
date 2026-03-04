# 🎓 Klarpakke Universitet

**Norges første utdanningsplattform med 100% simulert trading.**

🚀 **LIVE i Beta:** [www.klarpakke.no](https://www.klarpakke.no)  
📅 **Siste Oppdatering:** 11. februar 2026 (i18n & Content Expansion)

---

## 🏗️ Systemarkitektur & "Hookup"

### 1. Internationalization (i18n)
Vi bruker `next-intl` for full flerspråklig støtte.
- **Mappe-struktur:** `src/app/[locale]/` håndterer ruting.
- **Ordbøker:** `messages/no.json` (hoved) og `messages/en.json` håndterer alle tekster.
- **Logikk:** Bruker `useTranslations` for klientside og `getTranslations` for serverside.
- **Bilde-assets:** Logoer ligger i `public/logo.png`.

### 2. Autentisering & Brukerdata
- **Provider:** Supabase Auth.
- **Flyt:** Brukere logger inn via Google, Microsoft eller E-post.
- **Data:** `AuthContext.tsx` tilbyr brukerstatus til hele appen.
- **Middleware:** Beskytter dashboard og beta-sider, omdirigerer uinnloggede til `/login`.

### 3. Trading Simulering (Risk-Free)
- **Kapital:** Hver nye bruker starter med 1 000 000 kr i virtuell kapital.
- **Priser:** Hentes i sanntid via Binance API (se `src/lib/binance.ts`).
- **Logikk:** Alle dealer lagres i Supabase, men ingen penger flyttes.

### 4. Kurs & Innhold
- **Struktur:** Innholdet er delt inn i moduler (Uke 1-4).
- **Interaksjon:** Quizer (med forklaringer) og kalkulatorer hjelper med læring.
- **Betaling:** Stripe håndterer abonnementer (Basis, Komplett, Pro).

---

## ✨ Nøkkelfunksjoner

- ✅ **Paper Trading** - Full simulering med ekte markedshistorikk og priser.
- ✅ **Trading Quiz** - Test kunnskap med umiddelbar feedback og forklaringer.
- ✅ **Kalkulator** - Verktøy for å beregne risk/reward og posisjonsstørrelser.
- ✅ **Help Center** - Omfattende FAQ og support-system (refaktoert til i18n).

---

## 🛠️ Tech Stack

| Lag | Teknologi |
|-----|-----------|
| **Frontend** | Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS |
| **I18n** | `next-intl` |
| **Backend** | Supabase (Postgres, RLS, Auth) |
| **Trading Data** | Binance Public API |
| **Hosting** | Cloudflare Pages / Vercel |
| **Payments** | Stripe |

---

## 🚀 Utvikling & Workflow

### Lokalt Oppsett
```bash
npm install --legacy-peer-deps
npm run dev
```

### Oversettelser
For å legge til nye tekster:
1. Legg til nøkkel i `messages/no.json`.
2. Legg til engelsk oversettelse i `messages/en.json`.
3. Bruk `const t = useTranslations('namespace');` i koden.

---

## 🚢 Deployment

Vi bruker en 5-fase verifisering før hver release:
1. **Security Scan**
2. **Linting & Type Check**
3. **Database Migration** (via Supabase CLI)
4. **Vercel/Cloudflare Build**
5. **E2E Testing** (Playwright)

---

## 🔐 Sikkerhet
- **RLS (Row Level Security):** Alle databasetabeller er sikret.
- **Cookie Security:** Bruker `secure: true` og `sameSite: 'lax'` for auth tokens.
- **Logging:** All admin-aktivitet spores i `audit_logs`.

---

© 2026 Klarpakke AS. Laget med 💙 for norske kryptotradere.
# GitHub Actions test
# Deploy via GitHub Actions
