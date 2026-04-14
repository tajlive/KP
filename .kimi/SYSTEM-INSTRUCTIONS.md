# 🤖 KIMI Agent System Instructions
# Versjon: 1.0 | Dato: 2026-04-14 | Status: PRODUKSJON

---

## 🧠 MEM/PALACE — Aktiver ved oppstart

Ved enhver ny agent-sesjon: les disse tre filene FØR du gjør noe annet:

```bash
cat /Users/taj/klarpakke/.kimi/KIMI.md           # Arkitektur + sprint-historikk
cat /Users/taj/klarpakke/KIMI-SYSTEM-PROMPT.md   # MemPalace-rom + rolle
cat /Users/taj/klarpakke/.kimirc                 # Runtime-konfigurasjons
```

**MemPalace CLI:**
```bash
/Library/Frameworks/Python.framework/Versions/3.13/bin/mempalace search "<term>"
```

---

## 🛠️ VERKTØY-PRIORITERING (agenter må følge dette)

### ✅ Alltid tilgjengelig (primærverktøy)

```
Les fil        → read_text_file / read_multiple_files
Skriv fil      → write_file
Rediger fil    → edit_file  (linje-basert, ALLTID foretrekk dette over write_file)
Søk filer      → search_files
Katalog        → list_directory, directory_tree
Terminal       → write_to_terminal (for npm-kommandoer, git, etc.)
```

### ✅ Fungerende MCP-verktøy
```
kimi_db status/push/gen-types/migrate/lint   → Alltid bruk for DB-operasjoner
kimi_ci                                      → Alltid kjør etter kodeendring
kimi_monitor full/prod/api/supabase          → Før deploy
kimi_deploy preview/prod/status              → Kun når alt er grønt
```

### ⚠️ Begrensede verktøy
```
kimi_ask   → Kimi CLI er task-runner, ikke AI-chat.
             Stdin forsøkes, men kan feile.
             Bruk Perplexity AI-kapasitet direkte i stedet.

kimi_code  → Samme begrensning som kimi_ask.
             Bruk edit_file + write_file i stedet.
```

---

## 🤖 AGENT-ARKETYPER

### Agent: DB-FIX
```
Mål: Fiks Supabase-schema eller query-feil
Verktøy: read_text_file → edit_file → kimi_db status → kimi_ci
Sjekk alltid: src/lib/supabase/*.ts + supabase/migrations/
Husk: .maybeSingle() ikke .single() når 0 rader er gyldig resultat
Husk: Legg til NOT NULL-felt med defaults i INSERT
```

### Agent: I18N-FIX
```
Mål: Fiks MISSINGMESSAGE eller manglende oversettelser
Verktøy: search_files (pattern) → read_multiple_files → edit_file/write_file
Sjekk alltid: messages/no/ og messages/en/ begge locales
Husk: Opprett begge filene (no + en) ved ny namespace
Husk: next-intl config kan trenge oppdatering
```

### Agent: API-FIX
```
Mål: Fiks API-rute som returnerer 4xx/5xx
Verktøy: read_text_file (route.ts) → read_text_file (lib/) → edit_file → kimi_ci
Sjekk alltid: src/app/api/**/*.ts + src/lib/supabase/*.ts
Husk: Zod-validering + Result-pattern + RLS-hensyn
```

### Agent: DEPLOY
```
Mål: Deploy til preview eller prod
Verktøy: kimi_ci → kimi_db status → kimi_monitor full → kimi_deploy
Rekkefølge er obligatorisk — aldri deploy uten alle grønne
```

---

## 🔄 STANDARD ARBEIDSFLYT FOR KODEENDRINGER

```
1. search_files → Finn relevante filer
2. read_multiple_files → Les ALT relevant kontekst
3. edit_file → Gjør minimale, presise endringer
4. kimi_ci → Verifiser ingen nye feil
5. Rapporter: hvilke filer, hva endret, hva gjenstkr
```

---

## 🛡️ SIKKERHETSNETT (aldri bryt)

```
- Ingen live ordre uten feature_flags.live_trading_enabled = true
- Ingen API-nøkler i loggfiler
- Aldri DELETE uten WHERE-klausul
- Aldri dropp produksjonstabeller
- Alltid .maybeSingle() for opt-out-spørringer
- MAX_RISK_PER_TRADE_PCT = 0.02 (2%)
- MAX_DAILY_LOSS_PCT = 0.05 (5%)
```

---

## 📋 VIKTIGE FILER (leses ved start)

```
Src-kart:         .kimi/KIMI.md
DB-kart:          supabase/schema.sql eller supabase/migrations/
Typer:            src/lib/trading/types.ts
Konstanter:       src/lib/trading/constants.ts
Paper-trading:    src/lib/supabase/paper-trading.ts
API-ruter:        src/app/api/
Meldinger (i18n): messages/no/ og messages/en/
Feil-logg:        logs/kimi-activity.log
```
