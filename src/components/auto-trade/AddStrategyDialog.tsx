"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface AddStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (strategy: unknown) => Promise<void>;
  tier: unknown;
  trialStatus: unknown;
}

const STRATEGY_TYPES = [
  {
    id: "dca_trygg",
    name: "DCA Trygg",
    description: "Ukentlig dollar-cost averaging",
    risk: "low",
  },
  {
    id: "trend_balansert",
    name: "Trend Balansert",
    description: "MA-crossover med RSI-filter",
    risk: "medium",
  },
  {
    id: "multisignal_aktiv",
    name: "Multi-Signal Aktiv",
    description: "RSI + momentum på 4h",
    risk: "medium",
  },
  {
    id: "grid_bot",
    name: "Grid Bot",
    description: "Automatisk grid trading",
    risk: "medium",
  },
  {
    id: "ai_copy",
    name: "AI Copy",
    description: "Kopier AI-genererte signaler",
    risk: "high",
  },
];

const SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
];

export function AddStrategyDialog({
  open,
  onOpenChange,
  onCreate,
  tier,
  trialStatus,
}: AddStrategyDialogProps) {
  const [newStrategy, setNewStrategy] = useState({
    strategy_type: "dca_trygg",
    trading_mode: "paper" as "paper" | "live",
    symbol: "BTCUSDT",
    capital_allocation: 100,
  });

  const handleCreate = async () => {
    await onCreate(newStrategy);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Opprett Ny Strategi</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Strategi Type</Label>
            <Select
              value={newStrategy.strategy_type}
              onValueChange={(value) =>
                setNewStrategy((prev) => ({ ...prev, strategy_type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STRATEGY_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} - {type.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Trading Mode</Label>
            <Select
              value={newStrategy.trading_mode}
              onValueChange={(value: "paper" | "live") =>
                setNewStrategy((prev) => ({ ...prev, trading_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">
                  📝 Paper Trading (Simulert)
                </SelectItem>
                <SelectItem
                  value="live"
                  disabled={
                    !(tier as any).liveTrading &&
                    !(trialStatus as any)?.canUseLiveTrading
                  }
                >
                  🟢 Live Trading{" "}
                  {!(tier as any).liveTrading &&
                  !(trialStatus as any)?.canUseLiveTrading
                    ? "(Låst)"
                    : ""}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Symbol</Label>
            <Select
              value={newStrategy.symbol}
              onValueChange={(value) =>
                setNewStrategy((prev) => ({ ...prev, symbol: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Kapital (USDT)</Label>
            <Input
              type="number"
              min="10"
              step="10"
              value={newStrategy.capital_allocation}
              onChange={(e) =>
                setNewStrategy((prev) => ({
                  ...prev,
                  capital_allocation: Number(e.target.value),
                }))
              }
            />
          </div>

          <Button
            onClick={handleCreate}
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white"
          >
            Opprett Strategi
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
