"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/utils";
import { 
  Bell, 
  BellOff, 
  Loader2, 
  Mail, 
  Smartphone,
  Info
} from "lucide-react";
import { Switch } from "@/shared/ui/switch";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { toast } from "sonner";

interface NotificationPrefs {
  email_trades: boolean;
  email_news: boolean;
  push_trades: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_trades: true,
  email_news: false,
  push_trades: true,
};

export function NotificationsTab() {
  const supabase = createClient();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [masterToggle, setMasterToggle] = useState(true);

  useEffect(() => {
    loadPrefs();
  }, []);

  async function loadPrefs() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        // Kolonnemapping mot faktisk DB-skjema:
        // email_trades→trading_alerts, email_news→marketing_emails, push_trades→push_transactions
        setPrefs({
          email_trades: data.trading_alerts ?? true,
          email_news: data.marketing_emails ?? false,
          push_trades: data.push_transactions ?? true,
        });
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }

  async function savePrefs(newPrefs: NotificationPrefs) {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          // Kolonnemapping mot faktisk DB-skjema (se loadPrefs)
          trading_alerts: newPrefs.email_trades,
          marketing_emails: newPrefs.email_news,
          push_transactions: newPrefs.push_trades,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) throw error;

      setPrefs(newPrefs);
      toast.success("Varslingsinnstillinger lagret");
    } catch {
      toast.error("Kunne ikke lagre innstillinger");
    } finally {
      setSaving(false);
    }
  }

  const togglePref = (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    savePrefs(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="bg-blue-950/30 border-blue-500/20">
        <Info className="h-4 w-4 text-blue-400" />
        <AlertDescription className="text-blue-300/80">
          Velg hvilke varsler du vil motta. Du kan få varsler via e-post eller push.
        </AlertDescription>
      </Alert>

      {/* Trading Alerts */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Trading-varsler</h4>
              <p className="text-xs text-slate-500">Handler utført, bot-oppdateringer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              <Switch
                checked={prefs.email_trades}
                onCheckedChange={() => togglePref("email_trades")}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Push-varsler</h4>
              <p className="text-xs text-slate-500">Varsler direkte på enheten din</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={prefs.push_trades}
              onCheckedChange={() => togglePref("push_trades")}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* News & Updates */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="text-white font-medium">Nyheter og oppdateringer</h4>
              <p className="text-xs text-slate-500">Nye funksjoner, tips og markedssammendrag</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Switch
              checked={prefs.email_news}
              onCheckedChange={() => togglePref("email_news")}
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* Save indicator */}
      {saving && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Lagrer...
        </div>
      )}
    </div>
  );
}
