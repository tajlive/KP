# 📥 LinkedIn Export Guide - Hent din nettverk

## Steg-for-steg

### 1. Gå til LinkedIn
**URL:** https://www.linkedin.com/mypreferences/d/download-my-data

### 2. Velg hva du vil eksportere
- Klikk på **"Connections"** (ditt nettverk)
- Velg format: **CSV**
- Klikk **"Request archive"**

### 3. Vent på e-post
- LinkedIn sender e-post når data er klart (kan ta 24 timer)
- **Hurtigvariant:** Bruk Sales Navigator eller tredjepartsverktøy

### 4. Last ned CSV
- Åpne e-posten fra LinkedIn
- Klikk nedlastingslenken
- Filen heter `Connections.csv`

### 5. Importer til kampanjen
```bash
cd ~/klarpakke
npx ts-node scripts/email-campaign/index.ts --import ~/Downloads/Connections.csv
```

---

## Alternativ: Rask uttrekk (uten å vente)

### Metode A: Chrome Extension
1. Installer "LinkedIn Email Extractor" (Chrome Web Store)
2. Logg inn på LinkedIn
3. Gå til "My Network" → "Connections"
4. Klikk extension-ikonet
5. Eksporter som CSV

### Metode B: Sales Navigator
Hvis du har LinkedIn Sales Navigator:
1. Lag søk på målgruppe (f.eks. "interested in investing")
2. Bruk "Export to CSV" funksjon
3. Får e-poster umiddelbart

---

## Forventet antall kontakter

| Profiltype | Typisk nettverk |
|------------|-----------------|
| Student | 200-500 |
| Junior profesjonell | 500-1500 |
| Senior profesjonell | 1500-5000 |
| Selger/Recruiter | 5000-30000 |

**Mål:** Minimum 500 kontakter for god effekt.

---

## Tips for kvalitet

✅ **DO:**
- Filtrer bort kollegaer (de vil si ja uansett)
- Prioriter folk i finans/tech/startup
- Sjekk at e-postadresser er gyldige

❌ **DON'T:**
- Ikke send til folk du ikke har noe forhold til
- Ikke send til konkurrenter
- Ikke spam - maks 1 e-post per person

---

**Neste steg:** Når du har CSV-en, kjør import-scriptet!
