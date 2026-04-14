# ⚡ KIMI QUICKSTART (Les på 30 sekunder) — v2.1

## 🚀 Ved Oppstart

```bash
# 1. Kjør autostart
.kimi/autostart.sh

# 2. Sjekk kontekst
.kimi/context-predictor.sh

# 3. MemPalace wake-up (FTS5)
mempalace wake-up --wing klarpakke
```

## 🧠 MemPalace Pattern (FTS5)

```bash
# FØR oppgave — søk
mempalace search "auth refresh"

# ETTER oppgave — logg (MCP)
# Bruk mempalace_add_drawer eller mempalace_diary_write
```

## 🛠️ Auto-Skills (Aktiveres automatisk)

| Path | Skills |
|------|--------|
| `src/lib/auth/**/*.ts` | vulnerability-scanner, security-testing |
| `src/lib/trading/**/*.ts` | crypto-specialist, api-patterns |
| `src/app/api/**/*.ts` | api-patterns, rate-limiting |
| `src/components/**/*.tsx` | frontend-design, nextjs-react-expert |
| `supabase/migrations/*.sql` | database-design |
| `e2e/**/*.ts` | webapp-testing |

## ⚡ Kjappe Kommandoer (Aliases)

```bash
kimi health       # Health check
kimi verify       # Verifiser miljø
kimi dev          # Start dev
kimi build        # Bygg
kimi test         # Kjør tester
kimi test:auth    # Auth-tester
kimi test:e2e     # E2E critical
kimi deploy       # Deploy prod
kimi preview      # Deploy preview
```

## 🏛️ MemPalace Rom (11 rom)

| Rom | Innhold | Prioritet |
|-----|---------|-----------|
| `auth_system` | Auth-mønstre | 🔴 High |
| `auth` | Auth-fixes (MCP-lagret) | 🔴 High |
| `critical_decisions` | ADR-er | 🔴 High |
| `error_patterns` | Feil + løsninger | 🔴 High |
| `api_contracts` | API-dokumentasjon | 🟡 Medium |
| `tech_debt` | TYPE_DEBT | 🟡 Medium |
| `infrastructure` | Deploy, DNS, Vercel | 🟢 Standard |
| `operations` | Agent ops, monitoring | 🟢 Standard |
| `ux_engineering` | UX/UI, i18n | 🟢 Standard |
| `project_status` | Statusrapporter | 🟢 Standard |
| `kimi_sessions` | Diary entries | 🟢 Standard |

## ✅ ALLTID Husk

- **YOLO**: Implementer uten å spørre
- **Minimal**: Kun det som må til
- **Verifiser**: Sjekk før endring
- **GO/NO-GO**: Tydelig status

---

**Full guide:** `.kimi/STARTUP_PROMPT.md`  
**Auth fix ref:** Commit `4a98feb1c` (refresh-guard mutex + circuit breaker)
