# Plan: Mobile-First Trading UX Modernization + KAOS v1.0

**Dato:** 2026-04-23  
**Agent:** KIMI k2.6 (Lead Architect + Mobile Specialist)  
**Status:** 🚧 IN_PROGRESS — Fase 1 påbegynt  
**Branch:** `main` (YOLO-modus)  
**Mål:** Mobilopplevelse på nivå med Robinhood/Coinbase + Agent OS integrasjon

---

## 1. Fase 1: Core Mobile Infrastructure (Dag 1)

### 1.1 Hooks
- [x] `src/hooks/use-haptic.ts` — Haptic feedback med fallback
- [ ] `src/hooks/use-pull-to-refresh.ts` — Touch events + refresh callback

### 1.2 UI Components (shared/ui)
- [x] `src/shared/ui/mobile-bottom-sheet.tsx` — vaul + framer-motion wrapper
- [x] `src/shared/ui/swipe-action.tsx` — Swipe-to-action med snap-back
- [x] `src/shared/ui/mobile-trading-card.tsx` — Portefølje-kort med PnL + sparkline

### 1.3 Navigation Upgrade
- [x] `src/shared/navigation/BottomTabs.tsx` v2 — Spring physics, haptic, active indicator

### 1.4 i18n
- [x] Oppdatere `messages/no.json` + `messages/en.json` med nye mobil-keys

---

## 2. Fase 2: Mobile Patterns (Dag 2–3)

### 2.1 Dashboard Mobile
- [ ] `src/features/dashboard/MobilePortfolioList.tsx` — Liste med SwipeAction + MobileTradingCard
- [ ] `src/features/dashboard/MobileQuickActions.tsx` — Bottom sheet med kjøp/salg/transfer

### 2.2 Trading Mobile
- [ ] `src/features/trading/MobileOrderSheet.tsx` — Bottom sheet order flow
- [ ] `src/features/trading/MobileChartPreview.tsx` — Mini-chart i kort

### 2.3 Pull-to-Refresh
- [ ] Integrere `PullToRefresh` på dashboard og trading-sider

---

## 3. Fase 3: KAOS v1.0 Integration (Dag 3–5)

### 3.1 MemPalace Plan State
- [ ] `scripts/plan-state-manager.mjs` — KG-basert plan lifecycle
- [ ] `kimi plan` CLI-kommando

### 3.2 Swarm Dynamic Router
- [ ] `.kimi/swarm/intent-router.mjs` — Intent-basert agent selection
- [ ] Oppdatere `.kimi/swarm-config.json` v3.0

### 3.3 MCP Auto-Profile
- [ ] `scripts/mcp-auto-profile.mjs` — Auto-detect + switch

---

## 4. Fase 4: Polish & Testing (Uke 2)

### 4.1 Testing
- [ ] Playwright mobile tests (iPhone 14 + Pixel 7)
- [ ] Haptic testing på fysisk enhet
- [ ] Lighthouse mobile audit

### 4.2 Storybook
- [ ] Stories for alle nye komponenter

### 4.3 MemPalace Sync
- [ ] KG backfill med nye mobile-facts
- [ ] Diary entry for hver fase

---

## Agent Assignments

| Fase | Primary Agent | Support Agents | MCP Profile |
|---|---|---|---|
| 1 | mobile-agent | knowledge | minimal |
| 2 | mobile-agent | tester | minimal |
| 3 | architect | knowledge | medium |
| 4 | tester | security | medium |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Bundle size ↑ | Medium | Lazy load med `next/dynamic` |
| iOS haptic ikke støttet | Low | Feature-detect `navigator.vibrate` |
| Bottom sheet z-index konflikt | Medium | Consistent z-30+ hierarchy |
| Swipe konflikt med scroll | Medium | `touch-action: pan-y` på containers |

---

## GO/NO-GO Criteria

**GO:**
- BottomTabs v2 fungerer uten CLS
- Alle nye komponenter har TypeScript strict types
- 679 tests passerer
- Lighthouse mobile ≥ 85

**NO-GO:**
- Layout shift på mobil > 0.1
- Type errors > 0
- Test failures > 0
- Bundle increase > 15 % uten lazy load

---

## MemPalace Checkpoint

**Pre-task:**
- `kg_query(entity="mobile-ui", depth=2)` → 2 facts (pwa, bottom-tabs)
- `recent_context(hours=48)` → Dashboard redesign, i18n mass-extract

**Post-task (etter hver fase):**
- `kg_add(subject: "mobile-ui", predicate: "has_component", object: "BottomTabs-v2")`
- `write_diary(type: FEAT, task: "...", status: GO, rating: 5)`
