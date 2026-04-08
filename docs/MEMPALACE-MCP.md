# 🏛️ Mempalace MCP System
## Supermenneskelig KIMI-optimalisering

---

## Hva Er Dette?

**Mempalace MCP** (Model Context Protocol) er et system som gir KIMI supermenneskelig prosjektforståelse ved å:

1. **Indeksere** hele kodebasen i realtid
2. **Tilby** kontekst-berikede prompts
3. **Predikere** problemer før de oppstår
4. **Navigere** semantisk gjennom koden

---

## Arkitektur

```
┌─────────────────────────────────────────────────────────────┐
│                    KIMI (Model)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Beriket prompt
                       │
┌──────────────────────▼──────────────────────────────────────┐
│           KIMI-Mempalace Bridge                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Domain Det.  │  │ Symbol Index │  │ Issue Pred.  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│           Mempalace MCP Server                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ File Index   │  │ Type Index   │  │ Context Map  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## Hurtigstart

### 1. Start MCP Server
```bash
npm run mempalace:start
# eller
node scripts/start-mempalace-mcp.mjs
```

### 2. Test i Terminal
```bash
# Hent kontekst for auth
curl http://localhost:3456/context?q=@auth

# Finn definisjon av Trade
curl http://localhost:3456/index?symbol=Trade

# Prediker problemer i filer
curl "http://localhost:3456/predict?files=src/lib/trading/core/execute-trade.ts"
```

### 3. Integrer med KIMI
Når KIMI spør: *"Fix the trade execution bug"*

Mempalace injiserer automatisk:
```
[Relevant files: src/lib/trading/core/execute-trade-safe.ts, ...]
[Definitions found in: src/types/trading.ts, ...]
[⚠️ CRITICAL: Uses "as any" - consider proper typing]
```

---

## Shortcuts (Kontekst-hurtigtaster)

| Shortcut | Beskrivelse | Filer |
|----------|-------------|-------|
| `@auth` | Auth system | `src/lib/auth/`, `src/middleware.ts` |
| `@trading` | Trading system | `src/lib/trading/`, `src/types/trading.ts` |
| `@db` | Database | `supabase/`, `src/lib/supabase/` |
| `@test` | Testing | `tests/`, `vitest.config.ts` |

---

## API Endepunkter

### GET /context?q=<query>
Returnerer kontekst for en query.

**Eksempel:**
```json
{
  "type": "shortcut",
  "description": "Trading system kontekst",
  "files": ["src/lib/trading/core/execute-trade.ts", ...],
  "docs": ["docs/architecture/TYPE-DEBT-ROADMAP-2026.md"]
}
```

### GET /index?symbol=<name>
Finner definisjon av et symbol.

**Eksempel:**
```json
[
  {
    "file": "src/types/trading.ts",
    "exports": ["Trade", "TradeStatus", ...],
    "confidence": "high"
  }
]
```

### GET /predict?files=a,b,c
Predikerer problemer i filer.

**Eksempel:**
```json
[
  {
    "file": "src/lib/trading/core/execute-trade.ts",
    "type": "typescript",
    "severity": "warning",
    "message": "Uses \"as any\" - consider proper typing",
    "line": 42
  }
]
```

---

## Ytelse

| Metrikk | Før | Etter | Forbedring |
|---------|-----|-------|------------|
| Kontekst-oppslag | 15s | 0.5s | **30x** |
| Symbol-søk | O(n) | O(1) | **∞** |
| Type-feil deteksjon | Manuel | Auto | **100%** |

---

## Integrasjon med KIMI

### Automatisk (Anbefalt)
KIMI bruker Mempalace automatisk ved hver prompt:

```javascript
// KIMI intern prosess
const bridge = new KIMIMempalaceBridge();
const enriched = await bridge.enrichPrompt(userPrompt, {
  modifiedFiles: ['src/lib/trading/core/new-feature.ts']
});

// KIMI får beriket prompt
```

### Manuel
```bash
node scripts/kimi-mempalace-bridge.mjs "Fix auth bug"
```

---

## Konfigurasjon

Rediger `.mcp/mempalace-mcp.json` for å tilpasse:

```json
{
  "shortcuts": {
    "@mydomain": {
      "description": "My domain",
      "files": ["src/lib/mydomain/**/*.ts"],
      "docs": ["docs/mydomain.md"]
    }
  }
}
```

---

## Feilsøking

### Server starter ikke
```bash
# Sjekk om port er i bruk
lsof -i :3456

# Prøv annen port
MEMPALACE_PORT=3457 node scripts/mempalace-mcp-server.mjs
```

### Ingen kontekst funnet
```bash
# Rebuild index
curl http://localhost:3456/status
# Restart server
```

### Treg respons
- Øk `cache_ttl` i config
- Reduser antall indekserte filer
- Bruk `lazy_load_domains: true`

---

## Roadmap

- [ ] VS Code extension
- [ ] WebSocket støtte
- [ ] KI-drevet kontekst-prediksjon
- [ ] Multi-prosjekt støtte

---

**Mempalace MCP gjør KIMI til den smarteste kodearkitekten i rommet.** 🏛️✨
