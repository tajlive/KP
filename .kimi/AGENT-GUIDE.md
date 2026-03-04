# KIMI 2.5 Agent Guide - MCP First

> **REGLER:** Du skal ALLTID sjekke MCP-verktøy først før manuelle operasjoner!

---

## 🔍 Trinn 1: Sjekk MCP Status (ALLTID FØRST!)

```bash
cd ~/klarpakke
./scripts/mcp.sh check
```

**Hvis ✅ MCP er tilgjengelig:**
- Bruk `./mcp.sh [kommando]` for alle operasjoner
- Aldri bruk `git push` manuelt (bruk `./mcp.sh deploy trigger`)
- Aldri bruk `psql` direkte (bruk `./mcp.sh database query`)

**Hvis ❌ MCP er IKKE tilgjengelig:**
- Fortsett med manuelle metoder
- Gi beskjed til bruker om å sette opp MCP tokens

---

## 🛠️ MCP Verktøy Oversikt

### Database (SQL)
```bash
./mcp.sh database check              # Test tilkobling
./mcp.sh database query "SELECT..."  # Kjør SQL
./mcp.sh database tables             # List tabeller
./mcp.sh database migrate            # Kjør migrasjoner
```

### Deploy
```bash
./mcp.sh deploy status               # Sjekk deploy status
./mcp.sh deploy trigger              # Trigg ny deploy
./mcp.sh deploy logs                 # Vis deploy logs
```

### GitHub
```bash
./mcp.sh github status               # Siste commits
./mcp.sh github workflows            # Workflow kjøringer
```

---

## 📝 Beslutningstre

```
FØR HVER OPERASJON:

1. Trenger du database-endring?
   └─► Ja → Bruk: ./mcp.sh database [query|migrate]

2. Trenger du deploy?
   └─► Ja → Bruk: ./mcp.sh deploy trigger

3. Trenger du sjekke status?
   └─► Ja → Bruk: ./mcp.sh [database|deploy|github] status

4. Andre oppgaver?
   └─► Fortsett manuelt
```

---

## ⚡ Raske kommandoer

| Hva | MCP-kommando | Manuelle alternativ |
|-----|-------------|---------------------|
| Deploy kode | `./mcp.sh deploy trigger` | `git push` |
| SQL query | `./mcp.sh database query "SELECT..."` | `psql ...` |
| Sjekk tabeller | `./mcp.sh database tables` | Supabase Studio |
| Siste commits | `./mcp.sh github status` | `git log` |
| Kjør migrasjon | `./mcp.sh database migrate` | `supabase db push` |

---

## 🚨 Hva du IKKE skal gjøre

❌ **ALDRI gjør dette når MCP er tilgjengelig:**

```bash
# BAD - Manuelle metoder når MCP finnes:
git push origin main                    # Bruk: ./mcp.sh deploy trigger
psql $DATABASE_URL -c "SELECT..."      # Bruk: ./mcp.sh database query
supabase db push                        # Bruk: ./mcp.sh database migrate
curl https://api.vercel.com/...         # Bruk: ./mcp.sh deploy status
```

✅ **ALLTID foretrekk MCP:**

```bash
# GOOD - Bruk MCP-verktøy:
./mcp.sh deploy trigger                 # Trigger GitHub Actions
./mcp.sh database query "SELECT..."     # SQL via MCP
./mcp.sh database migrate               # Kjør alle migrasjoner
./mcp.sh deploy status                  # Sjekk Vercel status
```

---

## 🔧 Oppsett (hvis MCP ikke er konfigurert)

```bash
cd ~/klarpakke/klarpakke-mcp-server
cp .env.example .env

# Fyll inn tokens:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - VERCEL_TOKEN
# - GITHUB_PAT

# Test:
cd ~/klarpakke
./scripts/mcp.sh check
```

---

## 📋 Sjekkliste før hver oppgave

- [ ] Kjør: `./scripts/mcp.sh check`
- [ ] Hvis ✅ Bruk MCP-verktøy
- [ ] Hvis ❌ Bruk manuelle metoder + informer bruker
- [ ] Dokumenter hva du gjorde

---

**Husk: MCP-verktøy er tryggere, raskere og mer konsistente!**
