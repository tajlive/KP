# Nettside-Redesign: Modernisering + Modellvalg

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Full modernisering av klarpakke.no — nye bilder, video, ikoner, og beslutning om KIMI K3 1M via Kimi Desktop eller Hermes.

**Architecture:** Design-system-first tilnærming. Bygg komponentbibliotek først, deretter sider. Bruk KIMI K3 1M for design-generering og iterasjon.

**Tech Stack:** Next.js 16, Tailwind CSS 4, Framer Motion, Lucide ikoner, KIMI K3 (design + innhold), Cloudflare Workers.

---

## Modellvalg: KIMI K3 1M — Kimi Desktop vs Hermes

| Aspekt | Kimi Desktop | Hermes (Kimi K3 Ultra 1M) |
|--------|-----------|---------------------------|
| **Kontekst-vindu** | 1M tokens | 1M tokens (samme) |
| **Bruk** | Design-iterasjon, brainstorming | Kode-generering, repo-integrasjon |
| **Verktøy** | Ingen repo-tilgang | Full repo-tilgang, terminal, DB |
| **Design-output** | Skjermbilder, beskrivelser | HTML/CSS/TSX direkte |
| **Deploy** | Manuell | Automatisk via CI |
| **Best for** | «Hvordan skal det se ut?» | «Bygg det» |

**Anbefaling:** **Bruk BEGGE.**

| Fase | Verktøy | Hvorfor |
|------|---------|---------|
| **Design-utforskning** | Kimi Desktop | Raske iterasjoner, moodboards, fargepaletter |
| **Kode-implementasjon** | Hermes K3 | Direkte repo-endringer, deploy, verifisering |

**Workflow:**
1. **Kimi Desktop:** «Lag en moderne landingsside for en norsk krypto-plattform. Mørkt tema, store knapper, enkel navigasjon.»
2. **Kimi Desktop:** Iterer — «mer luft», «større tekst», «norsk feel»
3. **Hermes K3:** «Implementer dette designet i Next.js + Tailwind»
4. **Hermes K3:** Deploy, verifiser, fiks bugs

---

## Redesign-Scope

### Sider som skal moderniseres

| Side | Nåværende | Ny | Prioritet |
|------|-----------|-----|-----------|
| `/` (landing) | Standard | Hero + video + «Start gratis» | 🔴 P0 |
| `/priser` | Tekst-tabell | Visuell tier-sammenligning | 🔴 P0 |
| `/dashboard` | BestemorPanel | Pilot-dashboard (ny) | 🔴 P0 |
| `/handel` | Trading-terminal | Pilot Start/Stopp | 🟠 P1 |
| `/om-oss` | Tekst | Toms historie + bilder | 🟡 P2 |
| `/marked` | Liste | Interaktivt chart | 🟡 P2 |

### Design-elementer

| Element | Fra | Til |
|---------|-----|-----|
| **Bilder** | Ingen / generiske | AI-genererte norske folk, fjord/landskap |
| **Video** | Ingen | Hero-video (15s loop) — «Piloten jobber mens du sover» |
| **Ikoner** | Lucide (bra) | Lucide + custom «Pilot»-ikon |
| **Farger** | Mørk blå | Mørk blå + grønn (profitt) + rød (tap) — trafikklys |
| **Typografi** | Inter | Inter (behold) — men større, mer luft |
| **Animasjoner** | Minimale | Framer Motion — subtle, profesjonelle |

---

## Task-by-Task Plan

### Fase 0: Design-utforskning (Kimi Desktop)

**Task 0.1: Moodboard + fargepalett**

**Input til Kimi Desktop:**
> «Lag et moodboard for en norsk krypto-trading plattform. Målgruppe: 50+ år, ikke tekniske. Følelse: trygg, enkel, moderne. Farger: mørk blå, grønn (profitt), rød (tap). Referanser: Pionex, Stripe, Linear.»

**Output:** 3-5 design-forslag som bilder

**Task 0.2: Hero-seksjon**

**Input:**
> «Lag en hero-seksjon med: 1) Stor overskrift 'La Piloten handle for deg', 2) Underoverskrift '100 000 kr i lekepenger. Ekte markeder. Null risiko.', 3) Grønn 'Start gratis'-knapp, 4) Bakgrunnsvideo av rolig fjord/natur, 5) Tillitsbyggende elementer (norsk flagg, sikkerhet-ikoner).»

**Task 0.3: Pilot-dashboard**

**Input:**
> «Lag et dashboard for 'Klarpakke Pilot': 1) Stor 'Start Piloten'-knapp, 2) Trafikklys-status (grønn=går, gul=venter, rød=stoppet), 3) Gevinst/tap i store tall (48px), 4) LLM-forklaring i enkle setninger, 5) Ingen tekniske begreper.»

---

### Fase 1: Design-system (Hermes K3)

**Task 1.1: Tailwind-konfigurasjon**

**Files:**
- Modify: `tailwind.config.ts` — nye farger, spacing, typografi

**Step 1:** Definer fargepalett:
```typescript
colors: {
  pilot: {
    green: '#22c55e',    // profitt
    red: '#ef4444',      // tap
    yellow: '#eab308',   // venting
    blue: '#0f172a',     // bakgrunn
  }
}
```

**Step 2:** Typografi — større, mer luft:
```typescript
fontSize: {
  'pilot-hero': ['4rem', { lineHeight: '1.1' }],
  'pilot-big': ['3rem', { lineHeight: '1.2' }],
}
```

**Task 1.2: Komponentbibliotek**

**Files:**
- Create: `src/components/ui/PilotButton.tsx`
- Create: `src/components/ui/PilotCard.tsx`
- Create: `src/components/ui/PilotStatus.tsx`

**Step 1:** TDD — test at knapp rendrer, klikk fungerer
**Step 2:** Implementasjon — Framer Motion animasjoner
**Step 3:** Storybook (valgfritt) — eller bare bruk i sider

---

### Fase 2: Landingsside (Hermes K3)

**Task 2.1: Hero-seksjon**

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/features/landing/PilotHero.tsx`

**Step 1:** Implementer design fra Kimi Desktop
**Step 2:** Video-bakgrunn — `<video autoPlay muted loop>` med fallback-bilde
**Step 3:** «Start gratis» → /pilot (ny side)

**Task 2.2: Tillits-seksjon**

**Files:**
- Create: `src/features/landing/TrustSection.tsx`

**Step 1:** «Hvorfor Klarpakke?» — 3 kort: Enkel, Norsk, Bevist
**Step 2:** Ikoner + korte tekster
**Step 3:** LLM-generert innhold (norsk, mormor-vennlig)

---

### Fase 3: Pilot-dashboard (Hermes K3)

**Task 3.1: Start/Stopp-knapp**

**Files:**
- Create: `src/features/pilot/PilotControl.tsx`

**Step 1:** Stor knapp — «Start Piloten» / «Stopp Piloten»
**Step 2:** Animasjon ved klikk — bekreftelse-popup
**Step 3:** Status-endring i DB

**Task 3.2: LLM-feed**

**Files:**
- Create: `src/features/pilot/PilotFeed.tsx`

**Step 1:** Hent siste 5 LLM-forklaringer
**Step 2:** Vis i enkle kort — «Piloten kjøpte SOL fordi...»
**Step 3:** Oppdater hvert 5. minutt

---

### Fase 4: Media-generering (Kimi Desktop + AI-verktøy)

**Task 4.1: Bilder**

| Bilde | Verktøy | Beskrivelse |
|-------|---------|-------------|
| Hero-bakgrunn | Midjourney/FLUX | Norsk fjord, rolig, mørkt |
| «Piloten» avatar | FLUX | Vennlig robot/assistent, norsk look |
| Trust-ikoner | Lucide + custom | Sikkerhet, norsk flagg, enkelhet |

**Task 4.2: Video**

| Video | Verktøy | Beskrivelse |
|-------|---------|-------------|
| Hero-loop | Runway/Pika | 15s — rolig natur, tekst-overlay «Piloten jobber» |

---

## Tidsplan

| Uke | Fase | Deliverable |
|-----|------|-------------|
| 1 | Design-utforskning | Moodboard, hero-design, dashboard-design |
| 2 | Design-system | Tailwind-config, komponentbibliotek |
| 3 | Landingsside | Ny `/` med hero + trust |
| 4 | Pilot-dashboard | Ny `/pilot` med Start/Stopp + LLM-feed |
| 5 | Media | Bilder, video, ikoner generert |
| 6 | Polish | Animasjoner, responsivt, testing |

---

## Risikoer

| Risiko | Sannsynlighet | Tiltak |
|--------|-------------|--------|
| Design ikke «norsk nok» | Middels | Iterer i Kimi Desktop med norske referanser |
| Video for treg | Middels | Optimaliser — WebM, lazy-load, fallback-bilde |
| LLM-innhold ikke mormor-vennlig | Lav | Test med ekte brukere (Tom + familie) |
| For mange endringer på en gang | Høy | Én side om gangen — ikke alt samtidig |

---

## Neste handling

**A:** Start Fase 0 — design-utforskning i Kimi Desktop (du kjører, jeg venter)
**B:** Start Fase 1 — design-system i Hermes (jeg koder, du gir design-input)
**C:** Kombinasjon — du designer i Kimi Desktop, jeg koder i Hermes parallelt