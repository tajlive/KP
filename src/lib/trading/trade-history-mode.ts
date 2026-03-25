export type TradeHistoryModeFilter = "all" | "paper" | "live";

/** DB / legacy: tom eller ukjent modus behandles som lekepenger (samme som rad-etikett). */
export function tradeModeBucket(
  mode: string | null | undefined,
): "paper" | "live" {
  const m = String(mode ?? "")
    .trim()
    .toLowerCase();
  return m === "live" ? "live" : "paper";
}

export function matchesModeFilter(
  mode: string | null | undefined,
  filter: TradeHistoryModeFilter,
): boolean {
  if (filter === "all") return true;
  return tradeModeBucket(mode) === filter;
}
