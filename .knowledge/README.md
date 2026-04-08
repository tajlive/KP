# 🧠 Klarpakke Hjerne

Automatisk kunnskapsbase drevet av KIMI + MemPalace.

## Struktur

```
.knowledge/
├── decisions/     # Arkitektur- og tekniske beslutninger
├── errors/        # Feil som har skjedd og hvordan de ble fikset
├── patterns/      # Gode mønstre og beste praksis
└── README.md      # Denne filen
```

## Hvordan bruke

Når du oppdager noe viktig:
```bash
# Ny beslutning
kimi -p "Husk beslutning: [beskrivelse] i .knowledge/decisions/"

# Ny feil
kimi -p "Logg feil: [beskrivelse] med fix i .knowledge/errors/"

# Nytt mønster
kimi -p "Dokumenter mønster: [beskrivelse] i .knowledge/patterns/"
```

MemPalace vil automatisk indeksere dette og gjøre det søkbart.
