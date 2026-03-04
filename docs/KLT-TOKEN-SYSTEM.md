# KLT Token System (Klarpakke Token)

## Oversikt

KLT er Klarpakke Universitetets interne utility token designet for å belønne læring, engasjement og bidrag til fellesskapet.

**Viktig**: KLT har ingen pengeverdi utenfor plattformen. Dette er et lærings- og engasjementsverktøy, ikke et investeringsobjekt.

---

## Tokenomics

### Forsyning
- **Totalt**: 10,000,000 KLT
- **Udelelighet**: 0 desimaler (hele tokens)
- **Type**: Utility token (ikke tradable)

### Distribusjon

| Kategori | Antall | Prosent | Beskrivelse |
|----------|--------|---------|-------------|
| **Grunnleggere** | 1,000,000 | 10% | 100 første studenter får 10,000 KLT hver |
| **Team/Reserve** | 9,000,000 | 90% | Utvikling, fremtidige belønninger, partnerskap |

*Fremtidige runder kan øke total forsyning ved behov.*

---

## Bruksområder

### 1. Paper Trading Simulator
- **Startkapital**: Alle får 1,000,000 kr virtuelle penger
- **KLT kan brukes til**:
  - Å låse opp avanserte trading-scenarier
  - Tilgang til "Expert Mode" med mer realistiske markedsforhold
  - Kjøp av virtuelle "power-ups" (f.eks. ekstra analyseverktøy)

### 2. Læringsbelønninger
- **Fullfør kurs**: +500 KLT
- **Bestå quiz**: +1,000 KLT
- **7-dagers streak**: +2,000 KLT
- **Hjelp andre studenter**: +100 KLT per godkjent svar

### 3. Konkurranser
- **Månedlig trading-konkurranse**: Inngangsbillett = 1,000 KLT
- **Premier**: KLT-baserte belønninger + ekte premier

### 4. Staking (fremtidig)
- **Stak KLT** for å få:
  - Tidlig tilgang til nye kurs
  - Prioritert support
  - Stemmerett i kursutvikling

---

## Hvordan få KLT

### Grunnlegger-Runde (NÅ)
- Bli en av de første 100 studentene
- Motta 10,000 KLT ved første innlogging
- Verdi: 1% av total forsyning per person

### Fremtidige måter å tjene KLT
| Aktivitet | Belønning | Maks per dag |
|-----------|-----------|--------------|
| Daglig innlogging | 10 KLT | 10 KLT |
| Fullfør leksjon | 100 KLT | 500 KLT |
| Bestå quiz | 200 KLT | 600 KLT |
| Trading profit (paper) | 1% av profitt i KLT | 1,000 KLT |
| Discord engagement | 5-50 KLT | 200 KLT |
| Bug rapportering | 500-5,000 KLT | - |
| Kursinnhold | 1,000-10,000 KLT | - |

---

## Teknisk implementasjon

### Database Schema
```sql
CREATE TABLE user_klt_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE klt_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'reward', 'spend', 'transfer'
  category VARCHAR(50), -- 'lesson_complete', 'quiz_pass', 'marketplace'
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### API Endpoints
- `GET /api/klt/balance` - Hent brukerens saldo
- `POST /api/klt/spend` - Bruk KLT
- `POST /api/klt/earn` - Tjen KLT (internal)
- `GET /api/klt/transactions` - Transaksjonshistorikk

---

## FAQ

**Q: Kan jeg selge KLT?**  
A: Nei. KLT har ingen pengeverdi og kan ikke overføres utenfor plattformen.

**Q: Hva skjer når jeg bruker opp KLT?**  
A: Du kan tjene mer ved å være aktiv på plattformen, eller kjøpe flere i marketplace (fremtidig funksjon).

**Q: Vil KLT bli en kryptovaluta?**  
A: Vi vurderer blockchain-basert KLT i fremtiden, men dette krever regulatorisk avklaring.

**Q: Hvorfor 1,000,000 totalt?**  
A: Dette gir hver grunnlegger 1% av nettverket - en meningsfull andel for tidlig støtte.

---

## Roadmap

### Fase 1: Beta (NÅ)
- ✅ 100 grunnleggere får 10,000 KLT
- ✅ Basic paper trading integration

### Fase 2: Launch (Mars 2026)
- Earn mechanics aktiveres
- Kurs-belønninger
- Quiz-belønninger

### Fase 3: Ecosystem (Q2 2026)
- Marketplace for KLT
- Staking mekanisme
- Governance (avstemninger)

### Fase 4: Expansion (2027)
- Vurdering av blockchain-migrasjon
- Eventuell ekstern handel (regulert)

---

*Sist oppdatert: 12. februar 2026*
