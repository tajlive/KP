"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, DollarSign } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface Props {
  symbol: string;
  currentPrice: number;
}

export function PaperTradeButton({ symbol, currentPrice }: Props) {
  const router = useRouter();
  const locale = useLocale();
  const isNo = locale === "no";
  const tReject = useTranslations("tradeHistory.rejectReason");
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [paperSessionId, setPaperSessionId] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      const response = await fetch("/api/paper-trading/balance");
      if (response.ok) {
        const data = (await response.json()) as {
          balance?: { current: number };
          session_id?: string;
        };
        if (data.balance?.current != null) {
          setBalance(data.balance.current);
        }
        setPaperSessionId(
          typeof data.session_id === "string" ? data.session_id : null,
        );
      }
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  const handleOpen = () => {
    fetchBalance();
    setOpen(true);
  };

  const mapRejectionReason = (code: unknown): string | null => {
    if (typeof code !== "string" || !code) return null;
    const known = [
      "NO_RISK_PROFILE",
      "BOT_NOT_HEALTHY",
      "LIVE_NOT_ALLOWED",
      "POSITION_LIMIT_EXCEEDED",
      "EXPOSURE_LIMIT_EXCEEDED",
      "DAILY_LOSS_LIMIT_EXCEEDED",
      "DAILY_LOSS_CHECK_FAILED",
      "PAIR_NOT_ALLOWED",
      "LEVERAGE_NOT_ALLOWED",
      "INSUFFICIENT_BALANCE",
      "SESSION_NOT_ACTIVE",
      "INVALID_TRADING_MODE",
    ];
    if (known.includes(code)) return tReject(code as never);
    return code;
  };

  const executeTrade = async (side: "buy" | "sell") => {
    const qty = parseFloat(quantity);
    if (!qty || qty <= 0) {
      toast.error(
        isNo
          ? "Vennligst angi en gyldig mengde"
          : "Please enter a valid amount",
      );
      return;
    }

    const totalValue = qty * currentPrice;

    if (side === "buy" && balance !== null && totalValue > balance) {
      toast.error(
        isNo
          ? "Ikke nok saldo for denne handelen"
          : "Insufficient balance for this trade",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/paper-trading/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          side,
          quantity: qty,
          price: currentPrice,
          ...(paperSessionId ? { session_id: paperSessionId } : {}),
        } satisfies {
          symbol: string;
          side: "buy" | "sell";
          quantity: number;
          price: number;
          session_id?: string;
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          mapRejectionReason(data?.rejectionReason) ??
            data.error ??
            (isNo ? "Handel feilet" : "Trade failed"),
        );
      }
      if (!data.success) {
        throw new Error(
          mapRejectionReason(data?.rejectionReason) ??
            data.error ??
            (isNo ? "Handel ble avvist" : "Trade was rejected"),
        );
      }

      toast.success(
        `${side === "buy" ? (isNo ? "Kjøpt" : "Bought") : isNo ? "Solgt" : "Sold"} ${qty} ${symbol} ${isNo ? "for kr" : "for NOK"} ${totalValue.toLocaleString(isNo ? "nb-NO" : "en-US", { minimumFractionDigits: 2 })}`,
        {
          description: `${isNo ? "Ny saldo" : "New balance"}: ${isNo ? "kr" : "NOK"} ${data.new_balance.toLocaleString(isNo ? "nb-NO" : "en-US", { minimumFractionDigits: 2 })}`,
        },
      );

      router.refresh();
      setOpen(false);
      setQuantity("");
    } catch (error: unknown) {
      toast.error(
        (error as Error).message ||
          (isNo ? "Kunne ikke utføre handel" : "Could not execute trade"),
      );
    } finally {
      setLoading(false);
    }
  };

  const totalValue = parseFloat(quantity || "0") * currentPrice;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          onClick={handleOpen}
          className="bg-teal-600 hover:bg-teal-700 text-white font-medium"
        >
          {isNo ? "Lekepenger-handel" : "Paper trade"}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-teal-500" />
            {isNo ? "Lekepenger-handel" : "Paper trade"}: {symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price Info */}
          <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
            <span className="text-slate-400">
              {isNo ? "Gjeldende pris" : "Current price"}
            </span>
            <span className="text-xl font-semibold text-white">
              kr{" "}
              {currentPrice.toLocaleString("nb-NO", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          {/* Balance Info */}
          {balance !== null && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">
                {isNo ? "Tilgjengelig saldo" : "Available balance"}
              </span>
              <span className="text-slate-300">
                kr{" "}
                {balance.toLocaleString("nb-NO", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-300">
              {isNo ? "Mengde" : "Quantity"}
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.001"
              min="0"
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          {/* Total Value */}
          {totalValue > 0 && (
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
              <span className="text-slate-400">
                {isNo ? "Total verdi" : "Total value"}
              </span>
              <span className="text-lg font-semibold text-white">
                kr{" "}
                {totalValue.toLocaleString("nb-NO", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          )}

          {/* Buy/Sell Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => executeTrade("buy")}
              disabled={loading || !quantity || totalValue <= 0}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4 mr-2" />
              {loading
                ? isNo
                  ? "Kjøper..."
                  : "Buying..."
                : isNo
                  ? "Kjøp"
                  : "Buy"}
            </Button>
            <Button
              onClick={() => executeTrade("sell")}
              disabled={loading || !quantity || totalValue <= 0}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowDown className="w-4 h-4 mr-2" />
              {loading
                ? isNo
                  ? "Selger..."
                  : "Selling..."
                : isNo
                  ? "Selg"
                  : "Sell"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
