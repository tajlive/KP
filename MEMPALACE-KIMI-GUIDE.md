# 🏛️ MemPalace + KIMI Guide (M1 Mac + iTerm Optimized)

> **Raw Mode = 96.6% LongMemEval R@5** (høyest publisert, zero API calls)

## 🚀 Hurtigstart for M1 Mac

```bash
# 1. Setup (kun én gang)
bash ~/.kimi/setup-m1.sh
source ~/.zshrc

# 2. Start KIMI (med auto-save)
kimi

# 3. Søk i kunnskap (ChromaDB-workaround for M1)
knowledge-search auth
```

## 🍎 M1 Mac Spesifikke Optimaliseringer

### Hva er annerledes på M1?

| Problem | Løsning |
|---------|---------|
| ChromaDB krasjer (Issue #74) | Bruk `knowledge-search` i stedet |
| x86 Python pakker | Homebrew ARM64 path først |
| Ytelse | Native ARM64 builds |

### ChromaDB Workaround

På M1 Mac kan ChromaDB ha kompabilitetsproblemer. Vi har løst dette med:

```bash
# ❌ Dette kan feile på M1:
mempalace search "auth"

# ✅ Bruk istedenfor:
knowledge-search "auth"

# Eller:
./scripts/knowledge-search.sh "auth"
```

## 📋 Kommandoer

### Grunnleggende
```bash
kimi                      # Start KIMI med auto-save
memsave                   # Lagre nåværende samtale
memsave "beskrivelse"     # Lagre med beskrivelse
memstatus                 # MemPalace status
memsync                   # Sync prosjekt til MemPalace
```

### Knowledge (M1-optimized)
```bash
npm run knowledge:mine    # Generer kunnskap
npm run knowledge:sync    # Synk til MemPalace
knowledge-search <ord>    # Søk uten ChromaDB
knowledge-graph           # Vis knowledge stats
```

### iTerm Spesifikt
```bash
notify "Tittel" "Melding"  # macOS notification
memwake                    # Hurtig wake-up
```

## 🎨 iTerm Funksjoner

### 1. Badge Viser Prosjekt
Se øverst i iTerm-vinduet - badge viser automatisk aktivt prosjekt:
- `🏛️ KLARPAKKE` når du er i klarpakke-mappen
- `🧠 MemPalace` når du jobber med mempalace

### 2. Cmd+Click på Filer
I output fra f.eks. `knowledge-search` kan du:
- **Cmd+Click** på filnavn for å åpne i editor
- **Cmd+Click** på lenker for å åpne i nettleser

### 3. Fargekoding
- 🟠 **Oransje** = Beslutninger
- 🔵 **Blå** = Mønstre  
- 🔴 **Rød** = Feil

## 🔄 Auto-Funksjoner

| Hva | Når |
|-----|-----|
| Lagre samtale | Hver 15. samtale |
| Exit-save | Når du avslutter KIMI |
| Knowledge mining | Daglig kl 08:00 UTC |
| Versjonssjekk | Daglig kl 07:00 UTC |

## 🧠 Knowledge System

### Struktur
```
.knowledge/
├── decisions/     # Arkitektur-beslutninger (fra ADR)
├── errors/        # Feil og løsninger (manuell)
├── patterns/      # Kode-mønstre (auto-generert)
└── current-todos.md   # TODOs i koden
```

### Smart bruk
```bash
# Finn hotspots i koden
knowledge-search "trading"

# Se siste beslutninger
cat .knowledge/decisions/*.md | head -50

# Sjekk TODOs
grep "TODO" .knowledge/current-todos.md
```

## 🎯 Best Practices

1. **Logg feil umiddelbart**
   ```bash
   echo "# $(date +%Y-%m-%d) - [Feil]
   
   ## Symptom
   [beskrivelse]
   
   ## Fix
   [løsning]
   " > .knowledge/errors/$(date +%Y-%m-%d)-kortnavn.md
   ```

2. **Søk før du spør**
   ```bash
   knowledge-search "auth"  # Har vi løst dette før?
   ```

3. **Bruk iTerm notifications**
   ```bash
   long-running-command && notify "Done" "Ferdig!"
   ```

## 🆘 Feilsøking

| Problem | Løsning |
|---------|---------|
| `chroma.sqlite3` feil | Normalt på M1 - bruk `knowledge-search` |
| `mempalace: command not found` | `pip install mempalace` |
| Badge vises ikke | Sjekk at iTerm2 Shell Integration er aktivert |
| Knowledge ikke funnet | Kjør `npm run knowledge:mine` |

## 📊 Benchmarks

| Mode | LongMemEval R@5 |
|------|-----------------|
| **Raw** | **96.6%** ✅ |
| AAAK | 84.2% |
| +Haiku rerank | 100% |

## 🔗 Referanser

- **GitHub:** https://github.com/milla-jovovich/mempalace
- **Issue #74:** macOS ARM64 ChromaDB workaround
- **PyPI:** https://pypi.org/project/mempalace/

---

**Sist oppdatert:** 2026-04-08  
**Platform:** Apple Silicon (M1/M2/M3) + iTerm2  
**Versjon:** MemPalace 3.0.0 + Knowledge Miner
