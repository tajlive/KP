# Klarpakke MCP Server

> Model Context Protocol (MCP) server for Klarpakke Universitet  
> **Versjon:** 1.1.0  
> **Totalt tools:** 164+

## 🚀 Hurtigstart

```bash
# Bygg serveren
npm install
npm run build

# Kjør server
bash mcp-wrapper.sh
```

## 📦 Tilgjengelige Tools

### Moduler

| Modul | Antall | Prefix |
|-------|--------|--------|
| auth-tools | 12 | `auth_` |
| build-tools ⭐ | 12 | `build_` |
| cloud-run-tools | 13 | `cloudrun_`, `gcloud_` |
| cloudflare-tools | 13 | `cf_` |
| cloudflare-dns-tools ⭐ | 12 | `cf_dns_` |
| cloudrun-domain-tools ⭐ | 6 | `cloudrun_*domain*` |
| github-tools | 12 | `github_` |
| linkedin-tools | 12 | `linkedin_` |
| monitor-tools ⭐ | 6 | `monitor_` |
| sales-navigator-tools | 23 | `sn_` |
| stripe-tools | 14 | `stripe_` |
| supabase-tools ⭐ | 8 | `supabase_` |
| vercel-tools 🚀 | 6 | `vercel_` |
| **Generiske** | 5 | `git_`, `read_file`, `list_files` |
| **TOTALT** | **170+** | |

⭐ = Nye moduler i v1.1.0
🚀 = Nye moduler i v1.2.0

## 🔧 Konfigurasjon

### Claude Desktop

Konfigurasjonen finnes i:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

Innhold:
```json
{
  "mcpServers": {
    "klarpakke": {
      "command": "bash",
      "args": ["/Users/taj/klarpakke/mcp-server/mcp-wrapper.sh"]
    }
  }
}
```

### Miljøvariabler

```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Cloudflare
CLOUDFLARE_API_TOKEN=...

# GitHub
GITHUB_TOKEN=ghp_...

# GCP
GOOGLE_CLOUD_PROJECT=klarpakke
GOOGLE_CLOUD_REGION=us-central1
CLOUD_RUN_SERVICE=klarpakke

# Vercel (for vercel_ tools)
VERCEL_TOKEN=...
```

## 🚀 Vercel Deploy (Nytt i v1.2.0)

### Full CI/CD Pipeline med ett kall

```json
{
  "tool": "vercel_deploy_with_migrations",
  "arguments": {
    "environment": "production",
    "skip_migrations": false
  }
}
```

Dette kjører automatisk:
1. ✅ Lint check
2. ✅ TypeScript type check  
3. ✅ Build
4. ✅ Database migrations
5. ✅ Vercel deploy
6. ✅ Post-deploy verification

### Andre Vercel-verktøy

| Tool | Beskrivelse |
|------|-------------|
| `vercel_deploy` | Deploy til Vercel (prod/preview) |
| `vercel_list_deployments` | List siste deploys |
| `vercel_promote` | Promoter preview til prod |
| `vercel_status` | Sjekk Vercel prosjekt status |
| `vercel_verify_deployment` | Verifiser at deploy fungerer |

### Eksempel: Sjekk migreringer før deploy

```json
{
  "tool": "supabase_check_migrations"
}
```

```json
{
  "tool": "vercel_deploy_with_migrations",
  "arguments": {
    "environment": "production"
  }
}
```

## 🛠️ Utvikling

### Legge til ny tool

1. Opprett fil i `src/my-tools.ts`
2. Export `myTools` array med Tool-definisjoner
3. Export `executeMyTool` handler function
4. Registrer i `index.ts`
5. Kjør `npm run build`

### Eksempel

```typescript
// src/my-tools.ts
export const myTools = [
  {
    name: "my_tool",
    description: "My tool description",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

export async function executeMyTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  // Implementasjon
  return "Result";
}
```

## 📚 Dokumentasjon

Se [MCP-MASTER-GUIDE.md](../MCP-MASTER-GUIDE.md) for full dokumentasjon.

## 📝 Versjonshistorie

### v1.2.0 (24. februar 2026)
- ✅ Vercel deploy tools (+6 tools)
- ✅ Full CI/CD pipeline automation
- ✅ Database migration + deploy i ett steg
- ✅ Post-deploy verification
- **Totalt: 170+ tools**

### v1.1.0 (18. februar 2026)
- ✅ 5 nye moduler (+35 tools)
- ✅ Supabase database tools
- ✅ Cloudflare DNS tools
- ✅ Cloud Run domain mapping
- ✅ Build/CI tools
- ✅ Monitoring tools
- ✅ Claude Desktop konfigurasjon
- **Totalt: 164+ tools**

### v1.0.0 (Opprinnelig)
- 7 moduler (99 tools)
- Stripe, LinkedIn, Sales Navigator
- Auth, GitHub, Cloudflare, Cloud Run

## 📄 Lisens

MIT - Se [LICENSE](../LICENSE)
