"use client";

import { Button } from "@/shared/ui/button";

interface SymbolTogglesProps {
  selected: string;
  onSelect: (symbol: string) => void;
  symbols?: string[];
}

const DEFAULT_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

/**
 * Symbol toggle komponenter.
 * Rendrer knapper for å velge trading symbol.
 */
export function SymbolToggles({
  selected,
  onSelect,
  symbols = DEFAULT_SYMBOLS,
}: SymbolTogglesProps) {
  return (
    <div className="flex items-center gap-2" data-testid="symbol-toggles">
      {symbols.map((s) => (
        <Button
          key={s}
          data-testid={`symbol-toggle-${s}`}
          variant={selected === s ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(s)}
        >
          {s.replace("USDT", "")}
        </Button>
      ))}
    </div>
  );
}
