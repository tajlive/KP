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

      // Schema has is_enabled/strategy, not enabled/mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("auto_trading_configs").select("is_enabled, strategy").eq("user_id", user.id).single();

      if (error && (error as { code?: string }).code !== "PGRST116") {
        console.error("Error fetching config:", error);
        return;
      }

      const row = data as { is_enabled?: boolean; strategy?: string } | null;
      if (row) {
        setIsEnabled(row.is_enabled ?? false);
        setMode((row.strategy === "live" ? "live" : "paper") as "paper" | "live");
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
        .from("auto_trading_configs")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingConfig) {
        const { error } = await supabase
          .from("auto_trading_configs")
          .update({ is_enabled: checked, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("auto_trading_configs")
          .insert({
            user_id: user.id,
            is_enabled: checked,
            strategy: "paper",
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
