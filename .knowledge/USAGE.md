# 🧠 Knowledge Miner - Bruksanvisning

## Hurtigstart

```bash
# 1. Generer kunnskap nå
npm run knowledge:mine

# 2. Synk til MemPalace
npm run knowledge:sync

# 3. Spør KIMI om hva som er viktig
kimi -p "Hva er de viktigste TODOs i prosjektet?"
```

## Daglig arbeidsflyt

### Morgenrutine (2 min)
```bash
# Synk kunnskap fra gårsdagen
npm run knowledge:sync

# Start KIMI
kimi

# I KIMI:
> "Hva jobbet vi med i går?"
> "Hvilke feil har vi hatt denne uken?"
> "Hva er viktigste arkitektur-beslutninger?"
```

### Under arbeid
Når du støter på noe viktig:
```
> "Husk at vi må bruke NOK for trading"
> "Logg at auth-callback feiler pga PKCE cookie"
> "Dokumenter at vi valgte Supabase over Firebase"
```

### Ved feil (kritisk!)
```
> "FEIL: [beskrivelse] løst ved [løsning]. 
    Lagre i .knowledge/errors/2024-04-08-auth-feil.md"
```

## Spørsmål du kan stille KIMI

| Spørsmål | Hva KIMI gjør |
|----------|---------------|
| `"Hva er hotspots i koden?"` | Sjekker .knowledge/patterns/hot-files.md |
| `"Hvilke TODOs må vi prioritere?"` | Lister TODOs fra current-todos.md |
| `"Hvorfor valgte vi X over Y?"` | Finner ADR i .knowledge/decisions/ |
| `"Hvordan fikset vi Z sist gang?"` | Søker .knowledge/errors/ |
| `"Hvilke scripts har vi for deploy?"` | Sjekker scripts-overview.md |

## Best Practices

### 1. Logg feil umiddelbart
Ikke vent til dagen etter. Når du fikser en feil:
```bash
echo "# $(date +%Y-%m-%d) - Auth Cookie Feil

## Symptom
PKCE code verifier not found

## Årsak
Cookie domain mismatch i redirect chain

## Fix
Re-set cookie med decoded value i callback route

## Referanse
commit: $(git rev-parse --short HEAD)
" > .knowledge/errors/$(date +%Y-%m-%d)-auth-cookie.md
```

### 2. Dokumenter beslutninger
Når teamet tar en beslutning:
```bash
# Opprett decision record
echo "# Valg av [X] over [Y]

## Kontekst
[beskrivelse]

## Alternativer
- A: [fordeler/ulemper]
- B: [fordeler/ulemper]

## Beslutning
Valgte A fordi...

## Konsekvenser
- [punkt 1]
- [punkt 2]
" > .knowledge/decisions/$(date +%Y-%m-%d)-valg-navn.md
```

### 3. Automatisk synk
Legg til i din shell-config (~/.zshrc):
```bash
# Synk knowledge ved hver 10. KIMI-sesjon
precmd() {
  if [ -f ~/.kimi/logs/mempalace-counter ]; then
    COUNTER=$(cat ~/.kimi/logs/mempalace-counter)
    if [ $((COUNTER % 10)) -eq 0 ]; then
      (cd ~/klarpakke && npm run knowledge:sync >/dev/null 2>&1 &)
    fi
  fi
}
```

## Viktige filer

| Fil | Oppdateres | Innhold |
|-----|------------|---------|
| `.knowledge/current-todos.md` | Daglig | TODOs/FIXMEs i koden |
| `.knowledge/patterns/hot-files.md` | Daglig | Mest endrede filer |
| `.knowledge/patterns/scripts-overview.md` | Ved endring | Dokumentasjon av scripts |
| `.knowledge/decisions/*.md` | Manuelt | Arkitektur-beslutninger |
| `.knowledge/errors/*.md` | Manuelt | Feil og løsninger |

## Tips for maksimal verdi

1. **Vær konsistent** - Logg feil umiddelbart
2. **Vær spesifikk** - Inkluder commit-hash og filer
3. **Søk først** - Spør KIMI "Har vi hatt denne feilen før?"
4. **Del kunnskap** - Push .knowledge/ til repo
5. **Revis jevnlig** - Gå gjennom TODOs ukentlig
