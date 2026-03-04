"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CAMPAIGN_CONFIG } from "@/lib/campaign-config";
import { createClient } from "@/lib/utils";
import { Lock, RefreshCw, TrendingUp, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Stats {
  total: number;
  today: number;
  week: number;
  remaining: number;
}

export default function ClientCampaign() {
  const params = useParams();
  const locale = (params?.locale as string) || "no";
  const [stats, setStats] = useState<Stats>({
    ...CAMPAIGN_CONFIG.DEFAULT_STATS,
  });
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          setChecking(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        setIsAdmin(profile?.role === 'admin');
      } catch (e) {
        setIsAdmin(false);
      }
      setChecking(false);
    };

    checkAdmin();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campaign/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error("Stats error:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      const supabase = createClient();
      const channel = supabase
        .channel('admin-campaign-stats')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, () => {
          fetchStats();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isAdmin]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Sjekker tilgang...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center bg-slate-900 border-slate-700">
          <Lock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Admin Tilgang Kreves
          </h1>
          <p className="text-slate-400 mb-4">
            Du må være logget inn som administrator for å se denne siden.
          </p>

          {/* Debug info */}
          <div className="bg-slate-800 rounded p-3 mb-4 text-left">
            <p className="text-xs text-slate-500 mb-1">Feilsøking:</p>
            <ol className="text-xs text-slate-400 list-decimal list-inside space-y-1">
              <li>
                Gå til{" "}
                <Link href={`/${locale}/innlogging`} className="text-blue-400 underline">
                  innlogging
                </Link>
              </li>
              <li>Logg inn med Google/Microsoft</li>
              <li>Kom tilbake hit</li>
            </ol>
          </div>

          <div className="flex gap-4 justify-center">
            <Button
              asChild
              className="bg-gradient-to-r from-blue-600 to-emerald-600"
            >
              <Link href={`/${locale}/innlogging`}>Logg inn</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Tilbake til forsiden</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              🎓 100 STUDENTER PÅ 24 TIMER
            </h1>
            <p className="text-slate-400">
              Sist oppdatert: {new Date().toLocaleTimeString("no-NO")}
            </p>
          </div>
          <Button onClick={fetchStats} disabled={loading} variant="outline">
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Oppdater
          </Button>
        </div>

        {/* Main Progress */}
        <Card className="bg-slate-900 border-slate-700 p-8 mb-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h2 className="text-5xl font-bold text-white">
                {stats.total}{" "}
                <span className="text-2xl text-slate-400">/ 100</span>
              </h2>
              <p className="text-slate-400 mt-1">Registrerte studenter</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-green-400">
                {((stats.total / 100) * 100).toFixed(1)}%
              </p>
              <p className="text-slate-400">Fullført</p>
            </div>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-6 mb-4">
            <div
              className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
              style={{ width: `${Math.min((stats.total / 100) * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-sm text-slate-400">
            <span>0</span>
            <span>{stats.remaining} plasser igjen</span>
            <span>100</span>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900 border-slate-700 p-6">
            <Users className="w-8 h-8 text-blue-400 mb-4" />
            <p className="text-slate-400 text-sm">I DAG</p>
            <p className="text-4xl font-bold text-white">+{stats.today}</p>
          </Card>

          <Card className="bg-slate-900 border-slate-700 p-6">
            <TrendingUp className="w-8 h-8 text-green-400 mb-4" />
            <p className="text-slate-400 text-sm">DENNE UKEN</p>
            <p className="text-4xl font-bold text-white">{stats.week}</p>
          </Card>

          <Card className="bg-slate-900 border-slate-700 p-6">
            <Trophy className="w-8 h-8 text-amber-400 mb-4" />
            <p className="text-slate-400 text-sm">IGJEN</p>
            <p className="text-4xl font-bold text-white">{stats.remaining}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
