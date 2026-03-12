"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

export function AutoTradingToggle() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [mode, setMode] = useState<'paper' | 'live'>('paper');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const t = useTranslations('autoTrading');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("auto_trading_configs" as any)
        .select("enabled, mode")
        .eq("user_id" as any, user.id)
        .single() as any;

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching config:", error);
        return;
      }

      if (data) {
        setIsEnabled(data.enabled);
        setMode(data.mode);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    setIsEnabled(checked);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Du må være logget inn");
        return;
      }

      // Check if config exists first
      const { data: existingConfig } = await supabase
        .from("auto_trading_configs" as any)
        .select("id")
        .eq("user_id" as any, user.id)
        .single() as any;

      if (existingConfig) {
        const { error } = await supabase
          .from("auto_trading_configs" as any)
          .update({ enabled: checked, updated_at: new Date().toISOString() })
          .eq("user_id" as any, user.id);

        if (error) throw error;
      } else {
        // Create default config if not exists
        const { error } = await supabase
          .from("auto_trading_configs" as any)
          .insert({
            user_id: user.id,
            enabled: checked,
            risk_level: 'medium',
            mode: 'paper',
            max_trade_size_nok: 10000,
          });
        if (error) throw error;
      }

      toast.success(
        checked 
          ? `Auto-trading aktivert (${mode === 'paper' ? 'paper' : 'live'})! 🚀` 
          : "Auto-trading pauset ⏸️",
      );
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Kunne ikke oppdatere status");
      setIsEnabled(!checked);
    }
  };

  if (loading) {
    return <div className="h-6 w-12 bg-gray-200 animate-pulse rounded-full" />;
  }

  return (
    <div className="flex items-center space-x-2">
      <Switch
        id="auto-trading-mode"
        checked={isEnabled}
        onCheckedChange={handleToggle}
      />
      <Label htmlFor="auto-trading-mode" className="text-sm font-medium">
        {isEnabled 
          ? `Auto-Trading PÅ (${mode === 'paper' ? 'Paper' : 'Live'})` 
          : "Auto-Trading AV"}
      </Label>
    </div>
  );
}
