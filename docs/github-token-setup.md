# GitHub Personal Access Token (PAT) — Oppsett

> Nødvendig for: GitHub MCP i Cursor, `test:mcp`-skriptet, og arkitekt-oversikt

## Steg-for-steg (2 min)

### 1. Åpne GitHub token-side

Gå til: **https://github.com/settings/tokens**  
(Logg inn som `tajlive`)

### 2. Klikk "Generate new token (classic)"

### 3. Fyll inn

| Felt | Verdi |
|------|-------|
| Note | `Klarpakke MCP + Lokal utvikling` |
| Expiration | `90 days` (sett påminnelse) |

### 4. Velg scopes

Krysser av **disse og kun disse:**

```
✅ repo          (full tilgang til private repos)
✅ read:org      (lesetilgang til org-info)
✅ read:user     (lesetilgang til brukerinfo)
```

### 5. Klikk "Generate token" — kopier umiddelbart

Tokenet vises **kun én gang**.

### 6. Legg til i `.env.local`

```bash
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
```

### 7. Verifiser

```bash
curl -H "Authorization: token ghp_DITT_TOKEN" \
  https://api.github.com/repos/tajlive/KP | jq .name
# Forventet output: "KP"
```

---

## Sentry API-token (bonus — for full MCP)

KLI auth-token fungerer for deploy/bygg, men for MCP trenger du et API-token:

1. Gå til: **https://sentry.io/settings/account/api/auth-tokens/**
2. Klikk **"Create New Token"**
3. Velg scopes: `project:read`, `org:read`, `event:read`
4. Legg til i `.env.local`:

```bash
SENTRY_AUTH_TOKEN=sntrys_xxxx  # API-token (ikke CLI-token)
```

---

## Token-oversikt for Klarpakke

| Token | Type | Roteres | Lagres i |
|-------|------|---------|----------|
| `GITHUB_TOKEN` | PAT Classic | 90 dager | `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service key | Aldri (med mindre eksponert) | `.env.local` |
| `STRIPE_SECRET_KEY` | Live secret | Ved eksponering | `.env.local` |
| `SENTRY_AUTH_TOKEN` | API token | 1 år | `.env.local` |
| `RESEND_API_KEY` | API key | Ved behov | `.env.local` |
| `LINEAR_API_KEY` | Personal API key | Aldri (med mindre eksponert) | `.env.local` |
| `VERCEL_TOKEN` | Access token | 1 år | `.env.local` |

> ⚠️ **Aldri** legg tokens i `.cursor/mcp.json` eller andre filer som committes til Git.
