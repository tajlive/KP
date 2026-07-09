'use client'

import { useState, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/utils'
import { getLeaderboard, getUserRank } from '@/lib/paper-trading/supabase'
import { LeaderboardEntry } from '@/types/paper-trading'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
    Trophy,
    Users,
    Copy,
    Medal,
    Target,
    ChevronDown
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import TopThree from '@/features/leaderboard/TopThree'
import { TraderBadges, getBadges } from '@/features/leaderboard/Badges'
import { TraderProgress } from '@/features/leaderboard/ProgressBar'
import { TraderInsight } from '@/features/leaderboard/TraderInsight'

export default function CompetitionClient({
    params
}: {
    params: { locale: string }
}) {
    const _t = useTranslations('beta')
    const tComp = useTranslations('competition')
    const _locale = useLocale()
    const router = useRouter()
    const supabase = createClient()
    const { startAutoTrade, loading: _tradeLoading } = usePaperTrading()

    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
    const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
    const [loading, setLoading] = useState(true)
    const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all_time'>('weekly')
    const [expandedTrader, setExpandedTrader] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [timeframe])

    async function loadData() {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            const [data, rank] = await Promise.all([
                getLeaderboard(timeframe),
                user ? getUserRank(user.id, timeframe) : null
            ])

            setLeaderboard(data)

            if (rank) setUserRank(rank)

        } catch (error) {
            console.error('Error loading competition data:', error)
        } finally {
            setLoading(false)
        }
    }

    // Oversett risikonivå til norsk
    const riskLabel = (level: string) => {
        const map: Record<string, string> = {
            high: 'Høy',
            aggressive: 'Aggressiv',
            standard: 'Moderat',
            moderate: 'Moderat',
            medium: 'Moderat',
            low: 'Lav',
            conservative: 'Konservativ',
        }
        return map[level.toLowerCase()] || level
    }

    const handleCopy = async (entry: LeaderboardEntry) => {
        if (confirm(tComp('copyStrategy', { name: entry.user_display_name }) + '\n\n' + tComp('copyStrategyDesc', { risk: entry.risk_level.toUpperCase() }))) {
            try {
                await startAutoTrade(entry.risk_level)
                router.push(`/${params.locale}/dashboard/auto-trade`)
            } catch (_error) {
                toast.error(tComp('copyError'))
            }
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-6">
                        <Trophy className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">
                        {tComp('title')}
                    </h1>
                    <p className="text-xl text-slate-600">
                        {tComp('subtitle')}
                    </p>
                </div>

                {/* User Rank Card */}
                {userRank ? (
                    <Card className="bg-white border-blue-100 shadow-sm">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center font-bold text-blue-600 text-xl">
                                    #{userRank.rank}
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">{tComp('yourPosition')}</p>
                                    <p className="text-lg font-bold text-slate-900">
                                    {leaderboard.length > 0
                                        ? `Topp ${Math.min(100, Math.round((userRank.rank / leaderboard.length) * 100))}%`
                                        : tComp('notParticipating')}
                                </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-slate-500 font-medium">Avkastning</p>
                                <p className={`text-xl font-bold ${userRank.return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {userRank.return_pct > 0 ? '+' : ''}{userRank.return_pct.toFixed(2)}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-6 text-center">
                            <p className="text-blue-800 font-medium mb-3">{tComp('notParticipating')}</p>
                            <Button
                                onClick={() => router.push(`/${params.locale}/beta/auto-trade`)}
                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                            >
                                {tComp('startFirstTrade')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Top 3 Podium */}
                    <TopThree entries={leaderboard} />

                    {/* Leaderboard */}
                <Card className="overflow-hidden border-none shadow-lg">
                    <CardHeader className="bg-slate-900 text-white p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="text-blue-400" />
                                {tComp('leaderboard')}
                            </CardTitle>
                            <div className="flex bg-slate-800 rounded-lg p-1">
                                {(['weekly', 'monthly', 'all_time'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeframe(t)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeframe === t
                                            ? 'bg-slate-700 text-white shadow-sm'
                                            : 'text-slate-400 hover:text-white'
                                            }`}
                                    >
                                        {t === 'weekly' && tComp('weekly')}
                                        {t === 'monthly' && tComp('monthly')}
                                        {t === 'all_time' && tComp('allTime')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-slate-500">{tComp('loading')}</div>
                        ) : leaderboard.length === 0 ? (
                            <div className="p-12 text-center">
                                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <p className="text-slate-600 font-medium mb-2">{tComp('noActive')}</p>
                                <p className="text-sm text-slate-400">Ingen tradere har resultater ennå. Start trading for å komme på lista!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {leaderboard.map((entry) => (
                                    <div key={entry.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                                        {/* Rank & User */}
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${entry.rank === 1 ? 'bg-yellow-400' :
                                                entry.rank === 2 ? 'bg-slate-300' :
                                                    entry.rank === 3 ? 'bg-amber-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {entry.rank <= 3 ? <Trophy className="w-5 h-5" /> : entry.rank}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{entry.user_display_name}</p>
                                                <TraderBadges badges={getBadges(entry)} />
                                                <TraderProgress entry={entry} />
                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                    <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100">
                                                        {entry.risk_level} {tComp('risk')}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{entry.total_trades} {tComp('trades')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-12 flex-1">
                                            <div className="text-center sm:text-left" title="Andel trades med positiv avkastning">
                                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">{tComp('winRate')}</p>
                                                <p className="font-bold text-slate-700">{entry.win_rate}%</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{entry.total_trades} handler</p>
                                            </div>
                                            <div className="text-center sm:text-left" title="Total prosentvis avkastning i perioden">
                                                <p className="text-xs text-slate-400 uppercase font-bold mb-1">{tComp('return')}</p>
                                                <p className={`font-bold text-lg ${entry.return_pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {entry.return_pct > 0 ? '+' : ''}{entry.return_pct}%
                                                </p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    {timeframe === 'weekly' ? 'Siste 7 dager' : timeframe === 'monthly' ? 'Siste 30 dager' : 'Totalt'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                                                <Button
                                                    onClick={() => handleCopy(entry)}
                                                    size="sm"
                                                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 gap-2 w-full sm:w-auto"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                    {tComp('copy')}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info Card */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 mb-4">
                            <Target className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">{tComp('howToWin')}</h3>
                        <p className="text-sm text-slate-500">
                            {tComp('howToWinDesc')}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 mb-4">
                            <Copy className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">{tComp('whatIsCopying')}</h3>
                        <p className="text-sm text-slate-500">
                            {tComp('whatIsCopyingDesc')}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 mb-4">
                            <Medal className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-slate-900 mb-2">Premier</h3>
                        <p className="text-sm text-slate-500">
                            {tComp('weeklyPrize')}. {tComp('monthlyPrize')}.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}
