'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/utils'
import { getLeaderboard, getUserRank } from '@/lib/paper-trading/supabase'
import { LeaderboardEntry } from '@/types/paper-trading'
import { usePaperTrading } from '@/hooks/usePaperTrading'
import { toast } from 'sonner'
import { Button } from '@/shared/ui/button'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import {
    Trophy,
    Users,
    Copy,
    Medal,
    Target,
    ChevronDown,
    AlertCircle,
    RefreshCw,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import TopThree from '@/features/leaderboard/TopThree'
import { TraderBadges, getBadges } from '@/features/leaderboard/Badges'
import { TraderProgress } from '@/features/leaderboard/ProgressBar'
import { TraderInsight } from '@/features/leaderboard/TraderInsight'
import { NicknameModal } from '@/features/leaderboard/NicknameModal'

/** Kallenavn som regnes som "ikke valgt" — generisk placeholder eller fullt navn. */
function needsRealNickname(name: string | null | undefined): boolean {
    if (!name) return true
    const n = name.trim()
    if (n.length < 2) return true
    if (n.toLowerCase() === 'trader') return true
    return false
}

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
    const [error, setError] = useState<string | null>(null)
    const [timeframe, setTimeframe] = useState<'weekly' | 'monthly' | 'all_time'>('weekly')
    const [expandedTrader, setExpandedTrader] = useState<string | null>(null)
    const [showNicknameModal, setShowNicknameModal] = useState(false)
    const [nicknameSuggestion, setNicknameSuggestion] = useState('')
    const mountedRef = useRef(true)
    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        mountedRef.current = true;
        loadData()
        return () => { mountedRef.current = false; }
    }, [timeframe])

    async function loadData() {
        try {
            setLoading(true)
            setError(null)

            // Timeout guard — force-show after 8s even if loading
            loadingTimeoutRef.current = setTimeout(() => {
                if (mountedRef.current) setLoading(false)
            }, 8000)

            const { data: { user } } = await supabase.auth.getUser()

            // Fetch leaderboard FIRST (user rank can lag)
            const data = await getLeaderboard(timeframe)
            if (!mountedRef.current) return

            setLeaderboard(data)

            // Then fetch user rank in background
            if (user) {
                getUserRank(user.id, timeframe).then(rank => {
                    if (mountedRef.current && rank) setUserRank(rank)
                }).catch(() => {
                    // Silently fail — data is already shown
                })

                // Kallenavn-onboarding: vis modal hvis brukeren mangler
                // reelt kallenavn (generisk «Trader»/fullt navn/null).
                fetch('/api/user/display-name', { cache: 'no-store' })
                    .then(res => (res.ok ? res.json() : null))
                    .then((data: { display_name?: string | null; suggestion?: string } | null) => {
                        if (!mountedRef.current || !data) return
                        if (needsRealNickname(data.display_name)) {
                            setNicknameSuggestion(data.suggestion ?? '')
                            setShowNicknameModal(true)
                        }
                    })
                    .catch(() => {
                        // Modal er nice-to-have — leaderboard fungerer uten
                    })
            }

        } catch (error) {
            console.error('Error loading competition data:', error)
            if (mountedRef.current) setError('Kunne ikke laste leaderboarddata')
        } finally {
            if (mountedRef.current) {
                // Give it a minimum display time
                setTimeout(() => {
                    if (mountedRef.current) setLoading(false)
                }, 600)
            }
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
            {showNicknameModal && (
                <NicknameModal
                    initialSuggestion={nicknameSuggestion}
                    onSaved={() => {
                        setShowNicknameModal(false)
                        // Reload så brukerens egen rad viser nye kallenavnet
                        void loadData()
                    }}
                    onDismiss={() => setShowNicknameModal(false)}
                />
            )}
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

                {/* User Rank Card — kun når data er lastet */}
                {!loading && (userRank ? (
                    <Card className="glass-card border-[#2A2D35]">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 glass-card rounded-full flex items-center justify-center font-bold text-[#3B82F6] text-xl">
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
                    <Card className="glass-card border-[#2A2D35]">
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
                ))}

                {/* Top 3 Podium */}
                    <TopThree entries={leaderboard} />

                    {/* Leaderboard */}
                <Card className="overflow-hidden border border-[#2A2D35] glass-card shadow-lg shadow-black/20">
                    <CardHeader className="bg-[#15171B] text-[#F9FAFB] p-6 border-b border-[#2A2D35]">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <CardTitle className="flex items-center gap-2 text-[#F9FAFB]">
                                <Users className="text-[#60A5FA]" />
                                {tComp('leaderboard')}
                            </CardTitle>
                            <div className="flex bg-[#0A0B0D] rounded-lg p-1 border border-[#2A2D35]">
                                {(['weekly', 'monthly', 'all_time'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTimeframe(t)}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeframe === t
                                            ? 'bg-[#1A1D26] text-white shadow-sm'
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
                        {error ? (
                            <div className="p-12 text-center">
                                <AlertCircle className="w-16 h-16 text-[#EF4444] mx-auto mb-4" />
                                <p className="text-[#F9FAFB] font-medium text-lg mb-2">Kunne ikke laste leaderboard</p>
                                <p className="text-sm text-[#6B7280] mb-6">{error}</p>
                                <button
                                    onClick={loadData}
                                    className="btn-accent inline-flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Prøv igjen
                                </button>
                            </div>
                        ) : leaderboard.length === 0 && loading ? (
                            <div className="divide-y divide-[#2A2D35]">
                                {[1,2,3,4,5].map((i) => (
                                    <div key={i} className="p-4 sm:p-6 flex items-center gap-4 animate-pulse">
                                        <div className="w-10 h-10 rounded-full bg-[#2A2D35]" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 w-32 bg-[#2A2D35] rounded" />
                                            <div className="h-3 w-24 bg-[#2A2D35] rounded" />
                                        </div>
                                        <div className="w-20 h-8 bg-[#2A2D35] rounded-lg" />
                                    </div>
                                ))}
                            </div>
                        ) : leaderboard.length === 0 ? (
                            <div className="p-6">
                                <EmptyState
                                    variant="trophy"
                                    title={tComp('noActive')}
                                    description="Ingen tradere har resultater ennå. Start trading for å komme på lista!"
                                    action={{ label: tComp('emptyCta'), href: `/${params.locale}/trade` }}
                                />
                            </div>
                        ) : (
                            <div className="divide-y divide-[#2A2D35]">
                                {leaderboard.map((entry) => (
                                    <div key={entry.id} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#15171B]/80 hover:backdrop-blur-md transition-all duration-200">
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
                                                    {entry.return_pct > 0 ? '+' : ''}{entry.return_pct.toFixed(2)}%
                                                </p>
                                                <p className="text-[10px] text-[#6B7280] mt-0.5">
                                                    {timeframe === 'weekly' ? 'Siste 7 dager' : timeframe === 'monthly' ? 'Siste 30 dager' : 'Totalt'}
                                                </p>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                                                <Button
                                                    onClick={() => handleCopy(entry)}
                                                    size="sm"
                                                    className="glass-card text-[#3B82F6] hover:bg-[#2A2D35] gap-2 w-full sm:w-auto"
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
                    <div className="glass-card p-6 hover-lift">
                        <div className="w-10 h-10 bg-[#064E3B] rounded-lg flex items-center justify-center text-[#10B981] mb-4">
                            <Target className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#F9FAFB] mb-2">{tComp('howToWin')}</h3>
                        <p className="text-sm text-[#6B7280]">
                            {tComp('howToWinDesc')}
                        </p>
                    </div>
                    <div className="glass-card p-6 hover-lift">
                        <div className="w-10 h-10 bg-[#064E3B] rounded-lg flex items-center justify-center text-[#10B981] mb-4">
                            <Copy className="w-5 h-5" />
                        </div>
                        <h3 className="font-bold text-[#F9FAFB] mb-2">{tComp('whatIsCopying')}</h3>
                        <p className="text-sm text-[#6B7280]">
                            {tComp('whatIsCopyingDesc')}
                        </p>
                    </div>
                    <div className="glass-card p-6 hover-lift">
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
