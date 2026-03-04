# Klarpakke MCP Server - Architecture

## Overview

A production-ready Model Context Protocol (MCP) server integrating 5 major services:
- **Stripe** - Payment processing
- **Google OAuth** - Authentication
- **Vercel** - Deployment platform
- **Supabase** - Database & backend
- **Resend** - Email delivery

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLAUDE DESKTOP                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User asks: "Get revenue stats"                          │   │
│  └──────────────────────┬───────────────────────────────────┘   │
└─────────────────────────┼───────────────────────────────────────┘
                          │ MCP Protocol
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MCP SERVER (Deno)                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Request    │  │    Tool      │  │   Response   │          │
│  │   Handler    │→ │   Router     │→ │   Handler    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│         │                 │                                    │
│         └─────────────────┼────────────────────────────────┐    │
│                           ▼                                │    │
│  ┌─────────────────────────────────────────────────────┐  │    │
│  │              SECURITY LAYER                          │  │    │
│  │  • Rate Limiting (100 req/min)                      │  │    │
│  │  • Input Validation                                 │  │    │
│  │  • SQL Injection Protection                         │  │    │
│  │  • Audit Logging                                    │  │    │
│  └─────────────────────────────────────────────────────┘  │    │
│                           │                                │    │
└───────────────────────────┼────────────────────────────────┼────┘
                            │                                │
        ┌───────────────────┼───────────────────┐           │
        ▼                   ▼                   ▼           ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   CLIENTS    │  │    TOOLS     │  │   AUDIT      │  │   ERRORS     │
│              │  │              │  │              │  │              │
│ • stripe.ts  │  │• analytics   │  │• mcp_audit_  │  │• Try/Catch   │
│ • google.ts  │  │• users       │  │  logs table  │  │• Rollback    │
│ • vercel.ts  │  │• billing     │  │              │  │• Alerts      │
│ • supabase.ts│  │• deployment  │  │• signup_     │  │              │
│ • resend.ts  │  │• database    │  │  funnel table│  │              │
│              │  │• email       │  │              │  │              │
│              │  │• tokens      │  │              │  │              │
└──────┬───────┘  └─────────────┘  └──────────────┘  └──────────────┘
       │
       │ HTTP/REST
       ▼
┌────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Stripe  │ │  Google  │ │  Vercel  │ │ Supabase │ Resend   │
│  │   API    │ │   OAuth  │ │   API    │ │   API    │  API     │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
klarpakke-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── clients/              # Service integrations
│   │   ├── supabase.ts       # Database, Auth, Realtime, Storage
│   │   ├── stripe.ts         # Payments, Subscriptions
│   │   ├── google.ts         # OAuth, User profiles
│   │   ├── vercel.ts         # Deployments, Domains
│   │   └── resend.ts         # Email, Templates
│   └── tools/                # MCP tool implementations
│       ├── analytics.ts      # Dashboard metrics
│       ├── users.ts          # User management
│       ├── billing.ts        # Stripe operations
│       ├── email.ts          # Campaign management
│       ├── deployment.ts     # Vercel operations
│       ├── database.ts       # SQL queries
│       └── tokens.ts         # KLT token management
├── supabase/
│   └── migrations/
│       └── 20260213000000_mcp_setup.sql
├── deno.json                 # Deno configuration
├── package.json              # NPM metadata
├── README.md                 # Main documentation
├── INTEGRATIONS.md           # Service integration details
├── SETUP_GUIDE.md            # Quick start guide
└── ARCHITECTURE.md           # This file
```

## Data Flow

### 1. Request Flow
```
User Input → Claude → MCP Server → Tool Handler → Client → External API
```

### 2. Response Flow
```
External API → Client → Tool Handler → MCP Server → Claude → User
```

### 3. Audit Flow
```
Tool Handler → Audit Logger → Supabase (mcp_audit_logs table)
```

## Security Architecture

### Layer 1: Authentication
- API keys stored in environment variables
- No keys committed to code
- Service role keys for admin operations

### Layer 2: Authorization
- Row Level Security (RLS) in Supabase
- Admin-only policies for sensitive data
- Token validation for Google OAuth

### Layer 3: Input Validation
- SQL injection protection (keyword filtering)
- Table allowlist for queries
- Type checking via TypeScript
- Zod schemas for runtime validation

### Layer 4: Rate Limiting
- 100 requests per minute per tool
- Configurable per tool
- Tracks in Supabase

### Layer 5: Audit Logging
- Every tool call logged
- Input, output, duration, success/failure
- Queryable for compliance

## Client Architecture

### Supabase Client
```typescript
// Singleton pattern
let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(URL, KEY, options);
  }
  return client;
}
```

Features:
- Connection pooling
- Auth state management
- Realtime subscriptions
- Type-safe queries

### Stripe Client
```typescript
// Direct API calls with fetch
async function stripeFetch<T>(path: string, options?: RequestInit): Promise<T>
```

Features:
- Secret key auth
- Error handling
- Type-safe responses

### Vercel Client
```typescript
// Token-based auth with team support
async function vercelFetch<T>(path: string, options?: RequestOptions): Promise<T>
```

Features:
- Team/project scoping
- Query params support
- Pagination handling

### Google Client
```typescript
// OAuth flow + API calls
export function getAuthUrl(redirectUri: string, state?: string): string
export async function exchangeCode(code: string, redirectUri: string): Promise<Tokens>
```

Features:
- PKCE flow
- Token refresh
- Profile fetching

### Resend Client
```typescript
// API key auth
async function resendFetch<T>(path: string, options?: RequestInit): Promise<T>
```

Features:
- Batch sending
- Template rendering
- Analytics tracking

## Tool Architecture

### Tool Definition
```typescript
{
  name: "tool_name",
  description: "What this tool does",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string", description: "Parameter description" }
    },
    required: ["param"]
  }
}
```

### Tool Handler
```typescript
export async function toolName(args: { param: string }): Promise<ToolOutput> {
  try {
    // Execute logic
    const result = await client.operation(args.param);
    
    // Format output
    return {
      content: [{ type: "text", text: formattedResult }]
    };
  } catch (err) {
    // Handle errors
    return {
      content: [{ type: "text", text: errorMessage }],
      isError: true
    };
  }
}
```

## Database Schema

### mcp_audit_logs
```sql
CREATE TABLE public.mcp_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  input JSONB DEFAULT '{}',
  output JSONB DEFAULT '{}',
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error TEXT,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### signup_funnel
```sql
CREATE TABLE public.signup_funnel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  step_number INTEGER,
  metadata JSONB DEFAULT '{}',
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Error Handling

### Levels
1. **Client Level** - API errors, network failures
2. **Tool Level** - Validation errors, business logic
3. **Server Level** - Rate limiting, authentication

### Strategy
- Try/catch at all levels
- Meaningful error messages
- Error tracking in audit logs
- No sensitive data in errors

## Performance

### Optimizations
- Connection pooling (Supabase)
- Singleton clients
- Batch operations
- Lazy loading

### Caching
- Client instances cached
- No external caching (keep it simple)

## Testing

### Manual Testing
```bash
# Run server
deno run --allow-all src/index.ts

# Test with curl
curl -X POST http://localhost:3000/tools \
  -H "Content-Type: application/json" \
  -d '{"name": "get_dashboard_metrics", "args": {}}'
```

### Integration Testing
- Test each client independently
- Test full tool workflows
- Verify audit logging
- Check rate limiting

## Deployment

### Local Development
```bash
deno task dev
```

### Production
```bash
# As MCP server (stdio)
deno run --allow-all src/index.ts

# As HTTP server (future)
deno run --allow-all src/http.ts
```

### Claude Desktop
```json
{
  "mcpServers": {
    "klarpakke": {
      "command": "deno",
      "args": ["run", "--allow-all", "/path/to/server/src/index.ts"],
      "env": { /* ... */ }
    }
  }
}
```

## Future Enhancements

### Short Term
- [ ] Webhook handlers
- [ ] Slack notifications
- [ ] More templates
- [ ] Bulk operations

### Long Term
- [ ] HTTP mode
- [ ] GraphQL support
- [ ] AI-powered insights
- [ ] Automated workflows

## Support

- Documentation: See README.md
- Issues: GitHub Issues
- Email: post@klarpakke.no
