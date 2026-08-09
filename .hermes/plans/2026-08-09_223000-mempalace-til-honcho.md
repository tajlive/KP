# Minnesystem-migrering: MemPalace → Honcho

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Migrate Klarpakke's memory system from MemPalace to Honcho — audited, reversible, with data-safety gates before any deletion.

**Architecture:** Phase 0 (audit, read-only, K3) → Phase 1 (install Honcho alongside MemPalace, K2.7 Code) → Phase 2 (verify Honcho in a real work session, K2.7 Code) → Phase 3 (archive MemPalace, K3, ONLY after Tom's explicit approval). Honcho runs in parallel before MemPalace is touched. Credentials in `.env.local`, never git-tracked.

**Tech Stack:** Hermes CLI (`hermes memory setup`), Honcho (dialectic memory), MemPalace (current: knowledge graph + diary log, 219 entries), MCP servers (`.claude/mcp.json`), Kimi K3 (architecture phases) / K2.7 Code (routine phases).

---

## Model assignment (from Tom's directive)

| Phase | Model | Reason |
|-------|-------|--------|
| Phase 0 (audit) | **Kimi K3** (`custom:kimi-k3-global`, reasoning_effort max, 1M ctx, temp 1) | Architecture decision, full-context audit |
| Phase 1 (install) | **Kimi K2.7 Code** (`kimi-coding`) | Routine install/config |
| Phase 2 (verify) | **Kimi K2.7 Code** | Routine test/verification |
| Phase 3 (cleanup) | **Kimi K3** | Architecture cleanup decision |

- **No DeepSeek V4 Flash anywhere** — this is an architecture decision for the project's memory system, not a `delegate_task`-sized routine.
- **New session for K3, never mid-session** — Phase 0 and Phase 3 each start in a fresh K3 session.

---

## Phase 0 — Audit (K3, read-only, no changes)

### Task 0.1: Report `hermes memory setup` storage options

**Objective:** Document what the interactive selector shows (local/self-hosted/cloud) before choosing.

**Step 1: Run (read-only, abort before selecting)**

```bash
hermes memory setup
# Abort at the selector (Ctrl-C) — capture the option list only
```

**Step 2: Record** the exact storage options shown, in the phase-0 report.

**Files:** none (read-only).

---

### Task 0.2: Inventory all MemPalace dependencies

**Objective:** Complete list of what must be migrated or archived.

**Step 1: Find scripts and config**

```bash
ls scripts/mempalace-*.mjs 2>/dev/null
cat .mempalace/config.json 2>/dev/null
grep -n "mempalace" .claude/mcp.json
```

**Step 2: Find all references**

```bash
grep -rln "mempalace\|MemPalace" --include="*.json" --include="*.md" --include="*.mjs" . | grep -v node_modules
```

**Expected output:** list of `scripts/mempalace-*.mjs` files, `.mempalace/config.json` contents (redact secrets), MemPalace block in `.claude/mcp.json`, and any AGENTS.md / `.hermes.md` mentions.

**Files:** none (read-only).

---

### Task 0.3: Verify MemPalace Knowledge Graph is empty (0 entities)

**Objective:** Confirm no data loss risk before removal.

**Step 1: Query the knowledge graph** (method depends on MemPalace's API — check `scripts/mempalace-*.mjs` for the query command; typically a `search`/`list entities` call via the MCP server or a local script).

```bash
# Example — adjust to the actual query mechanism found in Task 0.2:
node scripts/mempalace-query.mjs "list all entities" 2>/dev/null || echo "no query script"
```

**Step 2: Record entity count.** Expected: **0 entities** (per Tom's brief). If non-zero: STOP — report before proceeding.

**Files:** none (read-only).

---

### Task 0.4: Assess diary-log migration (219 entries)

**Objective:** Decide: migrate to Honcho, or archive separately.

**Step 1: Locate the diary log** (path from Task 0.2 — likely `.mempalace/diary*` or similar).

**Step 2: Check Honcho import capability** — Honcho ingests via conversation observation (`honcho_conclude`, session messages). It has **no bulk-import API** for foreign diary formats. Verify: does the diary have a structured export (JSON/MD)?

**Step 3: Recommendation (document in plan report):**
- If entries are key facts → manually re-store the ~10-20 highest-value ones as Honcho conclusions (`honcho_conclude`).
- The full 219-entry log → **archive** to `docs/archive/mempalace-diary-YYYYMMDD.md` (read-only reference, not deleted).

**Files:** none (read-only).

---

### Task 0.5: Log this migration plan into MemPalace diary

**Objective:** Preserve the decision + context in the active system (Honcho not yet active) so it survives a mid-migration failure.

**Step 1: Append a diary entry** (method from Task 0.2 — the MemPalace diary-write mechanism) with: timestamp, this plan's path, the 4 phases, and the stop-rules.

**Files:** MemPalace diary (the only write in Phase 0 — to the OLD system, intentionally).

---

### Task 0.6: Write risk assessment

**Objective:** Answer: what happens to the 219 diary entries if migration aborts halfway?

**Content (to be finalized with Task 0.4 findings):**
- **Diary entries:** untouched until Phase 3. MemPalace stays fully functional through Phases 1–2 (Honcho runs in parallel). If aborted: nothing lost — MemPalace still active, diary intact, Honcho config simply unused.
- **Knowledge graph:** 0 entities (verified Task 0.3) → nothing to lose there regardless.
- **Worst case at any abort point:** revert `.claude/mcp.json` (git), remove Honcho block, delete `scripts/run-honcho-mcp.mjs`. Full restore in <5 min.

**Files:** append to the phase-0 report.

---

## Phase 1 — Installation (K2.7 Code)

### Task 1.1: Run `hermes memory setup`, select Honcho

```bash
hermes memory setup
# Select: Honcho as provider
```

**Verify:** `hermes memory status` (or equivalent) shows Honcho active.

---

### Task 1.2: Configure profile isolation

**Objective:** Klarpakke context must not mix with other projects Hermes runs against.

**Step 1:** Set Honcho workspace/peer scoping to this project's profile (Hermes profile `default` or a Klarpakke-dedicated one — follow `hermes memory setup` options; peers: `user` (Tom) and `ai` (Hermes), workspace = this repo's profile).

**Verify:** Honcho workspace name/id recorded; other projects' sessions not visible in this workspace.

---

### Task 1.3: Store credentials in `.env.local` (never git-tracked)

**Step 1:** Append Honcho config (API key/host from setup) to `.env.local`:

```bash
# .env.local (NOT committed)
HONCHO_API_KEY=<from setup>
HONCHO_HOST=<from setup, if self-hosted option chosen>
```

**Verify:** `git check-ignore .env.local` → ignored. `git status` → `.env.local` not listed.

---

### Task 1.4: Update `.claude/mcp.json` — swap MemPalace → Honcho

**Objective:** Follow the same wrapper pattern as `run-supabase-mcp.mjs`.

**Step 1: Create wrapper** `scripts/run-honcho-mcp.mjs`:

```javascript
#!/usr/bin/env node
// Honcho MCP server wrapper — loads .env.local, then spawns the Honcho MCP server.
// Same pattern as scripts/run-supabase-mcp.mjs.
import { config } from "dotenv";
config({ path: ".env.local" });
// spawn the honcho MCP server with HONCHO_API_KEY/HONCHO_HOST in env
```

(Exact spawn command determined by the Honcho MCP package name from `hermes memory setup` output in Task 1.1.)

**Step 2: Edit `.claude/mcp.json`:**
- Remove (or `"disabled": true`) the `"mempalace"` server block.
- Add `"honcho"` server: `node scripts/run-honcho-mcp.mjs` with env passthrough.

**Verify:** `cat .claude/mcp.json | python3 -m json.tool` valid; `mempalace` gone/disabled, `honcho` present.

---

### Task 1.5: Confirm model config untouched

**Step 1:** `git diff .hermes.md` → must show **no** changes to the model section (Kimi K3/K2.7/DeepSeek). Memory-system migration and model config are separate layers — never the same commit (stop-rule).

**Verify:** model section byte-identical.

---

## Phase 2 — Verification (K2.7 Code)

### Task 2.1: Dialectic smoke test

**Step 1:** Store 2-3 facts via `honcho_conclude` (e.g. "Klarpakke bruker eea.okx.com for EU", "Live-tall: kapital kun fra aktive sesjoner").
**Step 2:** Ask `honcho_reasoning` a Klarpakke-architecture question; verify the answer synthesizes the stored facts.
**Expected:** coherent, correct answer citing the stored facts.

---

### Task 2.2: Profile card + persistent conclusions

**Step 1:** `honcho_profile` → card reads back stored facts.
**Step 2:** `honcho_conclude` a new fact → `honcho_profile` again → fact present.
**Step 3:** `honcho_search` for a raw excerpt → returns the actual stored text.

---

### Task 2.3: Toolchain integrity

```bash
npx tsc --noEmit          # Expected: 0 errors
npm run test              # Expected: same baseline as before migration (244/245, 2121/2127)
# + any MCP-specific tests (grep package.json for mcp test scripts)
```

**Expected:** identical to pre-migration baseline. Any new failure → investigate before Phase 3.

---

### Task 2.4: Full work session with Honcho active (stop-rule gate)

**Objective:** Honcho must prove itself in real use BEFORE any MemPalace cleanup.

**Step 1:** Run ≥1 complete work session (a real task, e.g. a Trello card) with Honcho as the active memory — verify context carries across turns, conclusions persist, no errors.
**Step 2:** Report to Tom: what worked, what didn't. **Wait for explicit approval before Phase 3.**

---

## Phase 3 — Cleanup (K3 — ONLY after Tom's explicit approval)

### Task 3.1: Archive (not delete) MemPalace

```bash
mkdir -p docs/archive
git mv .mempalace docs/archive/mempalace-2026-08-09   # or mv + commit
git mv scripts/mempalace-*.mjs docs/archive/mempalace-scripts/  # adjust names
```

Also archive the diary export from Task 0.4 to `docs/archive/mempalace-diary-2026-08-09.md`.

**Never `rm -rf`** — archive only (stop-rule).

---

### Task 3.2: Update `.hermes.md` — Honcho as active memory system

**Edit ONLY the memory-system section.** Do NOT touch the model-config section (Kimi K3/K2.7/DeepSeek) in the same commit (stop-rule). Separate commit if model refs also need updating.

---

### Task 3.3: Update AGENTS.md if MemPalace mentioned

**Step 1:** `grep -n -i mempalace AGENTS.md` → update/remove references, point to Honcho.

---

### Task 3.4: Final commits (separate, reversible)

```bash
git commit -m "chore(memory): arkiver MemPalace til docs/archive (erstattet av Honcho)"
git commit -m "docs: Honcho som aktivt minnesystem i .hermes.md + AGENTS.md"
# Model config: separate commit IF needed at all
```

---

## Stop rules (binding)

1. **No permanent MemPalace deletion** before Honcho is confirmed working in ≥1 full work session (Task 2.4).
2. **No credentials in git** — `.env.local` only.
3. **Memory migration and model config never in the same commit** — two separate architecture decisions.
4. **Report + get approval before Phase 3.**

## Risks & open questions

- **Diary bulk-import:** Honcho has no foreign-format import — the 219 entries will most likely be archived + top facts re-stored manually (Task 0.4 confirms).
- **MCP server package:** exact Honcho MCP package/wrapper command depends on `hermes memory setup` output (Task 1.1) — Task 1.4 finalizes it.
- **Rollback:** at every phase, rollback = `git revert` + re-enable mempalace block in `.claude/mcp.json`. <5 min, zero data loss (MemPalace untouched until Phase 3, and then only archived).

## Validation checklist (per phase report)

- [ ] Phase 0: storage options listed, MemPalace inventory complete, KG = 0 entities, diary migration path decided, diary entry logged, risk assessment written
- [ ] Phase 1: Honcho active, profile isolation configured, creds in `.env.local` (git-ignored), `.claude/mcp.json` swapped, model config untouched
- [ ] Phase 2: dialectic Q&A works, profile card + conclusions persist, `tsc` 0 + full test baseline green, ≥1 full work session done
- [ ] Phase 3: (only after approval) MemPalace archived not deleted, docs updated, separate commits
