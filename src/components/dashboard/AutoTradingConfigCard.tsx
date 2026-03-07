"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/utils";
import { toast } from "sonner";
import { Bot, Shield, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type RiskLevel = 'low' | 'medium' | 'high';
type Mode = 'paper' | 'live';

interface AutoTradingConfig {
  enabled: boolean;
  mode: Mode;
  risk_level: RiskLevel;
  max_trade_size_nok: number;
}

const RISK_LEVELS: { value: RiskLevel; label: string; description: string; color: string }[] = [
  { value: 'low', label: 'Konservativ', description: 'Minimerer risiko, lavere avkastning', color: 'text-green-600' },
  { value: 'medium', label: 'Balansert', description: 'Middels risiko og avkastning', color: 'text-yellow-600' },
  { value: 'high', label: 'Aggressiv', description: 'Høyere risiko, potensielt høyere avkastning', color: 'text-red-600' },
];

export function AutoTradingConfigCard() {
  const [config, setConfig] = useState<AutoTradingConfig>({
    enabled: false,
    mode: 'paper',
    risk_level: 'medium',
    max_trade_size_nok: 10000,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("auto_trading_configs")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching config:", error);
        return;
      }

      if (data) {
        setConfig({
          enabled: data.enabled,
          mode: data.mode,
          risk_level: data.risk_level,
          max_trade_size_nok: data.max_trade_size_nok,
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Du må være logget inn");
        return;
      }

      const { data: existingConfig } = await supabase
        .from("auto_trading_configs")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingConfig) {
        await supabase
          .from("auto_trading_configs")
          .update({
            ...config,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("auto_trading_configs")
          .insert({
            user_id: user.id,
            ...config,
          });
      }

      toast.success("Innstillinger lagret!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Kunne ikke lagre innstillinger");
    } finally {
      setSaving(false);
    }
  };

  const currentRiskLevel = RISK_LEVELS.find(r => r.value === config.risk_level);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Auto-Trading
          </CardTitle>
          <CardDescription>Laster...</CardDescription>
        </CardHeader>
        <CardContent className="h-40 animate-pulse bg-gray-100 rounded" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Auto-Trading
        </CardTitle>
        <CardDescription>
          La AI handle på dine vegne basert på markedsanalyse
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-trading" className="text-base font-medium">
              Auto-Trading
            </Label>
            <p className="text-sm text-muted-foreground">
              {config.enabled ? 'Aktivert - AI handler automatisk' : 'Deaktivert - Manuell handel'}
            </p>
          </div>
          <Switch
            id="auto-trading"
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {/* Mode Toggle */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Handelsmodus</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={config.mode === 'paper' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfig({ ...config, mode: 'paper' })}
              className="flex-1"
            >
              <Shield className="h-4 w-4 mr-2" />
              Paper Trading
            </Button>
            <Button
              type="button"
              variant={config.mode === 'live' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfig({ ...config, mode: 'live' })}
              className="flex-1"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Live Trading
            </Button>
          </div>
          {config.mode === 'paper' ? (
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <Shield className="h-3 w-3 mt-0.5" />
              Paper trading bruker simulerte penger. Ingen ekte tap.
            </p>
          ) : (
            <p className="text-xs text-amber-600 flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5" />
              Live trading bruker ekte penger. Start med paper trading først!
            </p>
          )}
        </div>

        {/* Risk Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Risikonivå</Label>
            <span className={cn("text-xs font-medium", currentRiskLevel?.color)}>
              {currentRiskLevel?.label}
            </span>
          </div>
          <div className="flex gap-1">
            {RISK_LEVELS.map((risk) => (
              <button
                key={risk.value}
                onClick={() => setConfig({ ...config, risk_level: risk.value })}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all",
                  config.risk_level === risk.value
                    ? risk.value === 'low' 
                      ? 'bg-green-500' 
                      : risk.value === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                    : 'bg-gray-200 hover:bg-gray-300'
                )}
                title={risk.description}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {currentRiskLevel?.description}
          </p>
        </div>

        {/* Max Trade Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Maks handelsstørrelse</Label>
            <span className="text-sm font-medium">
              {config.max_trade_size_nok.toLocaleString('nb-NO')} NOK
            </span>
          </div>
          <Slider
            value={[config.max_trade_size_nok]}
            onValueChange={([value]) => setConfig({ ...config, max_trade_size_nok: value })}
            min={1000}
            max={100000}
            step={1000}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 000 NOK</span>
            <span>100 000 NOK</span>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={saveConfig} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Lagrer...' : 'Lagre innstillinger'}
        </Button>
      </CardContent>
    </Card>
  );
}
