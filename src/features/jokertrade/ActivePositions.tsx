"use client";

import { SparkleIcon } from "./JokerIcons";

interface Position {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  pnl: number | null;
  created_at: string;
}

interface ActivePositionsProps {
  positions: Position[];
}

function formatNOK(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("no-NO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value >= 0 ? "+" : "-"}${formatted} kr`;
}

export function ActivePositions({ positions }: ActivePositionsProps) {
  if (!positions || positions.length === 0) {
    return (
      <div className="rounded-xl border border-[#2A2D35] bg-[#1A1D26]/80 p-6 backdrop-blur-xl">
        <h2 className="mb-4 font-sans text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Åpne Posisjoner
        </h2>
        <div className="flex flex-col items-center justify-center py-8">
          <SparkleIcon className="mb-2 h-8 w-8 text-[#6B7280]" />
          <p className="font-sans text-sm text-[#6B7280]">
            Ingen åpne posisjoner
          </p>
          <p className="mt-1 font-sans text-xs text-[#6B7280]">
            JokerTrade åpner posisjoner basert på AI-analyse
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#2A2D35] bg-[#1A1D26]/80 p-6 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-widest text-[#9CA3AF]">
          Åpne Posisjoner
        </h2>
        <span className="font-mono text-xs text-[#6B7280]">
          {positions.length} aktiv
        </span>
      </div>

      <div className="space-y-3">
        {positions.map((pos) => {
          const isLong = pos.side === "buy";
          const pnlNum = Number(pos.pnl ?? 0);
          const isProfit = pnlNum >= 0;

          return (
            <div
              key={pos.id}
              className="rounded-lg border border-[#2A2D35] bg-[#15171B] p-4 transition-colors hover:border-[#3B82F6]/30"
            >
              {/* Top row: symbol + side */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-[#F9FAFB]">
                    {pos.symbol}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                      isLong
                        ? "bg-[#064E3B] text-[#10B981]"
                        : "bg-[#7F1D1D] text-[#EF4444]"
                    }`}
                  >
                    {isLong ? (
                      <SparkleIcon className="h-3 w-3" />
                    ) : (
                      <SparkleIcon className="h-3 w-3" />
                    )}
                    {isLong ? "LONG" : "SHORT"}
                  </span>
                </div>
                {/* P&L */}
                <div className="text-right">
                  <p
                    className={`font-mono text-lg font-bold tabular-nums ${
                      isProfit ? "text-[#10B981]" : "text-[#EF4444]"
                    }`}
                  >
                    {formatNOK(pnlNum)}
                  </p>
                </div>
              </div>

              {/* Details row */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-sans text-[#6B7280]">Inngang</p>
                  <p className="font-mono tabular-nums text-[#D1D5DB]">
                    {Number(pos.price).toLocaleString("no-NO", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    kr
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[#6B7280]">Volum</p>
                  <p className="font-mono tabular-nums text-[#D1D5DB]">
                    {Number(pos.quantity).toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
