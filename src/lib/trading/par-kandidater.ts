/**
 * Ren par-kandidat-vurdering for utvidelse av Toms live Kraken-grid (Task 3).
 *
 * Trippel-filter for hvilke krypto-par grid-universet skal utvides med:
 * 1. OOS PF >= 1.1        — out-of-sample profit factor fra backtest
 * 2. 24h-range >= 2.5 %   — volatilitet (grid trenger svingninger)
 * 3. ordremin × pris × 1.1 <= 8 USDC — dimensjonerbar med ~9 USDC-nivåer
 *
 * BTC/ETH/SOL (XBT/ETH/SOL i Kraken-verden) er ALLTID med — allerede live,
 * og skal aldri filtreres ut uansett hva målene sier.
 *
 * Ren funksjon: ingen I/O, ingen imports — kun input → output.
 */

export interface ParKandidat {
  /** Kraken-par, f.eks. "ADAUSDC" (BTC = XBT i Kraken-verden) */
  par: string;
  /** Out-of-sample profit factor fra grid-backtesten */
  oosProfitFactor: number;
  /** 24-timers range i prosent (volatilitet) */
  rangePct: number;
  /** Minimumsordre i base-valuta (Kraken, live-verifisert) */
  ordremin: number;
  /** Nåpris i USDC */
  prisUsdc: number;
}

export interface ParVurdering extends ParKandidat {
  /** ordremin omregnet til USDC med sikkerhetsmargin (ordremin × pris × marginFaktor) */
  ordreminUsdc: number;
  /** Sann hvis par-et passerer alle filtre (eller er i alltidMed-listen) */
  godkjent: boolean;
  /** Lesbare avvisningsårsaker på norsk — tom liste når godkjent */
  avvisningsgrunner: string[];
}

export interface ParFilterConfig {
  /** Terskel for OOS profit factor (default 1.1) */
  oosPfTerskel?: number;
  /** Terskel for 24h-range i prosent (default 2.5) */
  rangeTerskelPct?: number;
  /** Øvre tak for ordremin i USDC (default 8) */
  ordreminUsdcMaks?: number;
  /** Sikkerhetsmargin på ordremin-beregningen (default 1.1) */
  marginFaktor?: number;
  /** Par som alltid er med uansett filter (default: de tre live-parene) */
  alltidMed?: string[];
}

const DEFAULT_CONFIG = {
  oosPfTerskel: 1.1,
  rangeTerskelPct: 2.5,
  ordreminUsdcMaks: 8,
  marginFaktor: 1.1,
  alltidMed: ["XBTUSDC", "ETHUSDC", "SOLUSDC"],
} satisfies ParFilterConfig;

export function velgParKandidater(
  kandidater: ParKandidat[],
  config: ParFilterConfig = {},
): ParVurdering[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const alltidMed = new Set(cfg.alltidMed);

  return kandidater.map((k) => {
    const ordreminUsdc = k.ordremin * k.prisUsdc * cfg.marginFaktor;

    // Allerede live — aldri filtrer ut
    if (alltidMed.has(k.par)) {
      return { ...k, ordreminUsdc, godkjent: true, avvisningsgrunner: [] };
    }

    const avvisningsgrunner: string[] = [];
    if (k.oosProfitFactor < cfg.oosPfTerskel) {
      avvisningsgrunner.push(
        `OOS PF ${k.oosProfitFactor.toFixed(2)} er under kravet ${cfg.oosPfTerskel.toFixed(2)}`,
      );
    }
    if (k.rangePct < cfg.rangeTerskelPct) {
      avvisningsgrunner.push(
        `24h-range ${k.rangePct.toFixed(1)} % er under kravet ${cfg.rangeTerskelPct.toFixed(1)} %`,
      );
    }
    if (ordreminUsdc > cfg.ordreminUsdcMaks) {
      avvisningsgrunner.push(
        `ordremin ${ordreminUsdc.toFixed(2)} USDC er over taket ${cfg.ordreminUsdcMaks.toFixed(2)} USDC`,
      );
    }

    return {
      ...k,
      ordreminUsdc,
      godkjent: avvisningsgrunner.length === 0,
      avvisningsgrunner,
    };
  });
}
