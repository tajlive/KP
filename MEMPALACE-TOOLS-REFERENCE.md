# 🛠️ MemPalace-Klarpakke Verktøy Referanse

## 📊 Oversikt: 29 Verktøy tilgjengelig

### 🏛️ MemPalace Verktøy (19 stk)

| # | Verktøy | Beskrivelse | Bruk |
|---|---------|-------------|------|
| 1 | `mempalace_search` | Semantisk søk | Finn noe i minnet |
| 2 | `mempalace_wake_up` | Laste L0+L1 | Ved oppstart |
| 3 | `mempalace_remember` | Lagre minne | "Husk at..." |
| 4 | `mempalace_room_recall` | Rom-spesifikt | Kontekst for tema |
| 5 | `mempalace_status` | Vis status | Sjekk hva som er lagret |
| 6 | `mempalace_compress` | AAAK kompresjon | Reduser størrelse |
| 7 | `mempalace_mine` | Miner prosjekt | Legg til nytt innhold |
| 8 | `mempalace_entity_search` | Entitet-søk | Finn personer/prosjekter |
| 9 | `mempalace_timeline` | Tidslinje | Historikk for rom |
| 10 | `mempalace_tunnels` | Kryss-koblinger | Se relasjoner |
| 11 | `mempalace_drawer_read` | Les drawer | Originalt innhold |
| 12 | `mempalace_tag_search` | Tag-søk | Søk etter merker |
| 13 | `mempalace_suggest_rooms` | Foreslå rom | Auto-organisering |
| 14 | `mempalace_sync` | Synkroniser | Ekstern kilde |
| 15 | `mempalace_clean` | Rydde opp | Fjern duplikater |
| 16 | `mempalace_export` | Eksport | Backup minner |
| 17 | `mempalace_import` | Import | Gjenopprett minner |
| 18 | `mempalace_query` | NL spørring | Naturlig språk |
| 19 | `mempalace_knowledge_graph` | KG spørring | Graf-basert søk |

### 🔍 Perplexity Verktøy (5 stk)

| # | Verktøy | Beskrivelse | Bruk |
|---|---------|-------------|------|
| 20 | `perplexity_search` | Web-søk | Sanntidsinfo |
| 21 | `perplexity_deep_research` | Dyp research | Grundig analyse |
| 22 | `perplexity_follow_up` | Følg opp | Fortsett samtale |
| 23 | `perplexity_list_threads` | List tråder | Se lagrede |
| 24 | `perplexity_get_thread` | Hent tråd | Spesifikk samtale |

### 🗄️ Supabase Verktøy (3 stk)

| # | Verktøy | Beskrivelse | Bruk |
|---|---------|-------------|------|
| 25 | `query_database` | SQL spørring | Database data |
| 26 | `check_auth` | Sjekk auth | Autentisering |
| 27 | `get_user_profile` | Hent profil | Brukerinfo |

### 📚 Context7 Verktøy (2 stk)

| # | Verktøy | Beskrivelse | Bruk |
|---|---------|-------------|------|
| 28 | `search_docs` | Søk docs | Dokumentasjon |
| 29 | `get_library_id` | Bibliotek ID | Hent ID |

---

## 💡 Raske Eksempler

### Søk i lokalt minne
```python
# Finn noe om paper-trading
mempalace_search(query="paper-trading API fix", wing="klarpakke")
```

### Lagre nytt minne
```python
# Husk en beslutning
mempalace_remember(
    content="Valgt Clerk over Auth0 for bedre UX",
    wing="klarpakke",
    room="auth-system",
    hall="hall_facts"
)
```

### Web-søk
```python
# Søk etter siste best practices
perplexity_search(query="Next.js 15 middleware best practices 2026")
```

### Hent rom-kontekst
```python
# Alt om paper-trading
mempalace_room_recall(room="paper-trading", wing="klarpakke")
```

---

## 🎯 Vanlige Workflows

### Workflow 1: Starte KIMI med kontekst
```
1. mempalace_wake_up(wing="klarpakke")
2. → Laster 170 tokens med kritisk kontekst
3. KIMI er klar med all bakgrunn!
```

### Workflow 2: Finne + Lagre
```
1. Bruker: "Hva er best practice for X?"
2. mempalace_search(query="X") → Ikke funnet
3. perplexity_search(query="X best practice")
4. Vis resultat
5. mempalace_remember(content=resultat)
6. Neste gang: mempalace_search finner det!
```

### Workflow 3: Rom-basert kontekst
```
1. Bruker: "Dette gjelder auth-migrering"
2. mempalace_room_recall(room="auth-system")
3. KIMI har all kontekst om auth!
```

---

## 📁 Konfigurasjon

**MCP Config:** `~/.kimi/mcp.json`
**MemPalace Config:** `~/klarpakke/mempalace.yaml`
**Memory Config:** `~/.config/kimi/klarpakke-memory.yaml`

---

*Sist oppdatert: $(date)*
