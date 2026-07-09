'use client'

import type { LeaderboardEntry } from '@/types/paper-trading'

interface TopThreeProps {
  entries: LeaderboardEntry[]
}

const medalEmoji: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

const podiumOrder = [2, 1, 3]

export default function TopThree({ entries }: TopThreeProps) {
  if (entries.length < 3) return null

  return (
    <div className="flex justify-center gap-4">
      {podiumOrder.map((rank) => {
        const entry = entries.find((e) => e.rank === rank)
        if (!entry) return null

        const positive = entry.return_pct >= 0

        return (
          <div
            key={entry.id}
            className="flex flex-col items-center bg-white rounded-xl border border-slate-100 shadow-sm p-6 w-40"
          >
            <span className="text-4xl">{medalEmoji[rank]}</span>
            <p className="font-bold text-slate-900 mt-2 text-sm truncate max-w-full">
              {entry.user_display_name}
            </p>
            <p
              className={`font-bold text-lg ${positive ? 'text-green-600' : 'text-red-600'}`}
            >
              {positive ? '+' : ''}
              {entry.return_pct.toFixed(2)}%
            </p>
          </div>
        )
      })}
    </div>
  )
}
