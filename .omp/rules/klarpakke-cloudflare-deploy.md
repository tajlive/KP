---
description: Cloudflare Workers/OpenNext/Wrangler production workflow for Klarpakke.
globs:
  - wrangler.jsonc
  - package.json
  - .github/workflows/deploy.yml  # only if it exists; Cloudflare Workers Builds may use dashboard integration
  - src/app/api/health/**/*
  - open-next.config.*
  - next.config.*
alwaysApply: false
---

# Klarpakke Cloudflare Deploy Rule

For deploy or production work, assume:

- GitHub is source of truth.
- Cloudflare Workers Builds / Wrangler is production deploy.
- Runtime is Cloudflare Workers via OpenNext.
- Vercel references are stale unless explicitly marked legacy.
- Verify with `/api/health`, relevant route smoke, and Cloudflare/Wrangler deployment status.

Prefer `klarpakke-cloudflare-workers-ops` for focused investigation.
