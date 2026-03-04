# Auto Trade — Implementasjonsplan

**Versjon:** 1.0.0  
**Opprettet:** 2026-02-20  
**Kilde til sannhet:** Dette dokumentet er autoritativ kilde for all auto trade-tilgang og logikk.

> ⚠️ Klarpakke er en utdanningsplattform for krypto. Brukere handler under eget ansvar. Klarpakke gir ikke finansråd og har ingen tilknytning til Finanstilsynet.

---

## Hva er Auto Trade?

En auto trade er én aktiv trading-strategi/bot som kjører kontinuerlig — den overvåker markedet og åpner/lukker posisjoner automatisk etter brukerens definerte regler. Antall auto trades = antall slike strategier du kan kjøre *samtidig*.

- **Paper Trading** = Simulerte penger, identisk brukergrensesnitt, ingen Binance API-nøkkel nødvendig
- **Live Trading** = Kobles til Binance API og handler med ekte midler

---

## Tilgangstabell per tier

| Tier | Pris | Paper Auto Trade | Live Auto Trade | Antall strategier totalt | Maks posisjoner/strategi | Coin-utvalg |
|------|------|:---:|:---:|:---:|:---:|:---:|
| 🎓 **Student** | 0 kr | ✅ | ❌ | **1 (kun paper)** | 1 | Topp 10 |
| 📘 **Bachelor** | 249 kr/mnd | ✅ | ✅ | **1** | 3 | Topp 20 |
| 🎓 **Master** | 499 kr/mnd | ✅ | ✅ | **3** | 7 | Topp 100 |
| 🔥 **Professor** | 1 249 kr/mnd | ✅ | ✅ | **Ubegrenset** | Ubegrenset | Alle + Futures |

### Viktige regler
- Student kan ALDRI opprette live auto trade — alltid vis oppgraderingsmodal
- Antall strategier teller paper + live kombinert (Bachelor = 1 total, ikke 1 paper + 1 live)
- Professor med Futures auto trade krever bestått Futures-quiz (85% score)

---

## Database-endringer

### Tillegg til subscription_tiers-tabell

```sql
-- Legg til auto trade-kolonner
ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS
  auto_trade_limit INTEGER DEFAULT 0;
  -- -1 = ubegrenset (Professor)
  -- 0  = ingen tilgang
  -- 1  = Student (paper only) / Bachelor
  -- 3  = Master

ALTER TABLE subscription_tiers ADD COLUMN IF NOT EXISTS
  live_trading_enabled BOOLEAN DEFAULT FALSE;

-- Oppdater verdier per tier
UPDATE subscription_tiers SET
  auto_trade_limit = 1,
  live_trading_enabled = FALSE
WHERE tier_name = 'student';

UPDATE subscription_tiers SET
  auto_trade_limit = 1,
  live_trading_enabled = TRUE
WHERE tier_name = 'bachelor';

UPDATE subscription_tiers SET
  auto_trade_limit = 3,
  live_trading_enabled = TRUE
WHERE tier_name = 'master';

UPDATE subscription_tiers SET
  auto_trade_limit = -1,
  live_trading_enabled = TRUE
WHERE tier_name = 'professor';
```

### Auto trades-tabell (ny)

```sql
CREATE TABLE IF NOT EXISTS auto_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('paper', 'live')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped')),
  strategy JSONB NOT NULL DEFAULT '{}',
  coin_pair TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE auto_trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Brukere kan kun se egne auto trades"
  ON auto_trades FOR ALL
  USING (auth.uid() = user_id);
```

---

## Edge Function: get-entitlements (oppdatering)

```typescript
// Legg til i get-entitlements response
const autoTradeCount = await supabase
  .from('auto_trades')
  .select('id', { count: 'exact' })
  .eq('user_id', user.id)
  .eq('status', 'active');

return {
  subscription: {
    tier: tierName, // 'student' | 'bachelor' | 'master' | 'professor'
    auto_trade_limit: tierConfig.auto_trade_limit, // 1, 3, -1
    live_trading_enabled: tierConfig.live_trading_enabled,
    active_auto_trades: autoTradeCount.count ?? 0,
    can_create_auto_trade: tierConfig.auto_trade_limit === -1 
      || (autoTradeCount.count ?? 0) < tierConfig.auto_trade_limit,
  },
  // ...resten av entitlements
};
```

---

## Frontend-logikk

### Opprett Auto Trade — valideringsflyt

```typescript
export async function validateAutoTradeCreation(
  entitlements: Entitlements,
  requestedMode: 'paper' | 'live'
): Promise<{ allowed: boolean; reason?: string }> {
  
  const { tier, live_trading_enabled, can_create_auto_trade } = entitlements.subscription;

  // Regel 1: Student kan aldri live auto trade
  if (requestedMode === 'live' && !live_trading_enabled) {
    return {
      allowed: false,
      reason: `Live Auto Trade krever Bachelor eller høyere. Du er på ${tier}.`
    };
  }

  // Regel 2: Sjekk antallsgrense
  if (!can_create_auto_trade) {
    const limit = entitlements.subscription.auto_trade_limit;
    return {
      allowed: false,
      reason: `Du har nådd grensen på ${limit} aktiv(e) strategi(er) for ${tier}-tier.`
    };
  }

  // Regel 3: Professor + Futures krever quiz
  if (tier === 'professor' && requestedMode === 'live') {
    const futuresPairs = ['BTCUSDT_PERP', /* ... */];
    // Sjekk om valgt par er futures — hvis ja, krev quiz
  }

  return { allowed: true };
}
```

### UI-visning i dashbordet

```typescript
// Vis antall brukte / tilgjengelige strategier
const { active_auto_trades, auto_trade_limit, live_trading_enabled } = entitlements.subscription;

const limitDisplay = auto_trade_limit === -1 ? '∞' : auto_trade_limit;
console.log(`Auto Trade: ${active_auto_trades} / ${limitDisplay} aktive strategier`);

// Student: vis låse-ikon på live trading
if (!live_trading_enabled) {
  showLiveTradingLockBadge('Oppgrader til Bachelor for live auto trade');
}
```

---

## Oppgraderingsmodaler

### Student prøver live auto trade
```
🔒 Live Auto Trade er ikke tilgjengelig på Student-planen

"Du kan kjøre én paper trading-strategi gratis.
 For å handle med ekte midler, oppgrader til Bachelor (249 kr/mnd)"

[Prøv Paper Trading]    [Oppgrader til Bachelor →]
```

### Bachelor/Master nådd grense
```
⚡ Du har nådd grensen din

"Du kjører allerede 1 aktiv strategi (Bachelor-grense).
 Oppgrader til Master for å kjøre 3 strategier samtidig."

[Se aktive strategier]    [Oppgrader til Master →]
```

---

## Testscenarier

| Scenario | Forventet resultat |
|----------|-------------------|
| Student oppretter paper auto trade (1. gang) | ✅ Tillatt |
| Student oppretter paper auto trade (2. gang) | ❌ Blokkert — vis oppgraderingsmodal |
| Student oppretter live auto trade | ❌ Blokkert — vis "Krever Bachelor" |
| Bachelor oppretter live auto trade (1. gang) | ✅ Tillatt |
| Bachelor oppretter paper auto trade (har allerede 1 aktiv) | ❌ Blokkert — vis "Nådd grense" |
| Master oppretter 3 strategier | ✅ Tillatt |
| Master oppretter 4. strategi | ❌ Blokkert — vis "Oppgrader til Professor" |
| Professor oppretter ubegrenset | ✅ Alltid tillatt |
| Professor oppretter Futures auto trade uten quiz | ❌ Blokkert — vis quiz-gate |

---

## Relatert dokumentasjon

- [PRICING.md](./PRICING.md) — Full prisoversikt
- [PAYWALL.md](./PAYWALL.md) — Paywall-implementasjon
- [PAPER-TRADING.md](./PAPER-TRADING.md) — Paper trading detaljer
- [AUTO-TRADING-USER-PROTECTION.md](./AUTO-TRADING-USER-PROTECTION.md) — Brukerbeskyttelse
- [REAL-TRADING-SETUP.md](./REAL-TRADING-SETUP.md) — Live trading oppsett
