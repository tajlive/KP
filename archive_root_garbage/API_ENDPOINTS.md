# 🔌 Klarpakke API - Complete Endpoint Reference

**Base URL:** `http://localhost:3456`  
**Authentication:** `Authorization: Bearer klarpakke-dev-token`

---

## 📖 Quick Reference

### All endpoints used by www.klarpakke.no:

| Kategori | Endpoints |
|----------|-----------|
| **Health** | `GET /health` |
| **Git** | `GET /git/status`, `GET /git/log`, `POST /git/commit`, `POST /git/push`, `POST /git/pull` |
| **Files** | `GET /file/read`, `POST /file/write`, `GET /file/list` |
| **Build** | `GET /build`, `GET /dev/start`, `GET /lint`, `GET /typecheck` |
| **Supabase** | `GET /supabase/migration/list`, `POST /supabase/migration/create`, `POST /supabase/migration/push`, `POST /supabase/function/deploy` |
| **Stripe** | `GET /stripe/products`, `GET /stripe/prices` |
| **Search** | `GET /search/code?q=...&pattern=...` |
| **NPM** | `GET /npm/outdated`, `POST /npm/install` |
| **Vercel** | `GET /vercel/status`, `POST /vercel/deploy` |
| **Project** | `GET /project/info`, `GET /env/check` |

---

## 🔧 Detailed Endpoints

### Health Check
```bash
GET /health

Response:
{
  "status": "ok",
  "project": "klarpakke",
  "version": "1.0.0",
  "timestamp": "2026-02-13T..."
}
```

### Git Operations

#### Get Git Status
```bash
GET /git/status

Response:
{
  "status": "clean" | "M file.txt\n?? new.ts",
  "branch": "main",
  "hasChanges": true,
  "files": [
    { "status": "M ", "file": "src/app/page.tsx" },
    { "status": "??", "file": "new-file.ts" }
  ]
}
```

#### Get Git Log
```bash
GET /git/log?limit=10

Response:
{
  "commits": [
    { "hash": "abc123", "message": "feat: new feature" },
    ...
  ]
}
```

#### Commit Changes
```bash
POST /git/commit
Content-Type: application/json

Body:
{
  "message": "fix: auth callback bug",
  "files": ["src/auth.ts"]  // optional, defaults to all
}

Response:
{
  "success": true,
  "output": "[main abc123] fix: auth callback bug..."
}
```

#### Push to GitHub
```bash
POST /git/push

Response:
{
  "success": true,
  "output": "Enumerating objects..."
}
```

#### Pull from GitHub
```bash
POST /git/pull

Response:
{
  "success": true,
  "output": "Already up to date."
}
```

### File Operations

#### Read File
```bash
GET /file/read?path=src/app/page.tsx

Response:
{
  "path": "src/app/page.tsx",
  "content": "...file content...",
  "size": 1234
}
```

#### Write File
```bash
POST /file/write
Content-Type: application/json

Body:
{
  "path": "src/app/new.tsx",
  "content": "export default function..."
}

Response:
{
  "success": true,
  "path": "src/app/new.tsx"
}
```

#### List Directory
```bash
GET /file/list?path=src/app

Response:
{
  "path": "src/app",
  "items": [
    { "name": "page.tsx", "type": "file" },
    { "name": "layout.tsx", "type": "file" },
    { "name": "api", "type": "directory" }
  ]
}
```

### Build & Development

#### Build Project
```bash
GET /build

Response:
{
  "success": true,
  "output": "✓ Compiled successfully..."
}
```

#### Start Dev Server
```bash
GET /dev/start

Response:
{
  "success": true,
  "message": "Dev server started on http://localhost:3000"
}
```

#### Run Linter
```bash
GET /lint

Response:
{
  "success": true,
  "output": "✓ No ESLint warnings"
}
```

#### TypeScript Check
```bash
GET /typecheck

Response:
{
  "success": true,
  "output": "No errors"
}
```

### Supabase Operations

#### List Migrations
```bash
GET /supabase/migration/list

Response:
{
  "output": "Local | Remote | Time..."
}
```

#### Create Migration
```bash
POST /supabase/migration/create
Content-Type: application/json

Body:
{
  "name": "add_user_preferences"
}

Response:
{
  "success": true,
  "output": "Created migration..."
}
```

#### Push Migrations
```bash
POST /supabase/migration/push

Response:
{
  "success": true,
  "output": "Applied migration..."
}
```

#### Deploy Edge Function
```bash
POST /supabase/function/deploy
Content-Type: application/json

Body:
{
  "name": "stripe-webhook"
}

Response:
{
  "success": true,
  "output": "Deployed..."
}
```

### Stripe Operations

#### List Products
```bash
GET /stripe/products

Response:
{
  "success": true,
  "output": "{
    \"object\": \"list\",
    \"data\": [...]
  }"
}
```

#### List Prices
```bash
GET /stripe/prices

Response:
{
  "success": true,
  "output": "..."
}
```

### Search

#### Search Code
```bash
GET /search/code?pattern=auth/callback
GET /search/code?q=dashboard

Response:
{
  "results": [
    "src/app/auth/callback/route.ts:10:  const code = ...",
    "src/components/auth/Login.tsx:5:import ..."
  ]
}
```

### NPM Operations

#### Check Outdated Packages
```bash
GET /npm/outdated

Response:
{
  "output": "Package    Current  Wanted..."
}
```

#### Install Package
```bash
POST /npm/install
Content-Type: application/json

Body:
{
  "package": "@stripe/stripe-js"
}

Response:
{
  "success": true,
  "output": "added 1 package..."
}
```

### Vercel Operations

#### Check Vercel CLI
```bash
GET /vercel/status

Response:
{
  "installed": true,
  "version": "Vercel CLI 37.x"
}
```

#### Deploy to Vercel
```bash
POST /vercel/deploy

Response:
{
  "success": true,
  "output": "🔍 Inspect: https://vercel.com/..."
}
```

### Project Info

#### Get Project Info
```bash
GET /project/info

Response:
{
  "name": "klarpakke-universitet",
  "version": "1.0.0",
  "dependencies": 69,
  "devDependencies": 24
}
```

#### Check Environment Variables
```bash
GET /env/check

Response:
{
  "status": {
    "NEXT_PUBLIC_SUPABASE_URL": "✅ Set",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "✅ Set",
    "STRIPE_SECRET_KEY": "✅ Set",
    "STRIPE_WEBHOOK_SECRET": "✅ Set"
  },
  "allSet": true
}
```

---

## 🚀 Usage Examples by Platform

### Claude Desktop (MCP)
```
"Sjekk git status og commit endringene med melding 'fix: auth bug'"
```

### Perplexity Pro (HTTP API)
```
Bruk Klarpakke API på http://localhost:3456 med token klarpakke-dev-token.

Sjekk git status, les filen src/app/page.tsx, og gi meg en oppsummering.
```

### Kimi Code 2.5 (cURL)
```bash
# Git status
curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  http://localhost:3456/git/status

# Read file
curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  "http://localhost:3456/file/read?path=src/app/page.tsx"

# Commit
curl -s -X POST -H "Authorization: Bearer klarpakke-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"message": "fix: auth callback"}' \
  http://localhost:3456/git/commit

# Build
curl -s -H "Authorization: Bearer klarpakke-dev-token" \
  http://localhost:3456/build
```

---

## 🔒 Security

- All endpoints require `Authorization: Bearer klarpakke-dev-token`
- File operations are sandboxed to `/Users/taj/klarpakke`
- Environment variables are loaded from `.env.local`
- No secrets are exposed in API responses

---

## 📝 Notes

- API server runs locally on your Mac
- Each request is logged with timestamp
- Long-running operations (build, deploy) have 5-minute timeout
- All endpoints return JSON
