"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Download, Share2, TrendingUp, TrendingDown } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface ShareResultsCardProps {
  symbol: string;
  side: "buy" | "sell";
  pnl: number;
  pnlPercent: number;
  entryPrice: number;
  exitPrice: number;
  displayName?: string;
}

export function ShareResultsCard({
  symbol,
  side,
  pnl,
  pnlPercent,
  entryPrice,
  exitPrice,
  displayName = "Trader",
}: ShareResultsCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  const isProfit = pnl >= 0;

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 340;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createLinearGradient(0, 0, 600, 340);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, isProfit ? "#042f2e" : "#2a0f0f");
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, 600, 340, 20);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "bold 14px system-ui";
    ctx.fillText("KLARPAKKE.NO", 32, 40);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 16px system-ui";
    ctx.fillText(displayName, 32, 72);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "14px system-ui";
    ctx.fillText(
      `${side.toUpperCase()} ${symbol}`,
      32,
      100
    );

    const pnlColor = isProfit ? "#4ade80" : "#f87171";
    ctx.fillStyle = pnlColor;
    ctx.font = "bold 48px system-ui";
    ctx.fillText(
      `${isProfit ? "+" : ""}${pnlPercent.toFixed(2)}%`,
      32,
      168
    );

    ctx.fillStyle = pnlColor;
    ctx.font = "bold 20px system-ui";
    ctx.fillText(
      `${isProfit ? "+" : ""}${pnl.toFixed(2)} USDT`,
      32,
      204
    );

    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui";
    ctx.fillText(`Inngang: $${entryPrice.toLocaleString()}`, 32, 252);
    ctx.fillText(`Utgang: $${exitPrice.toLocaleString()}`, 32, 276);

    ctx.fillStyle = "#475569";
    ctx.font = "12px system-ui";
    ctx.fillText(
      new Date().toLocaleDateString("no-NO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      32,
      316
    );

    return new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/png")
    );
  }, [symbol, side, pnl, pnlPercent, entryPrice, exitPrice, displayName, isProfit]);

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await generateImage();
      if (!blob) return;

      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "trade.png", { type: "image/png" })] })) {
        await navigator.share({
          title: `${isProfit ? "+" : ""}${pnlPercent.toFixed(2)}% på ${symbol}`,
          text: `Sjekk min trade på Klarpakke! ${isProfit ? "+" : ""}${pnlPercent.toFixed(2)}% ${symbol}`,
          files: [new File([blob], "klarpakke-trade.png", { type: "image/png" })],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `klarpakke-${symbol}-trade.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klarpakke-${symbol}-trade.png`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-6 border ${
        isProfit
          ? "bg-linear-to-br from-slate-900 to-emerald-950 border-emerald-800/50"
          : "bg-linear-to-br from-slate-900 to-red-950 border-red-800/50"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          {isProfit ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span>
            {side.toUpperCase()} {symbol}
          </span>
        </div>
        <span className="text-xs text-slate-500">{displayName}</span>
      </div>

      <div
        className={`text-3xl font-black mb-1 ${
          isProfit ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {isProfit ? "+" : ""}
        {pnlPercent.toFixed(2)}%
      </div>
      <div
        className={`text-sm font-semibold mb-4 ${
          isProfit ? "text-emerald-500/80" : "text-red-500/80"
        }`}
      >
        {isProfit ? "+" : ""}
        {pnl.toFixed(2)} USDT
      </div>

      <div className="flex gap-2 text-xs text-slate-500 mb-6">
        <span>Inngang: ${entryPrice.toLocaleString()}</span>
        <span>·</span>
        <span>Utgang: ${exitPrice.toLocaleString()}</span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleShare}
          disabled={sharing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          size="sm"
        >
          <Share2 className="w-4 h-4 mr-1.5" />
          Del
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          className="rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800"
          size="sm"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
