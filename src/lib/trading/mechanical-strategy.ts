/**
 * Mekanisk-strategi-sjekk (2026-09-03).
 *
 * Grid/simple_grid/DCA/max_aggressive er MEKANISKE strategier: nivå-ordre og
 * tidsbaserte kjøp med EGEN gevinst-/tapshåndtering (grid +2%/nivå, DCA
 * akkumulering, simple_grid DD-gate, max_aggressive kill_switch).
 * Kelly-expectancy beregnet fra historiske trades er irrelevant for dem —
 * den er ment for spekulative strategier (trend/multi/AI).
 *
 * Før 2026-09-03 ble dette sjekket via reason-strenger ("Grid buy"/"DCA buy")
 * i 5 kopierte uttrykk. Det var skjørt: DCA-strategien produserte buy UTEN
 * reason → unntaket slo aldri inn → alle DCA-kjøp blokkert for alltid
 * (E=-1.9% fra gamle tapende trades; prod: 692 blokkeringer / 7 dager).
 *
 * Riktig fiks: match på ENGINE-KEY (samme mapping tick-engine bruker via
 * resolveTickStrategyEngineKey), ikke på reason-tekst.
 */
export function isMechanicalStrategy(
  engineKey: string | undefined | null,
): boolean {
  return (
    engineKey === "grid" ||
    engineKey === "simple_grid" ||
    engineKey === "dca" ||
    engineKey === "max_aggressive"
  );
}
