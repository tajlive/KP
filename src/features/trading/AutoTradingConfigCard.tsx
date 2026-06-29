"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Switch } from "@/shared/ui/switch";
import { Slider } from "@/shared/ui/slider";
import { Button } from "@/shared/ui/button";
import { createClient } from "@/lib/utils";
import { toast } from "sonner";
import { Bot, Shield, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

type RiskLevel = 'low' | 'medium' | 'high';
type Mode = 'paper' | 'live';

interface AutoTradingConfig {
  enabled: boolean;
  mode: Mode;
  risk_level: RiskLevel;
  max_trade_size_nok: number;
}

const RISK_LEVELS: { value: RiskLevel; key: string; color: string }[] = [
  { value: 'low', key: 'low', color: 'text-kp-success' },
  { value: 'medium', key: 'medium', color: 'text-kp-warning' },
  { value: 'high', key: 'high', color: 'text-kp-danger' },
];

export function AutoTradingConfigCard() {
  const t = useTranslations("trading.autoTradingConfig");
  const trading = useTranslations("trading");
  const { format } = useCurrency();
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

      type UserAutoTradingConfig = {
        is_enabled: boolean | null;
        is_paper_trading: boolean | null;
        trading_capital_nok: number | null;
        risk_level: string | null;
      };

      const { data, error } = await supabase
        .from("user_auto_trading_configs")
        .select("is_enabled, is_paper_trading, trading_capital_nok, risk_level")
        .eq("user_id", user.id)
        .maybeSingle()
        .returns<UserAutoTradingConfig>();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching config:", error);
        return;
      }

      if (data) {
        setConfig({
          enabled: data.is_enabled ?? false,
          mode: data.is_paper_trading ? "paper" : "live",
          risk_level: (data.risk_level as RiskLevel) ?? "medium",
          max_trade_size_nok: data.trading_capital_nok ?? 10000,
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
        toast.error(t("loginRequired"));
        return;
      }

      const { data: existingConfig } = await supabase
        .from("user_auto_trading_configs")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingConfig) {
        await supabase
          .from("user_auto_trading_configs")
          .update({
            is_enabled: config.enabled,
            is_paper_trading: config.mode === "paper",
            trading_capital_nok: config.max_trade_size_nok,
            risk_level: config.risk_level,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingConfig.id);
      } else {
        await supabase
          .from("user_auto_trading_configs")
          .insert({
            user_id: user.id,
            is_enabled: config.enabled,
            is_paper_trading: config.mode === "paper",
            trading_capital_nok: config.max_trade_size_nok,
            risk_level: config.risk_level,
          });
      }

      toast.success(t("saveSuccess"));
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(t("saveError"));
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
            {t("title")}
          </CardTitle>
          <CardDescription>{t("loading")}</CardDescription>
        </CardHeader>
        <CardContent className="h-40 animate-pulse bg-kp-bg-tertiary rounded" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("subtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-trading" className="text-base font-medium text-kp-text-primary">
              {t("toggleLabel")}
            </Label>
            <p className="text-sm text-kp-text-secondary">
              {config.enabled ? t("enabledDesc") : t("disabledDesc")}
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
          <Label className="text-sm font-medium text-kp-text-primary">{t("modeLabel")}</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={config.mode === 'paper' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfig({ ...config, mode: 'paper' })}
              className={config.mode === 'paper'
                ? "flex-1 bg-kp-brand hover:bg-kp-brand-hover text-white"
                : "flex-1 bg-kp-bg-tertiary border-kp-border text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary"
              }
            >
              <Shield className="h-4 w-4 mr-2" />
              {trading("paperMode")}
            </Button>
            <Button
              type="button"
              variant={config.mode === 'live' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setConfig({ ...config, mode: 'live' })}
              className={config.mode === 'live'
                ? "flex-1 bg-kp-brand hover:bg-kp-brand-hover text-white"
                : "flex-1 bg-kp-bg-tertiary border-kp-border text-kp-text-secondary hover:bg-kp-bg-hover hover:text-kp-text-primary"
              }
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {trading("liveMode")}
            </Button>
          </div>
          {config.mode === 'paper' ? (
            <p className="text-xs text-kp-text-secondary flex items-start gap-1">
              <Shield className="h-3 w-3 mt-0.5" />
              {t("paperDesc")}
            </p>
          ) : (
            <p className="text-xs text-kp-warning flex items-start gap-1">
              <AlertCircle className="h-3 w-3 mt-0.5" />
              {t("liveDesc")}
            </p>
          )}
        </div>

        {/* Risk Level */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-kp-text-primary">{t("riskLabel")}</Label>
            <span className={cn("text-xs font-medium", currentRiskLevel?.color)}>
              {currentRiskLevel ? t(`riskLevels.${currentRiskLevel.key}.label`) : null}
            </span>
          </div>
          <div className="flex gap-1">
            {RISK_LEVELS.map((risk) => (
              <button
                key={risk.value}
                type="button"
                onClick={() => setConfig({ ...config, risk_level: risk.value })}
                aria-label={t(`riskLevels.${risk.key}.description`)}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all",
                  config.risk_level === risk.value
                    ? risk.value === 'low'
                      ? 'bg-kp-success'
                      : risk.value === 'medium'
                      ? 'bg-kp-warning'
                      : 'bg-kp-danger'
                    : 'bg-kp-bg-tertiary hover:bg-kp-bg-hover'
                )}
                title={t(`riskLevels.${risk.key}.description`)}
              />
            ))}
          </div>
          <p className="text-xs text-kp-text-secondary">
            {currentRiskLevel ? t(`riskLevels.${currentRiskLevel.key}.description`) : null}
          </p>
        </div>

        {/* Max Trade Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-kp-text-primary">{t("maxTradeSize")}</Label>
            <span className="text-sm font-medium text-kp-text-secondary">
              {format(config.max_trade_size_nok)}
            </span>
          </div>
          <Slider
            value={[config.max_trade_size_nok]}
            onValueChange={([value]) => setConfig({ ...config, max_trade_size_nok: value })}
            min={1000}
            max={100000}
            step={1000}
          />
          <div className="flex justify-between text-xs text-kp-text-muted">
            <span>{t("minAmount")}</span>
            <span>{t("maxAmount")}</span>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={saveConfig}
          disabled={saving}
          className="w-full bg-kp-brand hover:bg-kp-brand-hover text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t("saving") : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
