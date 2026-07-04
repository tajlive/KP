# Cockpit Preview + “See as User X” — UI/UX Design (Final)

> **Basis:** `local://cockpit-preview-synthesis.md`  
> **Innspill:** ScreenshotEngineDesign, ImpersonationDesign, SecurityBoundaries, PreviewUIDesign  
> **Forfatter:** Senior UI/UX Designer  
> **Dato:** 2026-07-04

---

## 1. Overordnet retning

En **én-hub-løsning** under `/admin/support` som kombinerer både:
- **B:** Forhåndsvisning / rapportdeling av Cockpit (screenshot + nøkkeltall)
- **C:** “Se som bruker X”-modus for support (kortlevet impersonation, read-only som standard)

Valgt avveining: vi gjenbruker eksisterende admin-layout, farger og komponenter. Ingen nye fargepalett eller ikonset — løsningen skal føles som en naturlig utvidelse av admin-panelet.

---

## 2. Designprinsipper

| Prinsipp | Hvordan |
|----------|---------|
| **Klikk-minimal** | Maks to klikk fra brukerliste til preview/impersonation. |
| **Gjenbruk** | Eksisterende `TABLE`-tokens, `badge`-/`button`-komponenter, `dialog` og `input` fra `src/shared/ui`. |
| **Tydelig advarsel** | Impersonation-banner er iøynefallende, fast og ikke-avvisbart. |
| **Read-first** | “Se som bruker” er lesemodus som standard; skrivende handlinger blokkeres. |
| **Mobilvennlig** | Hubben og audit-logen fungerer på desktop og mobil. Impersonation viser mobil-Cockpit. |

---

## 3. Filer som opprettes

| Fil | Hva |
|-----|-----|
| `src/app/[locale]/(admin)/admin/support/page.tsx` | Hub: søk, brukerliste, audit-log-fane. |
| `src/app/[locale]/(admin)/admin/support/preview/[userId]/page.tsx` | Rapportside med screenshot + nøkkeltall. |
| `src/app/[locale]/(admin)/admin/support/impersonate/page.tsx` | Landing før vi bytter cookie og sender til `/handel`. |
| `src/components/admin/support/UserSearchInput.tsx` | Gjenbrukbar søk + autocomplete mot `/api/admin/users/search`. |
| `src/components/admin/support/CockpitPreviewCard.tsx` | Kort med screenshot-thumbnail, status, P&L, siste handel. |
| `src/components/admin/support/ImpersonationBanner.tsx` | Fast, ikke-avvisbart banner med “Avslutt”-CTA. |
| `src/components/admin/support/SupportAuditLog.tsx` | Tabell over preview/impersonation-hendelser. |

## 4. Filer som endres

| Fil | Endring |
|-----|---------|
| `src/app/[locale]/(admin)/admin/layout.tsx` | Nytt nav-objekt: **Support** under `sectionUsers`. |
| `src/app/[locale]/(admin)/admin/users/ClientAdminUsers.tsx` | To nye handlinger per rad: **Forhåndsvis** og **Se som bruker**. |
| `src/app/[locale]/(user)/handel/layout.tsx` | Legge inn `<ImpersonationBanner />` dersom `__impersonate`-cookie finnes. |
| `src/shared/ui/button.tsx` / `badge.tsx` | Ingen endring; brukes som de er. |

---

## 5. Ruter / sider

| Rute | Formål | Merking |
|------|--------|---------|
| `/admin/support` | Hovedhub: søk, brukerliste, audit-log. | `admin/support` |
| `/admin/support/preview/[userId]` | Rapportside: screenshot, P&L, siste handler, lenke til full rapport. | `admin/support/preview` |
| `/admin/support/report/[token]` | Offentlig/tilgangsstyrt visning av generert rapport (signert URL). | `admin/support/report` |
| `/admin/support/impersonate` | Landingsside som starter impersonation, setter cookie, redirecter. | `admin/support/impersonate` |
| `/handel` (vanlig brukerrute) | Rendres med target-brukerens auth via cookie-swap; banner vises. | gjenbruker eksisterende rute |

---

## 6. Wireframe-beskrivelser

### 6.1 `/admin/support` — Hub

```
┌────────────────────────────────────────────────────────────┐
│ Admin  →  Support                                            │
├────────────────────────────────────────────────────────────┤
│ [Søk bruker...]   [🔍 Søk]                                  │
│────────────────────────────────────────────────────────────│
│ Faner: [Siste aktivitet] [Brukere] [Audit-log]              │
│────────────────────────────────────────────────────────────│
│  Bruker              Sist aktiv    Handlinger               │
│  Viking_NO           2 min siden   [Forhåndsvis] [Se som]   │
│  Ola_Nordmann        1 t siden     [Forhåndsvis] [Se som]   │
│  ...                                                        │
└────────────────────────────────────────────────────────────┘
```

**Komponenter:**
- `UserSearchInput`: debounced søk, treff viser avatar + e-post + KP-nummer.
- `SupportAuditLog`: tabell med kolonner: Tid, Admin, Bruker, Type, Status, IP/land.
- Faner bygget med `src/shared/ui/tabs.tsx`.

**Klikk:**  
- Velg bruker → 1 klikk til preview eller impersonate.

### 6.2 `/admin/support/preview/[userId]` — Rapportside

```
┌────────────────────────────────────────────────────────────┐
│ ← Tilbake  |  Viking_NO  |  Generer rapport (hoved-CTA)     │
├────────────────────────────────────────────────────────────┤
│  ┌──────────┐  P&L i dag:   +1 234 kr  (+2.4 %)            │
│  │          │  Kapital:      504 013 kr                    │
│  │ Screenshot│  Siste handel: 14:32 BTCUSDT BUY 150 kr     │
│  │ thumbnail│  Modus:        Paper                          │
│  └──────────┘  Tier:         Professor                      │
│  [Se fullt screenshot]  [Last ned PDF]                      │
└────────────────────────────────────────────────────────────┘
```

**Komponenter:**
- `CockpitPreviewCard`: bilde med `aspect-ratio` 16:9, overlay med statusbadge.
- `button` (primary brand): “Generer rapport”.
- `badge`: “Paper”, “Live”, “Professor”.

### 6.3 `/handel` i impersonation-modus

```
┌────────────────────────────────────────────────────────────┐
│ 🟠 Du ser nå Cockpit som Viking_NO. Read-only. [Avslutt]     │
├────────────────────────────────────────────────────────────┤
│  (Vanlig TradingCockpit, men autentisert som target-bruker)│
└────────────────────────────────────────────────────────────┘
```

**Komponenter:**
- `ImpersonationBanner`: fast `fixed top-0`, høyde ~48 px, `bg-amber-500/20 border-b border-amber-500/40`, tekst hvit.
- Banner-et reduserer ikke innhold; `AppShell` får `pt-12` når banner aktiv.

---

## 7. Interaksjonsflyt

### 7.1 Generere preview-rapport

1. Admin går til `/admin/support`.
2. Søker etter bruker eller klikker direkte i listen.
3. Klikker **Forhåndsvis** → `/admin/support/preview/[userId]`.
4. Klikker **Generer rapport** → POST `/api/admin/support/report`.
5. API trigger Playwright-job (GitHub Actions / Edge Function) og lagrer PDF/PNG i privat bucket.
6. Signert URL returneres; kortet oppdateres med thumbnail og “Last ned PDF”-lenke.
7. Audit-logg skrives: `type=preview`, `admin_id`, `target_user_id`, `report_token`.

### 7.2 “Se som bruker X”

1. Admin går til `/admin/support`.
2. Klikker **Se som bruker** ved ønsket rad.
3. POST `/api/admin/support/impersonate/start`:
   - Sjekker admin-rettigheter (`verifyAdminAccess`).
   - Oppretter kortlevet JWT (15 min), JTI, skriver `support_impersonation_sessions`.
   - Returnerer cookie-config + token.
4. Klient setter `__impersonate`-cookie (HttpOnly, Secure, SameSite=None, 15 min).
5. Redirect til `/handel`.
6. Middleware `/lib/middleware/auth.ts` oppdager cookie, validerer JWT, bytter Supabase-cookies til target-bruker.
7. `TradingCockpit` rendrer med target-brukerens data og RLS intakt.
8. Impersonation-banner vises. Klikk **Avslutt**:
   - POST `/api/admin/support/impersonate/end`
   - Sletter cookie, redirecter tilbake `/admin/support`.
9. Audit-logg skrives ved start og slutt.

### 7.3 Audit-log

- Tabellen laster 50 siste rader fra `/api/admin/support/audit-log`.
- Filtrer på type: `preview`, `impersonate_start`, `impersonate_end`.
- Paginering med `src/shared/ui/pagination.tsx`.

---

## 8. Komponentstruktur

```mermaid
flowchart TD
    A[/admin/support] --> B[UserSearchInput]
    A --> C[SupportAuditLog]
    A --> D[ClientUsersTable]
    D --> E[/admin/support/preview/[userId]]
    E --> F[CockpitPreviewCard]
    F --> G[Generer rapport]
    D --> H[/admin/support/impersonate]
    H --> I[__impersonate cookie]
    I --> J[/handel med ImpersonationBanner]
    J --> K[Avslutt impersonation]
```

---

## 9. Bruk av eksisterende design-tokens og komponenter

| Token/komponent | Bruk |
|-----------------|------|
| `BRAND_COLOR.DEFAULT` (#0052FF) | Primær CTA: “Generer rapport”, “Se som bruker”. |
| `SURFACE.BG_CARD`, `SURFACE.BORDER`, `RADIUS.card` | Kort på hub og preview. |
| `TABLE.cell`, `TABLE.header`, `TABLE.row` | Brukerliste og audit-log. |
| `src/shared/ui/badge.tsx` | Statusmerker: Paper, Live, Professor, Admin. |
| `src/shared/ui/button.tsx` | Alle knapper. |
| `src/shared/ui/input.tsx` | Søkefelt. |
| `src/shared/ui/tabs.tsx` | Faner på hub. |
| `src/shared/ui/dialog.tsx` | Bekreftelsesmodal ved start av impersonation. |

---

## 10. Risikoer og blokkerere

| Risiko | Løsning |
|--------|---------|
| Impersonation krever sikker cookie-swap i middleware. | Logikkeksperten må godkjenne JWT-strategi og secret-håndtering. |
| Muterende ruter må blokkeres under impersonation. | Alle `/api/*` som skriver må sjekke `impersonation-guard`. |
| Skjermbilder av produksjon kan eksponere sensitiv data. | Private bucket, signerte kortlevede URL-er, admin-only tilgang. |
| Brukeropplevelsen kan bli treg hvis rapportgenerering er synkron. | Asynkron jobb + polling/progress-indikator. |
| Mobil visning av admin-hub. | Bruk responsiv grid og `MOBILE.touchTarget`. |

---

## 11. Anbefalt implementasjonsrekkefølge

1. Legg til **Support** i admin-navigasjonen.
2. Opprett `/admin/support` med søk + audit-log-fane (lesedata fra eksisterende `user_profiles`).
3. Legg til **Forhåndsvis**- og **Se som bruker**-handlinger i `/admin/users`.
4. Bygg `CockpitPreviewCard` og `/admin/support/preview/[userId]`.
5. Implementer impersonation-banner i `/handel`-layout.
6. Koble API-ruter (`/api/admin/support/*`) når backend er klar.

---

## 12. Referanser

- Synthesis: `local://cockpit-preview-synthesis.md`
- Screenshot/rapport: `/tmp/cockpit-screenshot-report-design.md`
- Impersonation: `/tmp/cockpit-impersonation-design.md`
- Eksisterende admin UI: `src/app/[locale]/(admin)/admin/layout.tsx`, `src/app/[locale]/(admin)/admin/users/ClientAdminUsers.tsx`
- Design tokens: `src/lib/design/tokens.ts`
- UI-komponenter: `src/shared/ui/*`
