# Claude Desktop MCP Setup

> Få Claude til å huske og bruke Klarpakke MCP Server

## 🔧 Oppsett

### 1. Finn config-filen

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

### 2. Legg til MCP server

Åpne filen og legg til:

```json
{
  "mcpServers": {
    "klarpakke": {
      "command": "deno",
      "args": [
        "run",
        "--allow-all",
        "/Users/taj/klarpakke/klarpakke-mcp-server/src/index.ts"
      ],
      "env": {
        "SUPABASE_URL": "https://vuxbjlykgmzskxbclquf.supabase.co",
        "SUPABASE_KEY": "SCRUBBED_SERVICE_ROLE_KEY",
        "SUPABASE_PROJECT_REF": "vuxbjlykgmzskxbclquf",
        "SUPABASE_ACCESS_TOKEN": "sbp_din_access_token_her"
      }
    }
  }
}
```

### 3. Hent Supabase Access Token

1. Gå til https://app.supabase.com/account/tokens
2. Klikk "Generate new token"
3. Kopier token og lim inn i config

### 4. Restart Claude Desktop

Lukk og åpne Claude på nytt.

---

## 🚀 Nye MCP-verktøy

Nå kan du si til Claude:

### System Status
```
"Test system status" 
→ Kjører test_system_status
```

### Edge Functions
```
"List all edge functions"
→ Kjører list_edge_functions

"Test api-gateway function"
→ Kjører test_edge_function med function_name="api-gateway"

"Get logs for taj-trade-engine"
→ Kjører get_function_logs
```

### Secrets
```
"List all secrets"
→ Kjører list_secrets
```

### Deploy
```
"Deploy api-gateway function"
→ Kjører deploy_edge_function
```

---

## 📝 Eksempel-dialog

**Du:** "Test om API Gateway fungerer"

**Claude:** *Kjører test_edge_function med function_name="api-gateway"*

**Resultat:**
```
✅ Test Result

Function: api-gateway
URL: https://vuxbjlykgmzskxbclquf.functions.supabase.co/api-gateway/health
Status: 200

Response:
{"status":"ok","service":"api-gateway","version":"2.0"}
```

---

## 🔧 Feilsøking

### "Deno not found"
```bash
brew install deno  # macOS
```

### "Command not found"
Sjekk at path til index.ts er korrekt:
```bash
ls /Users/taj/klarpakke/klarpakke-mcp-server/src/index.ts
```

### "Access token invalid"
Hent ny token fra https://app.supabase.com/account/tokens

---

## ✅ Verifiser at det fungerer

I Claude, se etter 🔧 ikonet (Tools). Klikk på det for å se tilgjengelige verktøy.

Du skal se:
- list_edge_functions
- test_edge_function
- test_system_status
- list_secrets
- deploy_edge_function
- get_function_logs

---

Nå husker Claude Klarpakke hver gang du starter! 🎉
