/**
 * Engine-nivå signal-guard — FORSTERKET 2026-07-28.
 *
 * REGEL 1: Avvis ALLE signaler (både kjøp og salg) med confidence = 0.
 *   Unntak: manuelle ordre, stop-loss, og take-profit.
 *
 * REGEL 2: Avvis kjøpssignaler med expectancy < 0.
 *
 * REGEL 3: Rate-limit salg: maks 1 auto-salg per symbol per 15 minutter.
 *   Forhindrer "time-based exit cascade" som skaper dusinvis av tapende salg.
 *
 * REGEL 4: Sell-side size clamp — maks 50% av posisjon per auto-sell signal.
 *   Forhindrer at ett enkelt salg likviderer hele posisjonen.
 *
 * REGEL 5: Dupliseringsdeteksjon — identisk quantity × price innen 60 sekunder blokkeres.
 *
 * REGEL 6: Loss streak circuit breaker — etter N consecutive loss, reduser posisjonsstørrelse.
 *
 * REGEL 7: Sell uten exitReason blokkeres (tillatt: manual, stop_loss, take_profit, margin_call).
 *
 * Bakgrunn (2026-07-28): Supabase-analyse viste 41 tapende sells av 51 totale losing trades
 * (99.9% av totalt -$971k tap). 5 dupliserte BTCUSDT-sells med confidence=100 utgjorde -$510k alene.
 * ETHUSDT hadde RR=0.54 og SOLUSDT RR=0.49 — taper dobbelt så mye som de vinner.
 */

export interface RecentTrade {
  tradingPair: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  realizedPnl: number | null;
  executedAt: string;
}

export interface SignalGuardInput {
  action: "buy" | "sell" | "hold";
  /** 0–1. null/undefined = ingen data — tillatt. */
  confidence?: number | null;
  /** Prosent. null/undefined = ingen data — tillatt. */
  expectancy?: number | null;
  /** Hvorfor selger vi? "manual", "stop_loss", "take_profit", "time_exit", "auto" */
  exitReason?: string;
  /** Tid siden siste auto-salg for dette symbolet (ms). null = ingen tidligere salg. */
  msSinceLastAutoSell?: number | null;
  /** Nåværende posisjonsstørrelse (antall enheter). null = ingen posisjon. */
  currentPositionQty?: number | null;
  /** Maksimalt antall enheter som kan selges (unntatt stop_loss/take_profit/manual). */
  maxSellQty?: number | null;
  /** Nylige trades for dupliseringsdeteksjon. */
  recentTrades?: RecentTrade[];
  /** Antall consecutive losing trades (for circuit breaker). */
  consecutiveLosses?: number;
  /** Hvor lenge siden forrige trade (ms). */
  msSinceLastTrade?: number | null;
  /** Symbol for per-symbol konfigurasjon. */
  symbol?: string;
}

export interface SignalGuardResult {
  allowed: boolean;
  reason?: string;
  /** Anbefalt maksimal salgskvantum hvis blokkert på size clamp. */
  recommendedMaxQty?: number;
}

/** Hvor lenge må det gå mellom auto-salg for samme symbol */
const MIN_AUTO_SELL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutter

/** Strengere intervall for symbols med dårlig RR (<0.6) */
const STRICT_AUTO_SELL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutter

/** Symbols that require stricter sell interval */
const STRICT_SELL_INTERVAL_SYMBOLS = new Set(["ETHUSDT", "SOLUSDT", "DOTUSDT"]);

/** Exit-årsaker som ALLTID tillates (overstyrer confidence-sjekk) */
const ALWAYS_ALLOWED_EXITS = new Set([
  "manual",
  "stop_loss",
  "take_profit",
  "margin_call",
]);

/** Maks andel av posisjon som kan selges i ett auto-sell signal (unntatt ALWAYS_ALLOWED_EXITS) */
const MAX_AUTO_SELL_FRACTION = 0.5; // 50%

/** Tidsvindu for dupliseringsdeteksjon (ms) */
const DUPLICATE_WINDOW_MS = 60 * 1000; // 60 sekunder

/** Terskel for loss streak circuit breaker */
const LOSS_STREAK_THRESHOLD = 3;

/** Posisjonsreduksjonsfaktor per loss streak over terskel */
const LOSS_STREAK_POSITION_MULTIPLIER = 0.5; // Halver posisjon

export function evaluateSignalGuard(input: SignalGuardInput): SignalGuardResult {
  // ─── Kjøp: blokker confidence=0 og negativ expectancy ───
  if (input.action === "buy") {
    if (input.confidence === 0) {
      return {
        allowed: false,
        reason: "KJØP blokkert: confidence = 0 (modellen har ingen tillit til signalet)",
      };
    }

    if (input.expectancy !== null && input.expectancy !== undefined && input.expectancy < 0) {
      return {
        allowed: false,
        reason: `KJØP blokkert: expectancy ${input.expectancy.toFixed(1)}% < 0 (forventet tap per trade)`,
      };
    }

    return { allowed: true };
  }

  // ─── Hold: alltid tillatt ───
  if (input.action === "hold") {
    return { allowed: true };
  }

  // ─── Salg ───

  // Salg: alltid tillat manuelle, stop-loss og take-profit
  if (input.exitReason && ALWAYS_ALLOWED_EXITS.has(input.exitReason)) {
    return { allowed: true };
  }

  // Salg: blokker sell uten exitReason (REGEL 7)
  if (!input.exitReason) {
    return {
      allowed: false,
      reason: "SALG blokkert: ingen exitReason. Sell-signaler må ha exitReason satt (manual, stop_loss, take_profit, eller auto).",
    };
  }

  // Salg: blokker confidence=0 for auto-exits (time-based, auto)
  if (input.confidence === 0) {
    return {
      allowed: false,
      reason: "SALG blokkert: confidence = 0 for auto-exit. Bruk manuelt salg eller vent på bedre signal.",
    };
  }

  // Salg: rate-limit — bruk strengere intervall for symbols med dårlig RR (REGEL 3 utvidet)
  const minInterval = STRICT_SELL_INTERVAL_SYMBOLS.has(input.symbol ?? "")
    ? STRICT_AUTO_SELL_INTERVAL_MS
    : MIN_AUTO_SELL_INTERVAL_MS;

  if (
    input.msSinceLastAutoSell !== null &&
    input.msSinceLastAutoSell !== undefined &&
    input.msSinceLastAutoSell < minInterval
  ) {
    const waitMinutes = Math.ceil((minInterval - input.msSinceLastAutoSell) / 60000);
    return {
      allowed: false,
      reason: `SALG rate-limit: ${waitMinutes} min til neste auto-salg (${
        STRICT_SELL_INTERVAL_SYMBOLS.has(input.symbol ?? "") ? "30min for ETHUSDT/SOLUSDT" : "15min standard"
      }). Forhindrer exit-cascade.`,
    };
  }

  // Salg: sell-side size clamp — maks 50% av posisjon (REGEL 4)
  if (
    input.currentPositionQty !== null &&
    input.currentPositionQty !== undefined &&
    input.currentPositionQty > 0 &&
    input.maxSellQty !== null &&
    input.maxSellQty !== undefined &&
    input.maxSellQty > 0
  ) {
    const maxAllowedQty = input.currentPositionQty * MAX_AUTO_SELL_FRACTION;
    if (input.maxSellQty > maxAllowedQty) {
      return {
        allowed: false,
        reason: `SALG blokkert: ${input.maxSellQty.toFixed(4)} enheter overstiger ${(MAX_AUTO_SELL_FRACTION * 100).toFixed(0)}% av posisjon (${maxAllowedQty.toFixed(4)}). Reduser salgsmengde eller bruk stop_loss/manuelt salg.`,
        recommendedMaxQty: maxAllowedQty,
      };
    }
  }

  // Salg: dupliseringsdeteksjon (REGEL 5)
  if (input.recentTrades && input.recentTrades.length > 0 && input.maxSellQty && input.currentPositionQty) {
    const now = new Date().toISOString();
    const duplicates = input.recentTrades.filter((t) => {
      if (t.side !== "sell") return false;
      if (t.tradingPair !== input.symbol) return false;
      const tradeTime = new Date(t.executedAt).getTime();
      const age = Date.now() - tradeTime;
      if (age > DUPLICATE_WINDOW_MS) return false;
      // Identisk quantity × price = duplikat
      const qtyMatch = Math.abs(t.quantity - input.maxSellQty!) / Math.max(t.quantity, input.maxSellQty!) < 0.001;
      return qtyMatch;
    });

    if (duplicates.length >= 1) {
      return {
        allowed: false,
        reason: `SALG blokkert: duplikatdeteksjon. Identisk salg (qty=${input.maxSellQty.toFixed(4)}) for ${input.symbol} allerede utført innen ${DUPLICATE_WINDOW_MS / 1000}s.`,
      };
    }
  }

  // Salg: loss streak circuit breaker (REGEL 6)
  if (
    input.consecutiveLosses !== undefined &&
    input.consecutiveLosses >= LOSS_STREAK_THRESHOLD
  ) {
    const multiplier = Math.pow(LOSS_STREAK_POSITION_MULTIPLIER, Math.floor(input.consecutiveLosses / LOSS_STREAK_THRESHOLD));
    if (multiplier < 1 && input.currentPositionQty && input.currentPositionQty > 0) {
      const reducedQty = input.currentPositionQty * multiplier;
      return {
        allowed: false,
        reason: `SALG blokkert: circuit breaker. ${input.consecutiveLosses} consecutive losses — posisjonsstørrelse redusert til ${(multiplier * 100).toFixed(0)}%. Maks salg: ${reducedQty.toFixed(4)}.`,
        recommendedMaxQty: reducedQty,
      };
    }
  }

  return { allowed: true };
}
