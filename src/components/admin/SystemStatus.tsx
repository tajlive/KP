'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Activity, Database, Mail, Shield, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/utils'

interface StatusCheck {
  name: string
  status: 'ok' | 'warning' | 'error'
  message: string
  details?: Record<string, string>
}

export function SystemStatus() {
  const [checks, setChecks] = useState<StatusCheck[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchStatus = async () => {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const statusChecks: StatusCheck[] = []

      // Check Supabase
      const { count, error: dbError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      statusChecks.push({
        name: 'Supabase',
        status: dbError ? 'error' : 'ok',
        message: dbError ? `Feil: ${dbError.message}` : `Tilkoblet. ${count ?? 0} profiler.`,
        details: dbError ? { error: dbError.message } : { profiles: String(count ?? 0) }
      })

      // Check Auth
      const { data: { user } } = await supabase.auth.getUser()
      statusChecks.push({
        name: 'Admin Auth',
        status: user ? 'ok' : 'warning',
        message: user ? `Innlogget som ${user.email}` : 'Ikke innlogget',
      })

      // Check beta_signups table
      const { count: signupCount, error: signupError } = await supabase
        .from('beta_signups')
        .select('*', { count: 'exact', head: true })

      statusChecks.push({
        name: 'Beta Signups',
        status: signupError ? 'error' : 'ok',
        message: signupError ? `Feil: ${signupError.message}` : `${signupCount ?? 0} registreringer.`,
        details: { count: String(signupCount ?? 0) }
      })

      setChecks(statusChecks)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ukjent feil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const getStatusIcon = (status: StatusCheck['status']) => {
    switch (status) {
      case 'ok':
        return <div className="w-3 h-3 rounded-full bg-green-500" />
      case 'warning':
        return <div className="w-3 h-3 rounded-full bg-amber-500" />
      case 'error':
        return <div className="w-3 h-3 rounded-full bg-red-500" />
    }
  }

  const getStatusColor = (status: StatusCheck['status']) => {
    switch (status) {
      case 'ok':
        return 'border-green-500/20 bg-green-500/5'
      case 'warning':
        return 'border-amber-500/20 bg-amber-500/5'
      case 'error':
        return 'border-red-500/20 bg-red-500/5'
    }
  }

  const getServiceIcon = (name: string) => {
    switch (name) {
      case 'Supabase':
        return <Database className="w-5 h-5" />
      case 'Resend':
        return <Mail className="w-5 h-5" />
      case 'Admin Auth':
        return <Shield className="w-5 h-5" />
      default:
        return <Activity className="w-5 h-5" />
    }
  }

  return (
    <Card className="border-slate-700 bg-slate-800/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Systemstatus
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={loading}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Oppdater
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {checks.map((check) => (
            <div
              key={check.name}
              className={`flex items-start gap-4 p-4 rounded-xl border ${getStatusColor(check.status)}`}
            >
              <div className={`p-2 rounded-lg ${
                check.status === 'ok' ? 'bg-green-500/10 text-green-400' :
                check.status === 'warning' ? 'bg-amber-500/10 text-amber-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {getServiceIcon(check.name)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(check.status)}
                  <h3 className="font-medium text-white">{check.name}</h3>
                </div>
                <p className="text-sm text-slate-400">{check.message}</p>

                {check.details && Object.keys(check.details).length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    {Object.entries(check.details).map(([key, value]) => (
                      <span key={key} className="inline-block mr-3">
                        {key}: <code className="bg-slate-900 px-1.5 py-0.5 rounded">{value}</code>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {checks.length === 0 && !loading && !error && (
          <div className="text-center py-8 text-slate-500">
            Ingen statussjekker tilgjengelig
          </div>
        )}
      </CardContent>
    </Card>
  )
}
