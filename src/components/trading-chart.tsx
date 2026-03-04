'use client'

import { useState, useMemo, useEffect } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartEvent,
  ActiveElement,
  TooltipItem
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// Forklaringer på opp/ned bevegelser - pedagogisk innhold
const trendExplanations: Record<string, string[]> = {
  up: [
    "Flere kjøpere enn selgere akkurat nå",
    "Positiv nyhet om kryptovalutaen",
    "Stor interesse fra institusjonelle investorer",
    "Teknisk analyse viser oppgangsmønster",
    "Økt handelsvolum tyder på sterk interesse",
  ],
  down: [
    "Flere selgere enn kjøpere akkurat nå",
    "Negativ nyhet i markedet",
    "Investorer tar profitt etter oppgang",
    "Usikkerhet i det store økonomiske bildet",
    "Teknisk analyse viser fallende trend",
  ],
  sideways: [
    "Markedet er i avventende modus",
    "Omtrent like mange kjøpere og selgere",
    "Investorer venter på viktige nyheter",
    "Konsolidering etter stor bevegelse",
  ]
}

// Seeded random for consistent hydration
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function getTrendExplanation(currentPrice: number, previousPrice: number, seed: number): string {
  const change = ((currentPrice - previousPrice) / previousPrice) * 100
  const randomIndex = Math.floor(seededRandom(seed) * 100) % 5
  
  if (change > 1) {
    return trendExplanations.up[randomIndex]
  } else if (change < -1) {
    return trendExplanations.down[randomIndex]
  } else {
    return trendExplanations.sideways[randomIndex]
  }
}

interface PriceDataPoint {
  date: string
  price: number
  dayIndex: number
}

interface TradeSignal {
  index: number
  type: 'buy' | 'sell'
  price: number
  explanation: string
}

interface TrendInfo {
  price: number
  change: number
  explanation: string
  signal: 'buy' | 'sell' | null
}

export function TradingChart({ symbol }: { symbol: string }) {
  const [timeRange, setTimeRange] = useState<'1w' | '1m' | '3m'>('3m')
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure we only render chart on client-side
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Generate data with seeded random for consistency
  const priceData = useMemo<PriceDataPoint[]>(() => {
    const data: PriceDataPoint[] = []
    const days = timeRange === '1w' ? 7 : timeRange === '1m' ? 30 : 90
    const basePrice = symbol === 'BTC' ? 380000 : symbol === 'ETH' ? 25000 : 1500
    let price = basePrice
    
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      // Use seeded random for consistent values between server/client
      const seed = i + days + (symbol === 'BTC' ? 1000 : symbol === 'ETH' ? 2000 : 3000)
      const trend = Math.sin(i / 10) * 0.02
      const noise = (seededRandom(seed) - 0.48) * 0.04
      price = price * (1 + trend + noise)
      
      data.push({
        date: date.toLocaleDateString('nb-NO', { month: 'short', day: 'numeric' }),
        price: Math.round(price),
        dayIndex: i
      })
    }
    return data
  }, [symbol, timeRange])

  // Forklaringer for kjøp/selg-signaler
  const signalExplanations = {
    buy: [
      "Prisen har falt kraftig og kan være underverdsatt – en mulig kjøpsmulighet.",
      "Tekniske indikatorer viser at prisen kan snu oppover herfra.",
      "Handelsvolum har økt etter en nedgang, noe som kan tyde på fornyet interesse.",
      "Prisen har nådd et viktig støttenivå der kjøpere historisk har kommet inn.",
      "Et bullish mønster har dannet seg – dette kan signalisere en oppgang.",
    ],
    sell: [
      "Prisen har steget mye og kan være oververdsatt – vurder å ta profitt.",
      "Tekniske indikatorer viser at oppgangen kan miste kraft.",
      "Handelsvolum har avtatt under oppgangen, noe som kan tyde på svakhet.",
      "Prisen har nådd et viktig motstandsnivå der selgere historisk har kommet inn.",
      "Et bearish mønster har dannet seg – dette kan signalisere en nedgang.",
    ]
  }

  // Generer pedagogiske signaler med seeded random
  const signals = useMemo<TradeSignal[]>(() => {
    const sigs: TradeSignal[] = []
    for (let i = 5; i < priceData.length - 5; i += 15) {
      const prevPrice = priceData[i - 1].price
      const currPrice = priceData[i].price
      const type = currPrice > prevPrice ? 'buy' : 'sell'
      const explanations = signalExplanations[type]
      const seed = i + priceData.length
      const explanation = explanations[Math.floor(seededRandom(seed) * explanations.length)]
      sigs.push({
        index: i,
        type,
        price: currPrice,
        explanation
      })
    }
    return sigs
  }, [priceData])

  const chartDataConfig = useMemo(() => ({
    labels: priceData.map(d => d.date),
    datasets: [
      {
        label: `${symbol} Pris`,
        data: priceData.map(d => d.price),
        borderColor: '#0052FF',
        backgroundColor: 'rgba(0, 82, 255, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
      },
      {
        label: 'Kjøp (mulighet)',
        data: priceData.map((d, i) => {
          const signal = signals.find(s => s.index === i && s.type === 'buy')
          return signal ? d.price : null
        }),
        borderColor: '#10B981',
        backgroundColor: '#10B981',
        pointRadius: 8,
        pointStyle: 'triangle' as const,
        showLine: false,
      },
      {
        label: 'Selg (mulighet)',
        data: priceData.map((d, i) => {
          const signal = signals.find(s => s.index === i && s.type === 'sell')
          return signal ? d.price : null
        }),
        borderColor: '#EF4444',
        backgroundColor: '#EF4444',
        pointRadius: 8,
        pointStyle: 'triangle' as const,
        rotation: 180,
        showLine: false,
      },
    ],
  }), [priceData, signals, symbol])

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
      if (elements.length > 0) {
        const index = elements[0].index
        setSelectedPoint(index)
      }
    },
    plugins: {
      legend: { display: true, position: 'top' as const },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (ctx: TooltipItem<'line'>): string | undefined => {
            if (ctx.dataset.label?.includes('Pris')) {
              return `${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('nb-NO')} kr`
            }
            return undefined
          },
          afterBody: (items: TooltipItem<'line'>[]): string => {
            const item = items[0]
            if (item) {
              const current = item.parsed.y as number
              const prev = item.dataIndex > 0 ? priceData[item.dataIndex - 1].price : current
              const seed = item.dataIndex + priceData.length
              return `\n💡 ${getTrendExplanation(current, prev, seed)}`
            }
            return ''
          }
        }
      },
    },
    scales: {
      x: { display: true, grid: { display: false } },
      y: {
        display: true,
        ticks: {
          callback: (value: string | number) => Number(value).toLocaleString('nb-NO') + ' kr'
        }
      },
    },
  }

  // Beregn trend for valgt punkt
  const selectedTrend = useMemo<TrendInfo | null>(() => {
    if (selectedPoint === null || selectedPoint === 0) return null
    const current = priceData[selectedPoint].price
    const previous = priceData[selectedPoint - 1].price
    const signal = signals.find(s => s.index === selectedPoint)
    const seed = selectedPoint + priceData.length
    return {
      price: current,
      change: ((current - previous) / previous) * 100,
      explanation: signal ? signal.explanation : getTrendExplanation(current, previous, seed),
      signal: signal ? signal.type : null
    }
  }, [selectedPoint, priceData, signals])

  if (!isClient) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 mb-4">
          {(['1w', '1m', '3m'] as const).map((range) => (
            <div key={range} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium">
              {range === '1w' ? '1 uke' : range === '1m' ? '1 måned' : '3 måneder'}
            </div>
          ))}
        </div>
        <div className="h-96 bg-gray-50 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tidsvelger */}
      <div className="flex gap-2 mb-4">
        {(['1w', '1m', '3m'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              timeRange === range
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {range === '1w' ? '1 uke' : range === '1m' ? '1 måned' : '3 måneder'}
          </button>
        ))}
      </div>

      {/* Graf */}
      <div className="h-96">
        <Line data={chartDataConfig} options={options} />
      </div>

      {/* Forklaring på valgt punkt */}
      {selectedTrend && (
        <div className={`rounded-xl p-4 ${
          selectedTrend.signal === 'buy' ? 'bg-green-50 border border-green-200' :
          selectedTrend.signal === 'sell' ? 'bg-red-50 border border-red-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${
              selectedTrend.signal === 'buy' ? 'text-green-700' :
              selectedTrend.signal === 'sell' ? 'text-red-700' :
              'text-blue-700'
            }`}>
              {selectedTrend.signal === 'buy' ? '🟢 Kjøpssignal' : 
               selectedTrend.signal === 'sell' ? '🔴 Selgsignal' : 
               'ℹ️ Markedsanalyse'}
            </span>
            <span className={`text-sm font-bold ${
              selectedTrend.change >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {selectedTrend.change >= 0 ? '+' : ''}{selectedTrend.change.toFixed(2)}%
            </span>
          </div>
          <p className="text-gray-700 text-sm">{selectedTrend.explanation}</p>
          <p className="text-gray-500 text-xs mt-1">Pris: {selectedTrend.price.toLocaleString('nb-NO')} kr</p>
        </div>
      )}
    </div>
  )
}
