"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AutoTradingToggle() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("user_auto_trading_configs")
        .select("is_enabled")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching config:", error);
        return;
      }

      if (data) {
        setIsEnabled(data.is_enabled);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Du må være logget inn");
        return;
      }

      // Check if config exists first
      const { data: existingConfig } = await supabase
        .from("user_auto_trading_configs")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingConfig) {
        const { error } = await supabase
          .from("user_auto_trading_configs")
          .update({ is_enabled: checked, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Create default config if not exists
        const { error } = await supabase
          .from("user_auto_trading_configs")
          .insert({
            user_id: user.id,
            is_enabled: checked,
            risk_level: "conservative", // Default
            is_paper_trading: true,
          });
        if (error) throw error;
      }

      toast.success(
        checked ? "Auto-trading er aktivert! 🚀" : "Auto-trading er pauset ⏸️",
      );
    } catch (error) {
      console.error("Error updating config:", error);
      toast.error("Kunne ikke oppdatere status");
      setIsEnabled(!checked); // Revert UI
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
        {isEnabled ? "Auto-Trading PÅ" : "Auto-Trading AV"}
      </Label>
    </div>
  );
}
