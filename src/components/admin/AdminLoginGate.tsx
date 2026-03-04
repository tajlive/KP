'use client'

import { useState, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Lock, AlertCircle, Shield } from 'lucide-react'
import { createClient } from '@/lib/utils'

interface AdminLoginGateProps {
  children: React.ReactNode
}

export function AdminLoginGate({ children }: AdminLoginGateProps) {
  const locale = useLocale()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setIsAuthenticated(false)
        setIsLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      setIsAuthenticated(profile?.role === 'admin')
    } catch (err) {
      setError('Kunne ikke verifisere tilgang')
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setIsAuthenticated(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900">
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-blue-500" />
              <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Logg ut
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-500" />
          </div>
          <CardTitle className="text-white text-2xl">Admin Login</CardTitle>
          <CardDescription className="text-slate-400">
            Logg inn via <a href={`/${locale}/admin/login`} className="text-blue-400 hover:text-blue-300">admin-innlogging</a> for å fortsette.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 mt-4"
            onClick={() => window.location.href = '/admin/login'}
          >
            Gå til innlogging
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
