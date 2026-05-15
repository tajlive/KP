# 🐝 SWARM BRIEF — BUGFIX WORKFLOW

Generated: 2026-05-15T00:38:28.362Z
Task: fix auth login bug
Workflow: analyzer → tester → security → knowledge

## 🔀 Git Context
- Branch: main
- Commit: 221d18b13 fix: paper trade currency USDT→NOK + winRate + format fixes
- Modified: 32 files
- .cursor/mcp.json
- .kimi/AGENTS.md
- .kimi/agents/KIMI-MASTER-SYSTEM.md
- .kimi/agents/auto-optimizer-agent.md
- .kimi/agents/auto-optimizer-agent.yaml
- .kimi/agents/klarpakke-sanity-agent.md
- .kimi/agents/mobile-check-agent.md
- .kimi/agents/mobile-check-agent.yaml
- .kimi/agents/performance-agent.md
- .kimi/agents/performance-agent.yaml
- ... and 22 more

## 🎯 Agent Sequence

### Step 1: Code Analyzer
**Role:** AST analysis, complexity detection  
**Trigger:** pre-task  
**Action:** Analyze the codebase changes. Identify complexity, risks, and files that need attention. Output a concise analysis bullet list.

### Step 2: Test Strategist
**Role:** Test coverage, edge cases  
**Trigger:** post-implementation  
**Action:** Identify test gaps. Suggest unit tests, edge cases, and e2e scenarios. Do NOT write tests yet — just plan.

### Step 3: Security Auditor
**Role:** RLS, secrets, auth  
**Trigger:** on-security-path  
**Action:** Audit for security issues: RLS, auth, secrets, input validation. Flag any concerns.

### Step 4: Knowledge Keeper
**Role:** MemPalace sync, decision logging, KG maintenance  
**Trigger:** post-task  
**Action:** Summarize findings. Save key facts to KG with kg_batch. Write diary entry with write_diary.

## ✅ Final Checklist
After all steps:
1. Run: `npm run lint:gate && npm run type-check`
2. Run: `npm run test:unit`
3. If >3 files changed: `node scripts/verify/verify-claims.mjs`
4. Save learnings: `kg_batch` + `write_diary`

## 💡 How to Use This Brief
This is a multi-agent workflow. You can either:
- **Option A:** Execute all steps yourself (recommended for speed)
- **Option B:** Run each step as a separate KIMI session with the relevant agent YAML

**Agent files:**
- analyzer: .kimi/agents/.kimi/swarm/analyzer.yaml
- tester: .kimi/agents/.kimi/swarm/tester.yaml
- security: .kimi/agents/.kimi/swarm/security.yaml
- knowledge: .kimi/agents/.kimi/swarm/knowledge.yaml
