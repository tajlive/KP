/**
 * Money Data Health — vurderer om et pengetall kan verifiseres.
 *
 * P0-guardrail (2026-08-12, Tom-godkjenning punkt 1):
 * «Innfør reversible UI-guardrails som skjuler eller merker live- og
 * paperverdier, P&L, prosent og AI-råd når datakilde, valuta, baseline
 * eller dataalder ikke kan verifiseres.»
 *
 * Brukes av MoneyDataBadge for å vise «ukjent/stale»-varsler. Ren funksjon
 * uten JSX — enkel å teste.
 */

export type DataSourceStatus = "verified" | "stale" | "unknown";

export interface MoneyDataHealthInput {
  /** Kildenavn, f.eks. "paper_accounts", "OKX live", "trading_sessions" */
  source: string | null | undefined;
  /** ISO-timestamp for når dataen sist ble oppdatert */
  updatedAt: string | null | undefined;
  /** Valuta som tallet vises i */
  currency: string | null | undefined;
  /** Tallet i seg selv (null = mangler) */
  value: number | null | undefined;
}

const MAX_AGE_MS: Record<string, number> = {
  paper_accounts: 6 * 60 * 1000, // 6 min — syncPaperAccountBalance kjører hvert 5. min
  "trading_sessions": 10 * 60 * 1000, // 10 min — tick-cron hvert 5. min
  "OKX live": 2 * 60 * 1000, // 2 min — live API
  coin_prices: 10 * 60 * 1000, // 10 min — sync-prices hvert 5. min
};

/** Kilde som vet vi IKKE kan stole på i dag (Kraken-nøkkel død). */
const UNTRUSTED_SOURCES = new Set([
  "kraken_live_state",
  "Kraken",
  "kraken",
]);

export function assessMoneyDataHealth(
  input: MoneyDataHealthInput,
): DataSourceStatus {
  // 1. Ukjent kilde → unknown
  if (!input.source) return "unknown";

  // 2. Kjent upålitelig kilde → unknown
  if (UNTRUSTED_SOURCES.has(input.source)) return "unknown";

  // 3. Verdien mangler → unknown
  if (input.value == null) return "unknown";

  // 4. Valuta mangler → unknown
  if (!input.currency) return "unknown";

  // 5. Dataalder: kjent maks-alder for kilden
  if (input.updatedAt) {
    const maxAge = MAX_AGE_MS[input.source];
    if (maxAge != null) {
      const ageMs = Date.now() - new Date(input.updatedAt).getTime();
      if (Number.isFinite(ageMs) && ageMs > maxAge) return "stale";
    }
  }

  return "verified";
}
