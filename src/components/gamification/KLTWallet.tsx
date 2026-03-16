"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, TrendingUp, Gift, Award, History, Info } from "lucide-react";
import { createClient } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthContext";

interface KLTTransaction {
  id: string;
  amount: number;
  type: string;
  reason: string;
  created_at: string;
}

interface KLTBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

export function KLTWallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<KLTBalance | null>(null);
  const [transactions, setTransactions] = useState<KLTTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    const fetchKLTData = async () => {
      const supabase = createClient();
      
      // Fetch balance
      const { data: balanceData } = await supabase
        .from("user_klt_balances")
        .select("*")
        .eq("user_id" as unknown, user.id)
        .single() as unknown;
      
      if (balanceData) {
        setBalance(balanceData);
      }
      
      // Fetch recent transactions
      const txResult = await (supabase
        .from("klt_transactions" as unknown)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10) as unknown);
      
      if (txResult.data) {
        setTransactions((txResult.data as unknown) as KLTTransaction[]);
      }
      
      setLoading(false);
    };
    
    fetchKLTData();
  }, [user]);

  if (loading) {
    return (
      <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10 animate-pulse">
        <div className="h-20 bg-white/5 rounded-xl" />
      </div>
    );
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "welcome_bonus":
        return <Gift className="w-4 h-4 text-purple-400" />;
      case "lesson_complete":
        return <Award className="w-4 h-4 text-blue-400" />;
      case "quiz_pass":
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case "referral":
        return <Gift className="w-4 h-4 text-orange-400" />;
      default:
        return <Coins className="w-4 h-4 text-yellow-400" />;
    }
  };

  return (
    <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-2xl p-6 border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-linear-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-lg">KLT Wallet</h3>
            <p className="text-slate-400 text-sm">Klarpakke Token</p>
          </div>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <History className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* Balance */}
      <div className="bg-white/5 rounded-xl p-4 mb-4">
        <div className="text-slate-400 text-sm mb-1">Din beholdning</div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">
            {balance?.balance.toLocaleString('nb-NO') || "0"}
          </span>
          <span className="text-yellow-400 font-medium">KLT</span>
        </div>
        {balance && balance.total_earned > 0 && (
          <div className="mt-2 text-xs text-slate-500">
            Totalt tjent: {balance.total_earned.toLocaleString('nb-NO')} KLT
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-green-400 text-xs mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>Tjent</span>
          </div>
          <div className="text-white font-semibold">
            {balance?.total_earned.toLocaleString('nb-NO') || "0"}
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="flex items-center gap-2 text-orange-400 text-xs mb-1">
            <Gift className="w-3 h-3" />
            <span>Brukt</span>
          </div>
          <div className="text-white font-semibold">
            {balance?.total_spent.toLocaleString('nb-NO') || "0"}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-slate-500 mb-4">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          KLT brukes til å låse opp premium-funksjoner, redusere gebyrer, 
          og delta i konkurranser. Tokens har ingen pengeverdi.
        </p>
      </div>

      {/* Transaction History */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 pt-4 mt-4">
              <h4 className="text-white font-semibold mb-3">Siste transaksjoner</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {transactions.length === 0 ? (
                  <p className="text-slate-500 text-sm">Ingen transaksjoner ennå</p>
                ) : (
                  transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.type)}
                        <div>
                          <p className="text-white text-sm">{tx.reason}</p>
                          <p className="text-slate-500 text-xs">
                            {new Date(tx.created_at).toLocaleDateString('nb-NO')}
                          </p>
                        </div>
                      </div>
                      <span className={`font-semibold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
