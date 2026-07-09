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
        <div className="min-h-screen bg-[#0A0B0D] py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#78350F] rounded-full mb-6">
                        <Trophy className="w-8 h-8 text-[#F59E0B]" />
                    </div>
                    <h1 className="text-4xl font-bold text-[#F9FAFB] mb-4">
                        {tComp('title')}
                    </h1>
                    <p className="text-xl text-[#9CA3AF]">
                        {tComp('subtitle')}
                    </p>
                </div>

                {/* User Rank Card */}
                {userRank ? (
                    <Card className="bg-[#1A1D26] border-[#2A2D35]">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#1A1D26] rounded-full flex items-center justify-center font-bold text-[#3B82F6] text-xl">
                                    #{userRank.rank}
                                </div>
                                <div>
                                    <p className="text-sm text-[#6B7280] font-medium">{tComp('yourPosition')}</p>
                                    <p className="text-lg font-bold text-[#F9FAFB]">
                                    {leaderboard.length > 0
                                        ? `Topp ${Math.min(100, Math.round((userRank.rank / leaderboard.length) * 100))}%`
                                        : tComp('notParticipating')}
                                </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-[#6B7280] font-medium">Avkastning</p>
                                <p className={`text-xl font-bold ${userRank.return_pct >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                    {userRank.return_pct > 0 ? '+' : ''}{userRank.return_pct.toFixed(2)}%
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="bg-[#1A1D26] border-[#2A2D35]">
                        <CardContent className="p-6 text-center">
                            <p className="text-[#3B82F6] font-medium mb-3">{tComp('notParticipating')}</p>
                            <Button
                                onClick={() => router.push(`/${params.locale}/beta/auto-trade`)}
                                className="bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-full"
                            >
                                {tComp('startFirstTrade')}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Top 3 Podium */}
                    <TopThree entries={leaderboard} />

                    {/* Leaderboard */}
                <Card className="overflow-hidden border border-[#2A2D35] bg-[#1A1D26]">
                    <CardHeader className="bg-slate-900 text-white p-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="text-[#60A5FA]" />
                                {tComp('leaderboard')}
                            </CardTitle>
                            <div className="flex bg-[#15171B] rounded-lg p-1">
                                {(['weekly', 'monthly', 'all_time'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeframe(t)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeframe === t
                                            ? 'bg-[#1A1D26] text-white'
                                            : 'text-[#6B7280] hover:text-white'
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
                            <div className="p-12 text-center text-[#6B7280]">{tComp('loading')}</div>
                        ) : leaderboard.length === 0 ? (
                            <div className="p-12 text-center">
                                <Trophy className="w-12 h-12 text-[#9CA3AF] mx-auto mb-4" />
                                <p className="text-[#F9FAFB] font-medium mb-2">{tComp('noActive')}</p>
                                <p className="text-sm text-[#6B7280]">Ingen tradere har resultater ennå. Start trading for å komme på lista!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[#2A2D35]">
                                {leaderboard.map((entry) => (
                                    <div key={entry.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#15171B] transition-colors">
                                        {/* Rank & User */}
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${entry.rank === 1 ? 'bg-[#F59E0B] text-[#0A0B0D]' :
                                                entry.rank === 2 ? 'bg-[#9CA3AF] text-[#0A0B0D]' :
                                                    entry.rank === 3 ? 'bg-[#D97706] text-white' : 'bg-[#2A2D35] text-[#6B7280]'
                                                }`}>
                                                {entry.rank <= 3 ? <Trophy className="w-5 h-5" /> : entry.rank}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#F9FAFB]">{entry.user_display_name}</p>
                                                <TraderBadges badges={getBadges(entry)} />
                                                <TraderProgress entry={entry} />
                                                <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                                                    <span className="capitalize px-2 py-0.5 rounded-full bg-[#2A2D35]">
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
                                                <p className="text-xs text-[#6B7280] uppercase font-bold mb-1">{tComp('winRate')}</p>
                                                <p className="font-bold text-[#D1D5DB]">{entry.win_rate}%</p>
                                                <p className="text-[10px] text-[#6B7280] mt-0.5">{entry.total_trades} handler</p>
                                            </div>
                                            <div className="text-center sm:text-left" title="Total prosentvis avkastning i perioden">
                                                <p className="text-xs text-[#6B7280] uppercase font-bold mb-1">{tComp('return')}</p>
                                                <p className={`font-bold text-lg ${entry.return_pct >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                                    {entry.return_pct > 0 ? '+' : ''}{entry.return_pct}%
                                                </p>
                                                <p className="text-[10px] text-[#6B7280] mt-0.5">
                                                    {timeframe === 'weekly' ? 'Siste 7 dager' : timeframe === 'monthly' ? 'Siste 30 dager' : 'Totalt'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                                                <Button
                                                    onClick={() => handleCopy(entry)}
                                                    size="sm"
                                                    className="bg-[#1A1D26] text-[#3B82F6] hover:bg-[#2A2D35] gap-2 w-full sm:w-auto"
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
                    <div className="bg-[#1A1D26] p-6 rounded-xl border border-[#2A2D35]">
                        <div className="w-10 h-10 bg-[#064E3B] rounded-lg flex items-center justify-center text-[#10B981] mb-4">
                            <Target className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#F9FAFB] mb-2">{tComp('howToWin')}</h3>
                        <p className="text-sm text-[#6B7280]">
                            {tComp('howToWinDesc')}
                        </p>
                    </div>
                    <div className="bg-[#1A1D26] p-6 rounded-xl border border-[#2A2D35]">
                        <div className="w-10 h-10 bg-[#064E3B] rounded-lg flex items-center justify-center text-[#10B981] mb-4">
                            <Copy className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#F9FAFB] mb-2">{tComp('whatIsCopying')}</h3>
                        <p className="text-sm text-[#6B7280]">
                            {tComp('whatIsCopyingDesc')}
                        </p>
                    </div>
                    <div className="bg-[#1A1D26] p-6 rounded-xl border border-[#2A2D35]">
                        <div className="w-10 h-10 bg-[#78350F] rounded-lg flex items-center justify-center text-[#F59E0B] mb-4">
                            <Medal className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#F9FAFB] mb-2">Premier</h3>
                        <p className="text-sm text-[#6B7280]">
                            {tComp('weeklyPrize')}. {tComp('monthlyPrize')}.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}
