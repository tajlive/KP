# 🏛️ MemPalace + KIMI Auto-Setup Guide

> **Raw Mode = 96.6% LongMemEval R@5** (høyest publisert, zero API calls)
> 
> MemPalace er **ikke** et sammendrag-system. Det lagrer alt verbatim og gjør det søkbart.

## ✅ Oppsett Fullført

MemPalace er nå optimalisert for Klarpakke med:
- **Raw mode** (96.6% accuracy, anbefalt)
- **Klarpakke wing** med prosjekt-spesifikke rooms
- **Auto-save hver 15. samtale**
- **Exit-save** når du avslutter KIMI
- **Daglig versjonssjekk** via GitHub Actions
- **MCP server** integrert med KIMI

## 🚀 Hvordan bruke

### 1. Start KIMI (med auto-save)
```bash
# Last shell config (kun første gang etter setup)
source ~/.zshrc

# Start KIMI - auto-save er nå aktiv
kimi
```

### 2. Manuelle kommandoer
```bash
memsave              # Lagre nåværende samtale umiddelbart
memsave "auth fix"   # Lagre med beskrivelse
memstatus            # Sjekk MemPalace status
memsync              # Sync prosjekt til MemPalace
npm run mempalace:sync:full   # Full re-mining
```

### 3. Auto-Save Logikk
```
Samtale #1  → Teller øker
Samtale #2  → Teller øker
...
Samtale #15 → 🔄 AUTO-LAGRING til MemPalace!
Samtale #16 → Teller øker
...
EXIT KIMI   → 🔄 LAGRER siste samtale automatisk
```

### 4. I KIMI - Automatisk hukommelse
Bare still spørsmål som normalt. KIMI husker automatisk:

| Spørsmål | Hva KIMI gjør |
|----------|---------------|
| `"Hva jobbet vi med sist?"` | Søker i MemPalace via MCP |
| `"Hva var status på paper-trading?"` | Henter L1 kontekst + søker |
| `"Hvilke beslutninger tok vi?"` | Søker hall_facts |
| `"Søk etter auth-migrering"` | Dyp søk i alle closets |

### 5. Lagre nye minner
```
> "Husk at vi skal bruke NOK ikke USDT for valuta"
> "Lagre at E2E-testene trenger fix"
```

## 📁 Filer opprettet

| Fil | Hva |
|-----|-----|
| `~/.kimi/mcp.json` | MCP server konfigurasjon |
| `~/.kimi/hooks/mempalace-auto-save.sh` | Auto-save hver 15. samtale |
| `~/.kimi/hooks/mempalace-exit-save.sh` | Lagre ved exit |
| `~/.kimi/hooks/mempalace-save-now.sh` | Manuel lagring |
| `~/.kimi/setup-shell-integration.sh` | Shell setup script |
| `~/klarpakke/mempalace.yaml` | MemPalace prosjektkonfig |
| `~/klarpakke/.mempalace/config.json` | Raw mode config (96.6%) |
| `~/klarpakke/scripts/mempalace-sync.sh` | Sync skript |
| `~/klarpakke/scripts/mempalace-wake.sh` | Wake-up helper |
| `.github/workflows/mempalace-guard.yml` | Daglig versjonssjekk |

## 🔄 Auto-Funksjoner

### Automatisk aktivert:
- ✅ **Lagring hver 15. samtale** (endre med `MEMPALACE_SAVE_INTERVAL=N`)
- ✅ **Exit-save** når du forlater KIMI
- ✅ MemPalace søker før KIMI svarer (hvis relevant)
- ✅ Lagring av beslutninger (via naturlig samtale)
- ✅ Wake-up kontekst ved start
- ✅ **Daglig sjekk** for MemPalace-oppdateringer
- ✅ Raw mode (ikke AAAK) for beste accuracy

### GitHub Actions Schedule:
```yaml
07:00 UTC - Sjekk for MemPalace-oppdateringer
09:00 UTC - Dokumentasjons-guard
```

## 🎯 Best Practices (fra MemPalace README)

1. **Raw mode er default** (96.6% vs 84.2% for AAAK)
   - Config: `"mode": "raw"` i config.json
   - AAAK er experimental og trades fidelity for compression

2. **Start samtaler med kontekst:**
   ```
   > "Hva var det vi bestemte om X?"
   ```

3. **Bekreft lagring:**
   ```
   > "Husk at vi valgte Y over Z"
   ```

4. **Bruk rom for organisering:**
   ```
   > "Dette gjelder auth-migrering"
   ```

5. **Synk regelmessig:**
   ```bash
   npm run mempalace:sync  # Kjør etter viktige endringer
   ```

## 📊 Benchmarks

| Mode | LongMemEval R@5 | Bruk |
|------|-----------------|------|
| **Raw** | **96.6%** ✅ | Default - beste accuracy |
| AAAK | 84.2% | Experimental - compression |
| +Haiku rerank | 100% | Med optional reranking |

**Kostnad:** ~$10/år (170 tokens wake-up + søk)
**VS LLM summaries:** ~$507/år

## ⚙️ Konfigurasjon

### Endre lagringsintervall
```bash
# Legg til i ~/.zshrc eller ~/.bashrc
export MEMPALACE_SAVE_INTERVAL=10  # Lagre hver 10. samtale
```

### Deaktiver auto-save midlertidig
```bash
MEMPALACE_SAVE_INTERVAL=99999 kimi
```

### Sjekk nåværende teller
```bash
cat ~/.kimi/logs/mempalace-counter
```

## 🆘 Feilsøking

| Problem | Løsning |
|---------|---------|
| `mempalace: command not found` | `pip install mempalace` |
| MCP ikke tilgjengelig | `kimi mcp list` - sjekk at mempalace er der |
| Ingen minner funnet | Kjør `npm run mempalace:sync:full` |
| Auto-save fungerer ikke | Sjekk `~/.kimi/logs/mempalace-counter` |
| Exit-save fungerer ikke | Kjør `bash ~/.kimi/hooks/mempalace-exit-save.sh` manuelt |
| Kontekst for gammel | `mempalace compress` for AAAK kompresjon |

## 🔗 Referanser

- **GitHub:** https://github.com/milla-jovovich/mempalace
- **PyPI:** https://pypi.org/project/mempalace/
- **LongMemEval:** 96.6% R@5, zero API calls, reproducible

---

**Sist oppdatert:** 2026-04-08
**Versjon:** MemPalace 3.0.0 (Raw Mode) + KIMI MCP + Auto-Save
