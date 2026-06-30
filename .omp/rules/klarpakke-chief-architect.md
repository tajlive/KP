---
description: Chief architect defaults for OMP-only Klarpakke work.
alwaysApply: true
---

# Klarpakke Chief Architect Defaults

- Pick the smallest durable architecture that satisfies the request.
- Prefer retuning/routing existing OMP-native behavior over adding new specialist files.
- Add a new OMP agent only when it creates a distinct operational responsibility with different evidence requirements.
- Keep Main responsible for synthesis, final verification, and user-facing claims.
- Use subagents for bounded parallel work; never offload final judgment or verification claims.
- Avoid broad/project-wide gates from subagents. Main runs final gates across the union of changes.
