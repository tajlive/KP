# 🏛️ MemPalace + KIMI Auto-Setup Guide

## ✅ Oppsett Fullført

MemPalace er nå automatisk integrert med KIMI. Du trenger ikke gjøre noe mer!

## 🚀 Hvordan bruke

### 1. Start KIMI normalt
```bash
kimi
```

### 2. Automatisk hukommelse
Bare still spørsmål som du vanligvis ville gjort. KIMI husker automatisk:

| Spørsmål | Hva KIMI gjør |
|----------|---------------|
| `"Hva jobbet vi med sist?"` | Søker i MemPalace via MCP |
| `"Hva var status på paper-trading?"` | Henter L1 kontekst + søker |
| `"Hvilke beslutninger tok vi?"` | Søker hall_facts |
| `"Søk etter auth-migrering"` | Dyp søk i alle closets |

### 3. Lagre nye minner
```
> "Husk at vi skal bruke NOK ikke USDT for valuta"
> "Lagre at E2E-testene trenger fix"
```

### 4. MCP Tools tilgjengelig
KIMI kan nå bruke disse MemPalace-verktøyene automatisk:
- `mempalace_search` - Semantisk søk
- `mempalace_wake_up` - Last L0+L1 kontekst
- `mempalace_remember` - Lagre nytt minne
- `mempalace_room_recall` - Rom-spesifikt minne
- + 15 flere...

## 📁 Filer opprettet

| Fil | Hva |
|-----|-----|
| `~/.kimi/mcp.json` | MCP server konfigurasjon |
| `~/klarpakke/mempalace.yaml` | MemPalace prosjektkonfig |
| `~/.config/kimi/mempalace-integration.yaml` | KIMI + MemPalace settings |
| `~/.kimi/hooks/mempalace-save-hook.sh` | Auto-save etter sesjoner |

## 🔄 Auto-Funksjoner

### Automatisk aktivert:
- ✅ MemPalace søker før KIMI svarer (hvis relevant)
- ✅ Lagring av beslutninger (via naturlig samtale)
- ✅ Wake-up kontekst ved start
- ✅ Project context fra klarpakke

### Manuell bruk (valgfritt):
```bash
# Forhånds lasting av kontekst
mempalace wake-up > /tmp/k && kimi -p "Bruk: $(cat /tmp/k)"

# Søk manuelt
mempalace search "auth" --wing klarpakke

# Status
mempalace status
```

## 🎯 Best Practices

1. **Start samtaler med kontekst:**
   ```
   > "Hva var det vi bestemte om X?"
   ```

2. **Bekreft lagring:**
   ```
   > "Husk at vi valgte Y over Z"
   ```

3. **Bruk rom for organisering:**
   ```
   > "Dette gjelder auth-migrering"
   ```

4. **Komprimer ved store oppgaver:**
   ```
   > "/compact" (i KIMI når kontekst er full)
   ```

## 🆘 Feilsøking

| Problem | Løsning |
|---------|---------|
| `mempalace: command not found` | `pip install mempalace` |
| MCP ikke tilgjengelig | `kimi mcp list` - sjekk at mempalace er der |
| Ingen minner funnet | Kjør `mempalace mine . --mode projects` |
| Kontekst for gammel | `mempalace compress` for AAAK kompresjon |

## 📊 Kostnader

- **MemPalace**: $0 (lokalt, ingen API-kall)
- **KIMI + MemPalace**: ~$10/år (170 tokens wake-up)
- **Sammenligning**: LLM-sammendrag = ~$507/år

**Spart: $497/år + bedre hukommelse!**

---

**Sist oppdatert:** $(date)
**Versjon:** MemPalace 3.0.0 + KIMI MCP
