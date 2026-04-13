# i18n Toasts i common.json

## Problem
`toasts.paperBot.*` nøklene var definert i `messages/no.json` (root), men ble ikke lastet av i18n.ts fordi den kun importerer fra `messages/no/*.json` (subfiles).

## Løsning
Flyttet `toasts` namespace fra root til `messages/no/common.json` og `messages/en/common.json`.

## Endringer

### Før (feil - root no.json)
```json
{
  "toasts": {
    "paperBot": { ... }
  }
}
```

### Etter (riktig - common.json)
```json
{
  "toasts": {
    "paperBot": {
      "startFailedTitle": "Kunne ikke starte boten",
      "networkError": "Nettverksfeil...",
      "sessionLimitTitle": "Grense for antall tradere nådd",
      "sessionLimitDesc": "Du kan ha maks {max} aktive tradere...",
      "duplicateSessionTitle": "Allerede aktiv",
      "duplicateSessionDesc": "Du har allerede en bot...",
      "startedTitle": "Paper bot startet!",
      "startedDesc": "Boten din handler nå med lekepenger."
    }
  }
}
```

## Bruk i kode
```typescript
const tToast = useTranslations("toasts");
tToast("paperBot.startedTitle"); // ✅ Fungerer nå
```

## Konsekvens av feilen
- `[MISSING: toasts.paperBot.startedTitle]` vist i UI
- Brukere så råe i18n-nøkler istedenfor tekst

## Referanser
- BotWizard.tsx: Bruker `useTranslations("toasts")`
- i18n.ts: Laster kun fra `messages/${locale}/*.json`

## Status
✅ Fikset i commit 234d83bbd
