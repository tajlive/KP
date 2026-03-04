

'use client'



import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Users, MousePointer } from 'lucide-react'
import { Profile } from '@/types/database'

interface MonetizationStats {
  totalStudents: number
  binanceClicked: number
  exchangeConnected: number
  clickRate: number
  conversionRate: number
}

export default function MonetizationPage() {
  const [stats, setStats] = useState<MonetizationStats>({
    totalStudents: 0,
    binanceClicked: 0,
    exchangeConnected: 0,
    clickRate: 0,
    conversionRate: 0,
  })
  const [students, setStudents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('beta_signups')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const totalStudents = data?.length || 0
      const binanceClicked = data?.filter((s: Profile) => s.binance_clicked).length || 0
      const exchangeConnected = data?.filter((s: Profile) => s.exchange_connected).length || 0

      setStats({
        totalStudents,
        binanceClicked,
        exchangeConnected,
        clickRate: totalStudents > 0 ? Math.round((binanceClicked / totalStudents) * 100) : 0,
        conversionRate: totalStudents > 0 ? Math.round((exchangeConnected / totalStudents) * 100) : 0,
      })
      setStudents(data || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Monetization</h1>
        <p className="text-slate-400">Inntektsanalyse og affiliate-statistikk</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Totale studenter</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.totalStudents}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Binance-lenke klikket</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.binanceClicked}</p>
                <p className="text-yellow-400 text-sm mt-1">{stats.clickRate}% av totalen</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <MousePointer className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Børs koblet</p>
                <p className="text-3xl font-bold text-white mt-2">{stats.exchangeConnected}</p>
                <p className="text-green-400 text-sm mt-1">{stats.conversionRate}% konvertering</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-700 bg-slate-800/50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm">Estimert inntekt</p>
                <p className="text-3xl font-bold text-white mt-2">-</p>
                <p className="text-slate-500 text-sm mt-1">Krever Binance API</p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="border-emerald-500/20 bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="text-white">Om Monetization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-300">
            Klarpakke bruker <strong>Binance Referral Pro</strong> for å generere inntekter. 
            Når studenter registrerer seg via vår lenke og handler på Binance, 
            mottar vi en liten prosentandel av trading-gebyrene.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Hvordan det fungerer:</p>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• Student klikker Binance-lenken</li>
                <li>• Oppretter konto på Binance</li>
                <li>• Handler krypto (spot/futures)</li>
                <li>• Vi mottar % av fees</li>
              </ul>
            </div>
            <div className="bg-slate-900/50 rounded-lg p-4">
              <p className="text-white font-medium mb-2">Transparens:</p>
              <ul className="text-slate-400 text-sm space-y-1">
                <li>• Ingen ekstra kostnad for student</li>
                <li>• Student får fee-rabatt</li>
                <li>• Fullt synlig i alle kanaler</li>
                <li>• Dokumentert i MONETIZATION.md</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Student List with Monetization Signals */}
      <Card className="border-slate-700 bg-slate-800/50">
        <CardHeader>
          <CardTitle className="text-white">Studenter med monetization-signal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">#</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">E-post</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Binance klikket</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Børs koblet</th>
                  <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-700/30">
                    <td className="py-3 px-4 text-white font-medium">
                      #{student.student_nummer}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {student.email}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.binance_clicked ? (
                        <Badge className="bg-green-500/10 text-green-400">Ja</Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-600 text-slate-400">Nei</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {student.exchange_connected ? (
                        <Badge className="bg-blue-500/10 text-blue-400">
                          {student.exchange_connected}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-slate-600 text-slate-400">-</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-400 capitalize">
                        {student.onboarding_step.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
