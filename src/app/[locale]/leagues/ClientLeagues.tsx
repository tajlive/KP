'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/utils';
import { Trophy, Users, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useTranslations, useLocale } from 'next-intl';

interface League {
    id: string;
    title: string;
    description: string;
    prize_pool: string;
    end_date: string;
    participants_count: number;
}

export default function ClientLeagues() {
    const t = useTranslations('leagues');
    const tLeaderboard = useTranslations('paperTrading.leaderboard');
    const locale = useLocale();
    const [activeLeagues, setActiveLeagues] = useState<League[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setActiveLeagues([
            {
                id: '1',
                title: locale === 'no' ? 'Februar Mesterskap 2026' : 'February Championship 2026',
                description: t('winBitcoin') + ' ' + t('paperTrading'),
                prize_pool: '5 000 NOK',
                end_date: '2026-02-28',
                participants_count: 142
            },
            {
                id: '2',
                title: locale === 'no' ? 'Nybegynner Liga' : 'Beginner League',
                description: t('forBeginners'),
                prize_pool: locale === 'no' ? 'Kurs + Mentoring' : 'Course + Mentoring',
                end_date: '2026-03-15',
                participants_count: 89
            }
        ]);
        setLoading(false);
    }, [locale, t]);

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto">
                    <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                        <Trophy className="w-10 h-10 text-yellow-500" />
                        {t('title')}
                    </h1>
                    <p className="text-slate-400 text-lg">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Active Leagues Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {activeLeagues.map((league) => (
                        <div key={league.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all group">
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                            {league.title}
                                        </h3>
                                        <p className="text-slate-400 mt-2 line-clamp-2">
                                            {league.description}
                                        </p>
                                    </div>
                                    <div className="bg-yellow-500/10 px-4 py-2 rounded-full border border-yellow-500/20">
                                        <span className="text-yellow-500 font-bold">{league.prize_pool}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Users className="w-5 h-5 text-blue-500" />
                                        <span>{league.participants_count} {t('participants')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-300">
                                        <Calendar className="w-5 h-5 text-emerald-500" />
                                        <span>{locale === 'no' ? 'Slutter' : 'Ends'} {new Date(league.end_date).toLocaleDateString(locale === 'no' ? 'no' : 'en')}</span>
                                    </div>
                                </div>

                                <button className="w-full py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
                                    {t('joinLeague')}
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Global Leaderboard Preview */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
                    <div className="flex item-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                            <TrendingUp className="w-6 h-6 text-green-500" />
                            {locale === 'no' ? 'Topp 5 Tradere (Totalt)' : 'Top 5 Traders (All-time)'}
                        </h2>
                        <Link href={`/${locale}/leaderboard`} className="text-blue-400 hover:text-blue-300 font-medium">
                            {locale === 'no' ? 'Se alle →' : 'See all →'}
                        </Link>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase">
                                    <th className="pb-4 pl-4">{tLeaderboard('rank')}</th>
                                    <th className="pb-4">{tLeaderboard('trader')}</th>
                                    <th className="pb-4 text-right">PnL (NOK)</th>
                                    <th className="pb-4 text-right pr-4">{tLeaderboard('return')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {[1, 2, 3, 4, 5].map((rank) => (
                                    <tr key={rank} className="group hover:bg-slate-800/50 transition-colors">
                                        <td className="py-4 pl-4">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                                                    rank === 2 ? 'bg-slate-400/20 text-slate-300' :
                                                        rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                                                            'text-slate-500'
                                                }`}>
                                                {rank}
                                            </div>
                                        </td>
                                        <td className="py-4 font-medium text-white flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-xs">
                                                {String.fromCharCode(64 + rank)}
                                            </div>
                                            Trader #{1000 + rank}
                                        </td>
                                        <td className="py-4 text-right font-mono text-green-400">
                                            +{Math.floor(150000 / rank).toLocaleString()} kr
                                        </td>
                                        <td className="py-4 text-right pr-4 font-mono text-green-400">
                                            +{Math.floor(150 / rank)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
