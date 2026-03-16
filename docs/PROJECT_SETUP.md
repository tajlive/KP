# GitHub Projects Oppsett - Klarpakke

## 🎯 Oversikt

GitHub Projects gir visuell styring av alle oppgaver i Klarpakke.

## 📊 Prosjektstruktur

### Kolonner (Board-visning)

| Kolonne | Beskrivelse | Automatisering |
|---------|-------------|----------------|
| 📋 **Backlog** | Ideer og fremtidige oppgaver | Manuell |
| 📝 **Todo** | Klar til å startes | Ved label 'ready' |
| 🏗️ **In Progress** | Jobbes med nå | Ved assign |
| 👀 **In Review** | PR åpen, venter på review | Ved PR-link |
| ✅ **Done** | Ferdig og merget | Ved merge/close |

### Milestones i prosjektet

- **MVP Launch** (Due: 2026-02-02)
  - #72 MVP Testing
  - #32 Testing checklist

- **Week 2: Småsparer-first** (Due: 2026-02-09)
  - #66 Småsparer-first

- **Klarpakke 2.0** (Due: 2026-02-28)
  - #54 Roadmap

## 🚀 Oppsettinstruksjoner

### Steg 1: Opprett prosjekt

1. Gå til: https://github.com/tajlive/KP/projects
2. Klikk **"New project"**
3. Velg **"Board"**
4. Navn: **"Klarpakke Development"**
5. Klikk **"Create"**

### Steg 2: Konfigurer kolonner

1. I prosjektet, klikk **"+"** for å legge til kolonner
2. Legg til i denne rekkefølgen:
   - 📋 Backlog
   - 📝 Todo
   - 🏗️ In Progress
   - 👀 In Review
   - ✅ Done

### Steg 3: Aktiver automatisering

1. Klikk **"..."** (øverst høyre) → **"Workflows"**
2. Aktiver:
   - ✅ **Auto-add to project** - Issues/PRs legges automatisk til
   - ✅ **Auto-archive items** - Ferdige items arkiveres etter 30 dager
3. Klikk **"..."** på hver workflow → **"Enable"**

### Steg 4: Legg til eksisterende issues

```bash
# Liste alle åpne issues
gh issue list --state open --limit 100

# Legg til i prosjekt (bytt ut X med prosjekt-nummer)
gh project item-add X --url https://github.com/tajlive/KP/issues/72
gh project item-add X --url https://github.com/tajlive/KP/issues/32
gh project item-add X --url https://github.com/tajlive/KP/issues/66
gh project item-add X --url https://github.com/tajlive/KP/issues/54
```

### Steg 5: Sett opp views

1. Klikk **"+ New view"**
2. Lag disse visningene:

**Roadmap-visning:**
- Type: Roadmap
- Group by: Milestone
- Viser tidslinje

**Current Sprint:**
- Type: Board
- Filter: -label:backlog
- Viser bare aktivt arbeid

**Backlog:**
- Type: Board
- Filter: label:backlog
- Viser fremtidige oppgaver

## 🔄 Bruk i daglig arbeid

### Når du starter på en oppgave:

1. Finn issue i 📋 Backlog eller 📝 Todo
2. Assign deg selv
3. Flytt til 🏗️ In Progress
4. Opprett branch: `git checkout -b feature/navn`

### Når du er ferdig:

1. Push branch og opprett PR
2. I PR-beskrivelse: `Fixes #XX`
3. Issue flyttes automatisk til 👀 In Review
4. Ved merge: Flyttes til ✅ Done

### Kommandolinje:

```bash
# Se prosjekt-status
gh project view 1 --owner tajlive

# Legg til issue
gh project item-add 1 --url https://github.com/tajlive/KP/issues/72

# Opprette issue med label
gh issue create --title "Ny feature" --label "enhancement" --project "Klarpakke Development"
```

## 📈 Integrasjon med kode

### Automatisk flytting:

Når du skriver i commit:
```bash
git commit -m "fix: resolve DNS issue #72"
```
→ Issue #72 flyttes til ✅ Done (ved merge)

Når du åpner PR:
```
Fixes #72
```
→ Issue #72 flyttes til 👀 In Review

## 🎉 Fordeler

- **Visualisering**: Se alt arbeid på ett sted
- **Oversikt**: Hva er status, hvem jobber med hva
- **Planlegging**: Tidslinje og milestones
- **Automatisering**: Mindre manuelt arbeid
- **Samarbeid**: Enklere for andre å bidra

