# ADR: Mobile-First Trading UX + Agent OS Integration (KAOS v1.0)

**Date:** 2026-04-23
**Author:** Klarpakke Agent Swarm (KIMI k2.6 + MemPalace v3.1)
**Status:** Accepted — Implementation Started
**Scope:** Mobile UX Modernization, Agent Orchestration, MemPalace Plan State
**Commit Target:** `mobile-mod-v1`

---

## Context

Klarpakke er en produksjonsklar AI-trading plattform (Next.js 15, React 19, TypeScript 5.9) med:
- **571 dokumenter** i MemPalace, 20 KG-entiteter, 98 facts
- **Swarm v2.0** med 5 spesialiserte agenter
- **MCP profiler** (minimal/medium/full) med 7–18 servere
- **KIMI CLI v1.38.0 + k2.6** med 262k kontekst
- **Production:** www.klarpakke.no

### Nåværende mobiltilstand
- `BottomTabs.tsx` med 5 tabs (home, copyTrading, trade, autoTrade, profile)
- `use-mobile.ts` med 768px breakpoint
- `vaul` (v1.1.2) og `framer-motion` (v12.35.0) installert
- **Mangler:** haptic feedback, bottom sheets, swipe actions, pull-to-refresh, mobile-first portefølje-kort

### Ledende referanser (2026)
- **Robinhood:** Clean trade flows, haptic confirmations, fractional shares UX
- **Coinbase:** Bottom sheets for order preview, mobile asset management
- **Revolut:** Seamless banking→trading, bottom nav with contextual actions
- **TradingView:** Chart-first mobile, paper trading parity

---

## Decision

Vi moderniserer Klarpakkes mobilopplevelse med **7 komponenter** inspirert av verdens ledende trading-apper, samtidig som vi integrerer MemPalace, Plan Mode, Swarm og MCP i en unified **Agent Operating System (KAOS)**.

### 1. Mobile-First Component Suite (Robinhood/Coinbase/Revolut patterns)

| Komponent | Pattern fra | Hva det løser |
|---|---|---|
| `useHaptic` | Robinhood | Tactile feedback på trade-confirmations, tab-presses |
| `MobileBottomSheet` | Coinbase | Order preview, filter panels, quick actions — uten å forlate kontekst |
| `SwipeAction` | Revolut/Robinhood | Swipe-to-delete/close på posisjoner, watchlist |
| `BottomTabs v2` | BingX/Binance | Spring physics, active indicator, haptic, contextual labels |
| `MobileTradingCard` | Robinhood | Portefølje-posisjoner med PnL, sparklines, one-tap trade |
| `PullToRefresh` | Standard iOS/Android | Sync portefølje, refresh priser |
| `MobileOrderFlow` | Coinbase | Bottom sheet-drevet kjøp/salg uten page reload |

### 2. KAOS v1.0 — Agent Operating System

Integrasjon av MemPalace × Plan Mode × MCP × Swarm × CLI:

```
┌─────────────────────────────────────────────────────────────┐
│                     KAOS v1.0 ARCHITECTURE                   │
├─────────────────────────────────────────────────────────────┤
│  MEMORY          │  ORCHESTRATION      │  INTERFACE         │
│  MemPalace v3.1+ │  Swarm v3.0         │  KIMI CLI v2.0     │
│  ├── Plan State  │  ├── Intent Router  │  ├── kimi plan     │
│  ├── Temporal KG │  ├── Checkpointing  │  ├── kimi swarm    │
│  ├── Eval Store  │  └── Retry Logic    │  └── kimi mobile   │
│  └── Realtime FTS│                     │                    │
├─────────────────────────────────────────────────────────────┤
│  TOOLING (MCP)                                               │
│  minimal (7) → daily coding                                  │
│  medium (10) → deploy + research                             │
│  full (18) → full integration                                │
│  auto-switch basert på intent                                │
└─────────────────────────────────────────────────────────────┘
```

### 3. Plan Mode → MemPalace State Machine

**Før:** Planer ble markdown-filer som råtnet.
**Etter:** Planer er KG-facts med tilstand:

```yaml
Plan lifecycle:
  DRAFT       → kg_add(plan-X, "status", "draft")
  APPROVED    → kg_add(plan-X, "status", "approved")
  IN_PROGRESS → kg_add(plan-X, "phase", "3-of-7")
  BLOCKED     → kg_add(plan-X, "blocked_by", "security-review")
  DEPLOYED    → kg_add(plan-X, "status", "deployed")
  ARCHIVED    → kg_add(plan-X, "status", "archived")
```

Hver tilstandsendring trigges av:
- **KIMI CLI:** `kimi plan "feature"` → genererer plan + branch
- **Swarm:** Intent router velger agenter
- **MemPalace:** Checkpoint etter hver fase
- **GitHub Actions:** Auto-merge ved GO på alle gates

### 4. Swarm Dynamic Routing (v3.0)

**Før:** Statisk JSON — `feature` kjører ALLTID `[analyzer, architect, tester, security, knowledge]`.
**Etter:** Intent-basert routing:

```yaml
mobile-ui-change:
  triggers: ["src/shared/ui/**", "src/shared/navigation/**"]
  agents: [analyzer, architect, tester, knowledge]
  skip: [security]  # Med mindre auth-path

trading-logic-change:
  triggers: ["src/lib/trading/**", "src/features/trading/**"]
  agents: [analyzer, architect, tester, security, knowledge]
  required: [security]  # ALLTID for trading
```

### 5. MCP Auto-Profile Switching

**Før:** Manuell bytte `kimi-mcp medium && restart`.
**Etter:** Auto-detect basert på task:

| Task Pattern | MCP Profile | Hvorfor |
|---|---|---|
| `kimi plan` / `kimi feature` | minimal | Rask oppstart |
| `kimi deploy` / `kimi test:e2e` | medium | Deploy + Playwright |
| `kimi research` / `kimi audit` | full | Perplexity + alle integrasjoner |

---

## Consequences

### Positive
- **Mobilopplevelse på nivå med Robinhood/Coinbase** — haptic, bottom sheets, swipe actions
- **Planer er recoverable** på tvers av sessioner via MemPalace KG
- **Swarm blir intelligent** — riktige agenter for riktig jobb
- **MCP blir usynlig** — riktig profil uten manuell bytte
- **Agent-evaluering** — hver task får score, trener fremtidige agenter

### Negative / Risks
- **Bundle size:** framer-motion + vaul allerede installert, men nye komponenter øker JS
  - **Mitigation:** Lazy load mobile-komponenter med `next/dynamic`
- **Kompleksitet:** KAOS v1.0 er mer kompleks enn dagens statiske JSON
  - **Mitigation:** Fase-inn implementering, bakoverkompatibel
- **i18n:** Nye UI-patterns krever nye oversettelser
  - **Mitigation:** i18n keys genereres automatisk av `knowledge` agent

### Breaking Changes
- None. Alle endringer er additive.

---

## Implementation Phases

| Fase | Duration | Deliverables | Agent Assignment |
|---|---|---|---|
| 1 | 1–2 dager | Core hooks + BottomSheet + BottomTabs v2 | mobile-agent + knowledge |
| 2 | 2–3 dager | SwipeAction + MobileTradingCard + PullToRefresh | mobile-agent + tester |
| 3 | 3–5 dager | KAOS v1.0: Plan State + Swarm Router + MCP Auto | architect + knowledge |
| 4 | 1 uke | MobileOrderFlow + full E2E testing | tester + security |

---

## Quality Gates
- [ ] Lighthouse mobile score ≥ 90
- [ ] No CLS (Cumulative Layout Shift) on BottomTabs
- [ ] Haptic works on iOS Safari + Android Chrome
- [ ] All new components have Storybook stories
- [ ] i18n: no + en keys complete
- [ ] 679 unit tests pass
- [ ] MemPalace KG updated with new facts

---

## References
- Robinhood Mobile UX 2026: stockbrokers.com/guides/mobile-trading
- MemPalace v3.1: `.kimi/AGENTS.md` — MemPalace MCP v3.1
- Swarm v2.0: `.kimi/swarm-config.json`
- MCP Optimization: `.kimi/AGENTS.md` — MCP-optimalisering
- KIMI CLI v1.38.0: `.kimi/AGENT-KLARPAKKE.md`
