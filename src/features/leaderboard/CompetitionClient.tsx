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
import { COMPETITION_START, COMPETITION_END } from '@/lib/competition'

/** Kallenavn som regnes som "ikke valgt" — generisk placeholder eller fullt navn. */
function needsRealNickname(name: string | null | undefined): boolean {
    if (!name) return true
    const n = name.trim()
    if (n.length < 2) return true
    if (n.toLowerCase() === 'trader') return true
    return false
}

function timeLeft(now: Date): { days: number; hours: number; ended: boolean } {
    const ms = COMPETITION_END.getTime() - now.getTime()
    if (ms <= 0) return { days: 0, hours: 0, ended: true }
    return {
        days: Math.floor(ms / 86_400_000),
        hours: Math.floor((ms % 86_400_000) / 3_600_000),
        ended: false,
    }
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
    const [now, setNow] = useState(() => new Date())
    const [joined, setJoined] = useState(false)
    const [participants, setParticipants] = useState<number | null>(null)
    const [joining, setJoining] = useState(false)
    const [hasUser, setHasUser] = useState(false)
    const mountedRef = useRef(true)
    const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Nedtelling — oppdateres hvert minutt
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])

    const countdown = timeLeft(now)

    // Påmeldingsstatus + deltakertall (best effort — blokkerer aldri rendering)
    useEffect(() => {
        fetch('/api/competition', { cache: 'no-store' })
            .then(res => (res.ok ? res.json() : null))
            .then((data: { joined?: boolean; participants?: number } | null) => {
                if (!mountedRef.current || !data) return
                setJoined(!!data.joined)
                if (typeof data.participants === 'number') setParticipants(data.participants)
            })
            .catch(() => { /* ignorer — fallback til leaderboard.length */ })
    }, [])

    async function handleJoin() {
        if (joining) return
        setJoining(true)
        try {
            const res = await fetch('/api/competition', { method: 'POST' })
            if (res.status === 401) {
                router.push(`/${params.locale}/login`)
                return
            }
            if (!res.ok) throw new Error('join failed')
            const data = await res.json()
            if (!mountedRef.current) return
            setJoined(true)
            if (typeof data.participants === 'number') setParticipants(data.participants)
            toast.success(tComp('joinSuccess'))
        } catch {
            toast.error(tComp('joinError'))
        } finally {
            if (mountedRef.current) setJoining(false)
        }
    }

    // Raden rett over brukeren — for progresjonsbar («X poeng igjen til #N»)
    const nextRankEntry = userRank && userRank.rank > 1
        ? leaderboard.find(e => e.rank === userRank.rank - 1) ?? null
        : null
    const gapToNext = nextRankEntry
        ? Math.max(0, nextRankEntry.return_pct - userRank!.return_pct)
        : 0
    const progressPct = userRank
        ? userRank.rank <= 1
            ? 100
            : nextRankEntry && nextRankEntry.return_pct > 0
                ? Math.min(100, Math.max(4, (userRank.return_pct / nextRankEntry.return_pct) * 100))
                : 50
        : 0

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
            if (mountedRef.current) setHasUser(!!user)

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

                {/* Konkurranse-hero — periode, deltakere, premie, nedtelling */}
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <div className="text-xs font-semibold tracking-[0.2em] text-[#2DD4BF] mb-3 uppercase">
                        {tComp('eyebrow')}
                    </div>
                    <h1 className="text-4xl font-extrabold mb-4 bg-gradient-to-r from-[#3B82F6] to-[#2DD4BF] bg-clip-text text-transparent">
                        {tComp('title')}
                    </h1>
                    <p className="text-sm text-[#9CA3AF]">
                        {tComp('heroLine', {
                            participants: participants ? participants : (leaderboard.length || '—'),
                            balance: '100 000 kr',
                            prize: tComp('grandPrize'),
                        })}
                    </p>

                    {/* Nedtellingsbokser */}
                    <div className="inline-flex gap-3 mt-6" role="timer" aria-label={tComp('timeLeft')}>
                        {countdown.ended ? (
                            <div className="bg-[#15171B] border border-[#2A2D35] rounded-xl px-5 py-3">
                                <div className="text-lg font-bold text-[#F59E0B] font-mono">{tComp('ended')}</div>
                            </div>
                        ) : (
                            <>
                                <div className="bg-[#15171B] border border-[#2A2D35] rounded-xl px-5 py-3 min-w-[84px]">
                                    <div className="text-2xl font-bold text-[#F9FAFB] font-mono tabular-nums">{countdown.days}</div>
                                    <div className="text-[10px] tracking-[0.15em] text-[#6B7280] mt-0.5 uppercase">{tComp('days')}</div>
                                </div>
                                <div className="bg-[#15171B] border border-[#2A2D35] rounded-xl px-5 py-3 min-w-[84px]">
                                    <div className="text-2xl font-bold text-[#F9FAFB] font-mono tabular-nums">{countdown.hours}</div>
                                    <div className="text-[10px] tracking-[0.15em] text-[#6B7280] mt-0.5 uppercase">{tComp('hours')}</div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Bli med / Du er med */}
                    {!countdown.ended && (
                        <div className="mt-6">
                            {joined ? (
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#10B981] bg-[#064E3B]/60 border border-[#10B981]/40 rounded-full px-5 py-2.5">
                                    ✓ {tComp('joinedBadge')}
                                </span>
                            ) : (
                                <button
                                    onClick={handleJoin}
                                    disabled={joining}
                                    className="h-12 px-8 rounded-xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] text-white font-bold shadow-lg shadow-[#3B82F6]/25 transition-all duration-150 ease-out hover:shadow-[#3B82F6]/40 active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
                                >
                                    {joining ? '…' : hasUser ? tComp('joinCta') : tComp('joinLoginCta')}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* User Rank Card — gradient-kant + progresjon mot neste plass */}
                {!loading && (userRank ? (
                    <div className="rounded-2xl p-px bg-gradient-to-r from-[#3B82F6] to-[#2DD4BF]">
                        <div className="rounded-[15px] bg-[#15171B] p-6">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <div>
                                    <p className="text-[11px] tracking-[0.12em] text-[#6B7280] font-semibold mb-1.5 uppercase">{tComp('yourPosition')}</p>
                                    <div className="flex items-baseline gap-3">
                                        <span className="text-3xl font-extrabold text-[#F9FAFB] font-mono tabular-nums">#{userRank.rank}</span>
                                        <span className="text-sm text-[#9CA3AF]">
                                            {tComp('ofParticipants', { count: leaderboard.length })} · {userRank.user_display_name}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-2xl font-bold font-mono tabular-nums ${userRank.return_pct >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                                        {userRank.return_pct > 0 ? '+' : ''}{userRank.return_pct.toFixed(2)}%
                                    </p>
                                    <p className="text-xs text-[#6B7280]">{userRank.total_trades} {tComp('trades')}</p>
                                </div>
                            </div>
                            {/* Progresjonsbar */}
                            <div className="mt-4">
                                <div className="h-1.5 rounded-full bg-[#2A2D35] overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#2DD4BF] transition-[width] duration-500 ease-out"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                                <p className="text-xs text-[#6B7280] mt-2">
                                    {userRank.rank <= 1
                                        ? tComp('youLead')
                                        : nextRankEntry
                                            ? tComp('gapToNext', { gap: gapToNext.toFixed(1), rank: userRank.rank - 1 })
                                            : tComp('topPercent', { percent: Math.min(100, Math.round((userRank.rank / Math.max(1, leaderboard.length)) * 100)) })}
                                </p>
                            </div>
                        </div>
                    </div>
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
                                    description={tComp('emptyDesc')}
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

                {/* Privacy-linje — samme budskap som i kallenavn-onboarding */}
                <p className="text-center text-xs text-[#6B7280] leading-relaxed max-w-xl mx-auto">
                    {tComp('nicknameDesc')}
                </p>

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
                        <p className="text-sm text-[#10B981] mt-2">
                            {tComp('participationPrize', { count: 5 })}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    )
}
