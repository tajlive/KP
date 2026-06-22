

'use client'



import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Mail, AlertCircle, Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/utils'
import { buildAuthRedirect } from '@/lib/auth/redirects'

export default function ForgotPasswordPage() {
  const locale = useLocale()
  const t = useTranslations('admin')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildAuthRedirect({ type: 'admin-reset', locale }),
      })

      if (resetError) {
        setError(resetError.message)
        return
      }

      setSubmitted(true)
    } catch (_err) {
      setError(t('forgotPasswordError'))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <CardTitle className="text-white text-2xl">{t('emailSent')}</CardTitle>
            <CardDescription className="text-slate-400">
              {t('emailSentDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400 text-center">
              {t('checkInbox')}
            </p>
            <Button 
              variant="outline" 
              className="w-full border-slate-600 text-slate-300"
              asChild
            >
              <a href={`/${locale}/admin/login`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToLogin')}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-blue-500" />
          </div>
          <CardTitle className="text-white text-2xl">{t('forgotPassword')}</CardTitle>
          <CardDescription className="text-slate-400">
            {t('forgotPasswordDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-forgot-email" className="block text-sm font-medium text-slate-300 mb-1.5">
                {t('email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  id="admin-forgot-email"
                  type="email"
                  placeholder="admin@klarpakke.no"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-900 border-slate-700 text-white"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <AlertDescription className="text-red-400">{error}</AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('sending')}
                </>
              ) : (
                t('sendLink')
              )}
            </Button>

            <div className="text-center">
              <a 
                href={`/${locale}/admin/login`} 
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Tilbake til login
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
