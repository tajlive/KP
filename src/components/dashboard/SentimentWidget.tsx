import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

async function getFearAndGreed() {
    try {
        const res = await fetch('https://api.alternative.me/fng/', { next: { revalidate: 3600 } })
        if (!res.ok) throw new Error('Failed to fetch data')
        return res.json()
    } catch (error) {
        console.error('Error fetching sentiment:', error)
        return null
    }
}

export async function SentimentWidget() {
    const data = await getFearAndGreed()

    if (!data || !data.data || !data.data[0]) {
        return (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <p className="text-slate-400">Kunne ikke laste markedsfølelse.</p>
            </div>
        )
    }

    const { value, value_classification } = data.data[0]
    const score = parseInt(value)

    // Determine color and icon
    let color = 'text-slate-400'
    let bg = 'bg-slate-400/10'
    let Icon = Minus

    if (score >= 75) { // Extreme Greed
        color = 'text-green-500'
        bg = 'bg-green-500/10'
        Icon = TrendingUp
    } else if (score >= 55) { // Greed
        color = 'text-green-400'
        bg = 'bg-green-400/10'
        Icon = TrendingUp
    } else if (score <= 25) { // Extreme Fear
        color = 'text-red-500'
        bg = 'bg-red-500/10'
        Icon = TrendingDown
    } else if (score <= 45) { // Fear
        color = 'text-red-400'
        bg = 'bg-red-400/10'
        Icon = TrendingDown
    } else { // Neutral
        color = 'text-yellow-400'
        bg = 'bg-yellow-400/10'
        Icon = Minus
    }

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col items-center text-center">
            <h3 className="text-lg font-medium text-white mb-6">Markedsfølelse</h3>

            <div className={`relative w-32 h-32 rounded-full flex items-center justify-center border-8 border-slate-800`}>
                {/* Simple gauge visualization */}
                <div
                    className={`absolute inset-0 rounded-full border-8 ${color} border-t-transparent border-l-transparent -rotate-45`}
                    style={{ opacity: score / 100 }}
                />

                <div className="flex flex-col items-center">
                    <span className={`text-3xl font-bold ${color}`}>{score}</span>
                </div>
            </div>

            <div className={`mt-4 px-4 py-1.5 rounded-full ${bg} ${color} font-medium text-sm flex items-center gap-2`}>
                <Icon className="w-4 h-4" />
                {value_classification}
            </div>

            <p className="text-xs text-slate-500 mt-4">
                Oppdatert: {new Date(parseInt(data.data[0].timestamp) * 1000).toLocaleDateString()}
            </p>
        </div>
    )
}
