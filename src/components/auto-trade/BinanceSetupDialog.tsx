"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield } from "lucide-react";
import { useState } from "react";

interface BinanceSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (keys: {
    apiKey: string;
    apiSecret: string;
    isTestnet: boolean;
  }) => Promise<void>;
}

export function BinanceSetupDialog({
  open,
  onOpenChange,
  onSave,
}: BinanceSetupDialogProps) {
  const [keys, setKeys] = useState({
    apiKey: "",
    apiSecret: "",
    isTestnet: true,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Binance API-konfigurasjon</DialogTitle>
          <DialogDescription>
            Legg til dine API-nøkler for å aktivere live trading. Nøklene
            krypteres før de lagres.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              placeholder="Din Binance API Key"
              value={keys.apiKey}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, apiKey: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiSecret">API Secret</Label>
            <Input
              id="apiSecret"
              type="password"
              placeholder="Din Binance API Secret"
              value={keys.apiSecret}
              onChange={(e) =>
                setKeys((prev) => ({ ...prev, apiSecret: e.target.value }))
              }
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <div className="text-sm">
                <p className="font-medium">Test Mode (Testnet)</p>
                <p className="text-xs text-muted-foreground">
                  Bruk simulerte penger på Binance
                </p>
              </div>
            </div>
            <Switch
              checked={keys.isTestnet}
              onCheckedChange={(checked) =>
                setKeys((prev) => ({ ...prev, isTestnet: checked }))
              }
            />
          </div>
          <Button
            onClick={() => onSave(keys)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Lagre API-nøkler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
