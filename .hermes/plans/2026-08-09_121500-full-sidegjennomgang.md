# Full Sidegjennomgang — Innlogget Bruker

> **Mål:** Verifisere at ALLE sider, tall, verdier, knapper, tekster er korrekte for innlogget bruker.

## Sjekkliste per side

### 1. Dashboard (`/dashboard`)

| Element | Forventet | Faktisk | Status |
|---------|-----------|---------|--------|
| TopBar | «Klarpakke» + bruker | ? | ⏳ |
| BestemorPanel | «Roboten kjører» + gevinst | ? | ⏳ |
| LiveBalance | NOK korrekt | ? | ⏳ |
| Trades | Siste trades | ? | ⏳ |
| Knapper | Stopp, Info, Innstillinger | ? | ⏳ |
| Tekster | Norsk, forståelig | ? | ⏳ |

### 2. Trading (`/trading`)

| Element | Forventet | Faktisk | Status |
|---------|-----------|---------|--------|
| Symbol | SOL | ? | ⏳ |
| Leverage | 5x | ? | ⏳ |
| Grid | ±1.5% | ? | ⏳ |
| Kjøp/salg | Funksjonerer | ? | ⏳ |
| Posisjoner | Live data | ? | ⏳ |

### 3. Portefølje (`/portfolio`)

| Element | Forventet | Faktisk | Status |
|---------|-----------|---------|--------|
| Totalt | NOK korrekt | ? | ⏳ |
| Fordeling | BTC/ETH/SOL | ? | ⏳ |
| Historikk | Positive dager | ? | ⏳ |

### 4. Innstillinger (`/settings`)

| Element | Forventet | Faktisk | Status |
|---------|-----------|---------|--------|
| Profil | Tom info | ? | ⏳ |
| Exchange | OKX koblet | ? | ⏳ |
| API-nøkkel | Kun trade | ? | ⏳ |
| Varsling | Popup aktivert | ? | ⏳ |

### 5. Historikk (`/history`)

| Element | Forventet | Faktisk | Status |
|---------|-----------|---------|--------|
| Trades | Siste 10 | ? | ⏳ |
| Dato | Norsk format | ? | ⏳ |
| Beløp | NOK | ? | ⏳ |
| Resultat | Grønn/rød | ? | ⏳ |

## Verifikasjonsmetoder

| Metode | Bruk |
|--------|------|
| **Playwright** | Automatisk test av alle sider |
| **Manuell curl** | Verifisere API-responser |
| **Visuell inspeksjon** | Sjekke layout, farger, tekst |
| **DB-spørring** | Verifisere tall mot Supabase |

## Test-plan

### Steg 1: Start lokal server
```bash
npm run dev
```

### Steg 2: Kjør Playwright-tester
```bash
npx playwright test tests/e2e/logged-in-pages.spec.ts
```

### Steg 3: Verifiser API-er
```bash
curl https://klarpakke.no/api/trading/max-aggressive
curl https://klarpakke.no/api/user/balance
curl https://klarpakke.no/api/trades/recent
```

### Steg 4: DB-verifikasjon
```sql
SELECT * FROM trades WHERE user_id = 'tom' ORDER BY created_at DESC LIMIT 10;
SELECT balance FROM accounts WHERE user_id = 'tom';
```

## Rapportering

| Funn | Handling |
|------|----------|
| Feil tall | Rapporter til Tom, fiks umiddelbart |
| Feil tekst | Oppdater i18n |
| Feil knapp | Fiks funksjonalitet |
| Feil layout | Fiks CSS |

**Skal jeg starte gjennomgangen?**
