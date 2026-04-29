"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Activity,
  Info,
  Wallet,
  BarChart3,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartWrapper } from "@/shared/ui/chart-wrapper";

interface SessionData {
  id: string;
  mode: string;
  status: string;
  trading_pair: string;
  strategy_id: string;
  current_capital_nok: number;
  starting_capital_nok: number;
  total_pnl: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  created_at: string;
  stopped_at: string | null;
  open_position: Record<string, unknown> | null;
}

interface TradeData {
  id: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  realized_pnl: number | null;
  created_at: string;
  trading_pair: string | null;
  strategy_signal: string | number | boolean | null;
  status: string | null;
  fee: number | null;
}

interface SessionDetailDialogProps {
  session: SessionData;
  locale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white">Aktiv</Badge>;
    case "stopped":
      return <Badge variant="secondary">Stoppet</Badge>;
    case "crashed":
      return <Badge variant="destructive">Kræsjet</Badge>;
    case "paused":
      return <Badge variant="outline">Pauset</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale === "no" ? "nb-NO" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function simpleExplanation(session: SessionData, trades: TradeData[]): string {
  const { status, current_capital_nok, starting_capital_nok, total_trades, total_pnl } = session;
  const pnlPct = starting_capital_nok > 0
    ? ((current_capital_nok - starting_capital_nok) / starting_capital_nok) * 100
    : 0;

  if (status === "active" && total_trades === 0) {
    return "Denne sessionen er aktiv, men har ikke gjort noen handler ennå. Kapitalen er klar for bruk.";
  }
  if (status === "crashed") {
    return `Sessionen kræsjet med ${current_capital_nok.toLocaleString("no-NO")} kr igjen. Dette kan skyldes en teknisk feil eller uventet markedsbevegelse.`;
  }

  const direction = pnlPct >= 0 ? "opp" : "ned";
  const summary = total_trades === 1
    ? `Sessionen gjorde 1 handel og endte ${direction} ${Math.abs(pnlPct).toFixed(1)}%.`
    : `Sessionen gjorde ${total_trades} handler og endte ${direction} ${Math.abs(pnlPct).toFixed(1)}%.`;

  const winners = trades.filter((t) => (t.realized_pnl ?? 0) > 0).length;
  const losers = trades.filter((t) => (t.realized_pnl ?? 0) < 0).length;

  if (winners > 0 && losers > 0) {
    return `${summary} ${winners} vinner(e) og ${losers} taper(e). Strategien var ${session.strategy_id}.`;
  }
  if (winners > 0) {
    return `${summary} Alle ${total_trades} handler var vinnere! Flott resultat.`;
  }
  if (losers > 0) {
    return `${summary} Alle handler endte med tap. Markedsforholdene var trolig ugunstige.`;
  }
  return summary;
}

export function SessionDetailDialog({
  session,
  locale,
  open,
  onOpenChange,
}: SessionDetailDialogProps) {
  const supabase = createClient();
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, side, quantity, price, realized_pnl, created_at, trading_pair, strategy_signal, status, fee",
      )
      .eq("session_id", session.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTrades(
        data.map((row) => ({
          id: row.id,
          side: row.side as "buy" | "sell",
          quantity: Number(row.quantity),
          price: Number(row.price),
          realized_pnl: row.realized_pnl != null ? Number(row.realized_pnl) : null,
          created_at: row.created_at,
          trading_pair: row.trading_pair,
          strategy_signal: row.strategy_signal != null ? String(row.strategy_signal) : null,
          status: row.status,
          fee: row.fee != null ? Number(row.fee) : null,
        })),
      );
    }
    setLoading(false);
  }, [session.id, supabase]);

  useEffect(() => {
    if (open) void fetchTrades();
  }, [open, fetchTrades]);

  const pnlPct =
    session.starting_capital_nok > 0
      ? ((session.current_capital_nok - session.starting_capital_nok) /
          session.starting_capital_nok) *
        100
      : 0;
  const isProfitable = pnlPct >= 0;
  const winRate =
    session.total_trades > 0
      ? Math.round((session.winning_trades / session.total_trades) * 100)
      : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {statusBadge(session.status)}
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {session.trading_pair}
            </DialogTitle>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {session.strategy_id} · {session.mode === "paper" ? "Paper Trading" : "Live"}
          </p>
        </DialogHeader>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Nåværende kapital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {session.current_capital_nok.toLocaleString("no-NO")} kr
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Startkapital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {session.starting_capital_nok.toLocaleString("no-NO")} kr
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Avkastning
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-1">
              {isProfitable ? (
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
              <p className={`text-lg font-bold ${isProfitable ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                {isProfitable ? "+" : ""}
                {pnlPct.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{winRate}%</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session.winning_trades} / {session.total_trades}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enkel forklaring */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Oppsummering</h4>
              <p className="text-sm text-blue-700 dark:text-blue-200/80 leading-relaxed">
                {simpleExplanation(session, trades)}
              </p>
            </div>
          </div>
        </div>

        {/* Open position */}
        {session.open_position && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">Åpen posisjon</h4>
                <p className="text-sm text-amber-700 dark:text-amber-200/80">
                  {JSON.stringify(session.open_position)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* PnL Chart */}
        {trades.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              PnL per handel
            </h3>
            <ChartWrapper height={200} minHeight={150}>
              <BarChart
                data={trades
                  .slice()
                  .reverse()
                  .map((t, i) => ({
                    name: `#${i + 1}`,
                    pnl: Number(t.realized_pnl ?? 0),
                  }))}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={(v: number) => `${v.toLocaleString("no-NO")}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    color: "#0f172a",
                  }}
                  formatter={(value) => [
                    `${Number(value) > 0 ? "+" : ""}${Number(value).toLocaleString("no-NO")} kr`,
                    "PnL",
                  ]}
                />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {trades.slice().reverse().map((t, i) => (
                    <Cell
                      key={i}
                      fill={(t.realized_pnl ?? 0) >= 0 ? "#10b981" : "#ef4444"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartWrapper>
          </div>
        )}

        {/* Trades table */}
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            Handler ({trades.length})
          </h3>

          {loading ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">Laster handler...</div>
          ) : trades.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              Ingen handler i denne sessionen ennå.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="text-left py-2 px-3">Type</th>
                    <th className="text-right py-2 px-3">Pris</th>
                    <th className="text-right py-2 px-3">Mengde</th>
                    <th className="text-right py-2 px-3">PnL</th>
                    <th className="text-right py-2 px-3">Tid</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade) => {
                    const pnl = trade.realized_pnl ?? 0;
                    return (
                      <tr
                        key={trade.id}
                        className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <Badge
                            variant={trade.side === "buy" ? "default" : "secondary"}
                            className={`text-xs ${
                              trade.side === "buy"
                                ? "bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-600/30"
                                : "bg-amber-100 dark:bg-amber-600/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-600/30"
                            }`}
                          >
                            {trade.side === "buy" ? "Kjøp" : "Salg"}
                          </Badge>
                        </td>
                        <td className="text-right py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {trade.price.toLocaleString("no-NO")}
                        </td>
                        <td className="text-right py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                          {trade.quantity.toFixed(6)}
                        </td>
                        <td
                          className={`text-right py-2 px-3 font-mono font-medium ${
                            pnl > 0 ? "text-green-600 dark:text-green-400" : pnl < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {pnl > 0 ? "+" : ""}
                          {pnl.toLocaleString("no-NO", { maximumFractionDigits: 2 })} kr
                        </td>
                        <td className="text-right py-2 px-3 text-slate-500 dark:text-slate-500 text-xs">
                          {formatDate(trade.created_at, locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer dates */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Startet: {formatDate(session.created_at, locale)}
          </span>
          {session.stopped_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Stoppet: {formatDate(session.stopped_at, locale)}
            </span>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
