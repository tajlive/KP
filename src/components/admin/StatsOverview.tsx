'use client'

import { Users, Clock, Calendar, GraduationCap, Hash } from 'lucide-react'

interface Stats {
  total: number
  last24h: number
  last7d: number
  nybegynner: number
  erfaren: number
  nextStudentNummer: number
}

interface StatsOverviewProps {
  stats: Stats
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  const cards = [
    {
      title: 'Totalt antall',
      value: stats.total,
      subtitle: 'registrerte studenter',
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    {
      title: 'Siste 24 timer',
      value: stats.last24h,
      subtitle: 'nye registreringer',
      icon: Clock,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    },
    {
      title: 'Siste 7 dager',
      value: stats.last7d,
      subtitle: 'nye registreringer',
      icon: Calendar,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/10'
    },
    {
      title: 'Erfaringsnivå',
      value: `${stats.nybegynner}/${stats.erfaren}`,
      subtitle: 'nybegynnere / erfarne',
      icon: GraduationCap,
      color: 'text-amber-400',
      bgColor: 'bg-amber-400/10'
    },
    {
      title: 'Neste nummer',
      value: `#${stats.nextStudentNummer}`,
      subtitle: 'ledig studentnummer',
      icon: Hash,
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-400/10'
    }
  ]

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-500" />
        Oversikt
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">{card.title}</p>
                <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                <p className="text-xs text-slate-500 mt-1">{card.subtitle}</p>
              </div>
              <div className={`${card.bgColor} ${card.color} p-2 rounded-xl`}>
                <card.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
