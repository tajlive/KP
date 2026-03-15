'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Activity,
  BarChart3,
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  getActiveSimulation,
  getSimulationTrades,
  getSimulationStats,
  createSimulation
} from '@/lib/paper-trading/supabase'
import { PaperSimulation, PaperTrade } from '@/types/paper-trading'

interface SimulationStats {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  totalProfit: number
  totalLoss: number
}

interface PaperTradingDashboardProps {
  userId: string
  locale: string
}

export function PaperTradingDashboard({ userId, locale }: PaperTradingDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [simulation, setSimulation] = useState<PaperSimulation | null>(null)
  const [stats, setStats] = useState<SimulationStats | null>(null)
  const [recentTrades, setRecentTrades] = useState<PaperTrade[]>([])

  useEffect(() => {
    async function loadData() {
      try {
        // Load active simulation
        let sim = await getActiveSimulation(userId)
        
        // Auto-create simulation if none exists
        if (!sim) {
          sim = await createSimulation(userId, 'standard', 1_000_000)
        }
        
        if (sim) {
          setSimulation(sim)

          // Load stats
          const simStats = await getSimulationStats(sim.id)
          setStats(simStats as SimulationStats | null)

          // Load recent trades
          const trades = await getSimulationTrades(sim.id)
          setRecentTrades(trades.slice(0, 10))
        }
      } catch (error) {
        console.error('Error loading paper trading data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!simulation) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Lekepenger</h2>
        </div>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Ingen aktiv simulering
            </h3>
            <p className="text-slate-400 mb-6">
              Start din første lekepenger-simulering for å øve på trading uten risiko.
            </p>
            <Link href={`/${locale}/paper-trading`}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Target className="w-4 h-4 mr-2" />
                Start lekepenger
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalValue = (simulation.current_balance || 0)
  const totalPnL = totalValue - (simulation.initial_balance || 1000000)
  const totalPnLPercent = ((totalValue - (simulation.initial_balance || 1000000)) / (simulation.initial_balance || 1000000)) * 100

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Lekepenger</h2>
        <Link href={`/${locale}/paper-trading`}>
          <Button variant="outline" className="border-slate-700 text-slate-300">
            <Target className="w-4 h-4 mr-2" />
            Åpne Simulator
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Verdi</p>
                <p className="text-2xl font-bold text-white">
                  {totalValue.toLocaleString('nb-NO')} kr
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total P&L</p>
                <p className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPnL >= 0 ? '+' : ''}{totalPnL.toLocaleString('nb-NO')} kr
                </p>
                <p className={`text-sm ${totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
                </p>
              </div>
              {totalPnL >= 0 ? (
                <TrendingUp className="w-8 h-8 text-green-400" />
              ) : (
                <TrendingDown className="w-8 h-8 text-red-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Trades</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.totalTrades || 0}
                </p>
                <p className="text-sm text-slate-400">
                  {stats?.winningTrades || 0}W / {stats?.losingTrades || 0}L
                </p>
              </div>
              <Activity className="w-8 h-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-slate-800">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Win Rate</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.winRate?.toFixed(1) || 0}%
                </p>
                <p className="text-sm text-slate-400">
                  P/F: {stats?.profitFactor?.toFixed(2) || 0}
                </p>
              </div>
              <Award className="w-8 h-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trades */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Siste Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <p className="text-center py-8 text-slate-400">
              Ingen trades ennå. Start trading i simulatoren!
            </p>
          ) : (
            <div className="space-y-2">
              {recentTrades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        trade.side === 'LONG'
                          ? 'bg-green-500/20'
                          : 'bg-red-500/20'
                      }`}
                    >
                      {trade.side === 'LONG' ? (
                        <TrendingUp className="w-5 h-5 text-green-400" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {trade.side === 'LONG' ? 'Kjøpt' : 'Solgt'} {trade.symbol}
                      </p>
                      <p className="text-sm text-slate-500">
                        {new Date(trade.opened_at).toLocaleDateString('nb-NO')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">
                      {(trade.position_value || 0).toLocaleString('nb-NO')} kr
                    </p>
                    {trade.pnl && trade.pnl !== 0 && (
                      <p
                        className={`text-sm ${
                          trade.pnl > 0 ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {trade.pnl > 0 ? '+' : ''}
                        {trade.pnl.toFixed(2)} kr ({trade.pnl_pct?.toFixed(2)}%)
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {stats && stats.totalTrades > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Gjennomsnitt per Trade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gj.snitt Gevinst:</span>
                  <span className="text-green-400 font-medium">
                    +{stats.avgWin?.toFixed(0) || 0} kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gj.snitt Tap:</span>
                  <span className="text-red-400 font-medium">
                    -{stats.avgLoss?.toFixed(0) || 0} kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit Factor:</span>
                  <span className="text-white font-medium">
                    {stats.profitFactor?.toFixed(2) || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-lg">Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Profit:</span>
                  <span className="text-green-400 font-medium">
                    +{stats.totalProfit?.toFixed(0) || 0} kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Loss:</span>
                  <span className="text-red-400 font-medium">
                    -{stats.totalLoss?.toFixed(0) || 0} kr
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Net Profit:</span>
                  <span className={`font-medium ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)} kr
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
